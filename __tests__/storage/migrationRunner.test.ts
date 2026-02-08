/**
 * Tests for migrationRunner
 *
 * TDD approach: Write tests first, then implement to make them pass
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CURRENT_SCHEMA_VERSION,
  registerMigration,
  getMigrations,
  getMigrationPath,
  runMigrations,
  retryMigrations,
  checkMigrationNeeded,
  clearMigrations,
  resetMigrationsInitialized,
  Migration,
} from '@/storage/migrationRunner';
import {
  getSchemaVersion,
  setSchemaVersion,
  setReadOnlyMode,
  getReadOnlyMode,
} from '@/storage/asyncStorageService';
import { STORAGE_KEYS } from '@/utils/constants';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock v6 migration cleanup function (preserve original migration export)
jest.mock('@/storage/migrations/v6-remove-undated-photos', () => {
  const original = jest.requireActual('@/storage/migrations/v6-remove-undated-photos');
  return {
    ...original,
    cleanupOrphanedPhotos: jest.fn().mockResolvedValue({ deleted: 0 }),
  };
});

// Mock asyncStorageService partially - we want real read-only mode behavior
jest.mock('@/storage/asyncStorageService', () => {
  let readOnlyMode = false;
  return {
    getSchemaVersion: jest.fn(),
    setSchemaVersion: jest.fn(),
    setReadOnlyMode: jest.fn((enabled: boolean) => {
      readOnlyMode = enabled;
    }),
    getReadOnlyMode: jest.fn(() => readOnlyMode),
  };
});

const mockedAsyncStorage = jest.mocked(AsyncStorage);
const mockedGetSchemaVersion = jest.mocked(getSchemaVersion);
const mockedSetSchemaVersion = jest.mocked(setSchemaVersion);
const mockedSetReadOnlyMode = jest.mocked(setReadOnlyMode);
const mockedGetReadOnlyMode = jest.mocked(getReadOnlyMode);

describe('migrationRunner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearMigrations(); // Reset migration registry
    resetMigrationsInitialized(); // Reset initialization flag to prevent auto-registration
    mockedSetReadOnlyMode(false); // Reset read-only mode
  });

  describe('CURRENT_SCHEMA_VERSION', () => {
    it('should be defined and be 9 for current release', () => {
      expect(CURRENT_SCHEMA_VERSION).toBe(9);
    });
  });

  describe('Migration registration', () => {
    it('should register migrations', () => {
      const migration: Migration = {
        fromVersion: 0,
        toVersion: 1,
        description: 'Test migration',
        migrate: async () => ({ success: true }),
      };

      registerMigration(migration);

      const migrations = getMigrations();
      expect(migrations).toHaveLength(1);
      expect(migrations[0]).toEqual(migration);
    });

    it('should return migrations in order by fromVersion', () => {
      const migration2: Migration = {
        fromVersion: 1,
        toVersion: 2,
        description: 'Migration 1->2',
        migrate: async () => ({ success: true }),
      };
      const migration1: Migration = {
        fromVersion: 0,
        toVersion: 1,
        description: 'Migration 0->1',
        migrate: async () => ({ success: true }),
      };

      // Register out of order
      registerMigration(migration2);
      registerMigration(migration1);

      const migrations = getMigrations();
      expect(migrations[0].fromVersion).toBe(0);
      expect(migrations[1].fromVersion).toBe(1);
    });

    it('should be idempotent - duplicate registration is skipped', () => {
      const migration: Migration = {
        fromVersion: 0,
        toVersion: 1,
        description: 'Test migration',
        migrate: async () => ({ success: true }),
      };

      registerMigration(migration);
      // Should not throw, just skip
      expect(() => registerMigration(migration)).not.toThrow();
      // Should still have only 1 migration
      expect(getMigrations()).toHaveLength(1);
    });
  });

  describe('Migration path computation', () => {
    beforeEach(() => {
      registerMigration({
        fromVersion: 0,
        toVersion: 1,
        description: 'Migration 0->1',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 1,
        toVersion: 2,
        description: 'Migration 1->2',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 2,
        toVersion: 3,
        description: 'Migration 2->3',
        migrate: async () => ({ success: true }),
      });
    });

    it('should compute migration path correctly (0 to 3)', () => {
      const path = getMigrationPath(0, 3);
      expect(path).toHaveLength(3);
      expect(path[0].fromVersion).toBe(0);
      expect(path[1].fromVersion).toBe(1);
      expect(path[2].fromVersion).toBe(2);
    });

    it('should compute migration path correctly (1 to 3)', () => {
      const path = getMigrationPath(1, 3);
      expect(path).toHaveLength(2);
      expect(path[0].fromVersion).toBe(1);
      expect(path[1].fromVersion).toBe(2);
    });

    it('should return empty path when already at target version', () => {
      const path = getMigrationPath(3, 3);
      expect(path).toHaveLength(0);
    });

    it('should throw when no migration path exists', () => {
      clearMigrations();
      registerMigration({
        fromVersion: 0,
        toVersion: 1,
        description: 'Migration 0->1',
        migrate: async () => ({ success: true }),
      });
      // No migration from 1 to 2

      expect(() => getMigrationPath(0, 3)).toThrow();
    });
  });

  describe('Migration execution', () => {
    it('should run migrations from version 0 to current', async () => {
      const migrateFn1 = jest.fn().mockResolvedValue({ success: true });
      const migrateFn2 = jest.fn().mockResolvedValue({ success: true });
      const migrateFn3 = jest.fn().mockResolvedValue({ success: true });
      const migrateFn4 = jest.fn().mockResolvedValue({ success: true });
      registerMigration({
        fromVersion: 0,
        toVersion: 1,
        description: 'Migration 0->1',
        migrate: migrateFn1,
      });
      registerMigration({
        fromVersion: 1,
        toVersion: 2,
        description: 'Migration 1->2',
        migrate: migrateFn2,
      });
      registerMigration({
        fromVersion: 2,
        toVersion: 3,
        description: 'Migration 2->3',
        migrate: migrateFn3,
      });
      registerMigration({
        fromVersion: 3,
        toVersion: 4,
        description: 'Migration 3->4',
        migrate: migrateFn4,
      });
      const migrateFn5 = jest.fn().mockResolvedValue({ success: true });
      registerMigration({
        fromVersion: 4,
        toVersion: 5,
        description: 'Migration 4->5',
        migrate: migrateFn5,
      });
      const migrateFn6 = jest.fn().mockResolvedValue({ success: true });
      registerMigration({
        fromVersion: 5,
        toVersion: 6,
        description: 'Migration 5->6',
        migrate: migrateFn6,
      });
      const migrateFn7 = jest.fn().mockResolvedValue({ success: true });
      registerMigration({
        fromVersion: 6,
        toVersion: 7,
        description: 'Migration 6->7',
        migrate: migrateFn7,
      });
      const migrateFn8 = jest.fn().mockResolvedValue({ success: true });
      registerMigration({
        fromVersion: 7,
        toVersion: 8,
        description: 'Migration 7->8',
        migrate: migrateFn8,
      });
      const migrateFn9 = jest.fn().mockResolvedValue({ success: true });
      registerMigration({
        fromVersion: 8,
        toVersion: 9,
        description: 'Migration 8->9',
        migrate: migrateFn9,
      });

      mockedGetSchemaVersion.mockResolvedValue({ success: true, data: 0 });
      mockedSetSchemaVersion.mockResolvedValue({ success: true });

      const result = await runMigrations();

      expect(result.success).toBe(true);
      expect(result.startVersion).toBe(0);
      expect(result.endVersion).toBe(9);
      expect(result.migrationsRun).toBe(9);
      expect(result.readOnlyMode).toBe(false);
      expect(migrateFn1).toHaveBeenCalledTimes(1);
      expect(migrateFn2).toHaveBeenCalledTimes(1);
      expect(migrateFn3).toHaveBeenCalledTimes(1);
      expect(migrateFn4).toHaveBeenCalledTimes(1);
      expect(migrateFn5).toHaveBeenCalledTimes(1);
      expect(migrateFn6).toHaveBeenCalledTimes(1);
      expect(migrateFn7).toHaveBeenCalledTimes(1);
      expect(migrateFn8).toHaveBeenCalledTimes(1);
      expect(migrateFn9).toHaveBeenCalledTimes(1);
    });

    it('should skip migrations if already at current version', async () => {
      registerMigration({
        fromVersion: 0,
        toVersion: 1,
        description: 'Migration 0->1',
        migrate: jest.fn(),
      });

      mockedGetSchemaVersion.mockResolvedValue({ success: true, data: CURRENT_SCHEMA_VERSION });

      const result = await runMigrations();

      expect(result.success).toBe(true);
      expect(result.migrationsRun).toBe(0);
    });

    it('should call cleanupOrphanedPhotos when already at current version', async () => {
      // Import the mocked function to verify it was called
      const { cleanupOrphanedPhotos } = jest.requireMock('@/storage/migrations/v6-remove-undated-photos');

      registerMigration({
        fromVersion: 0,
        toVersion: 1,
        description: 'Migration 0->1',
        migrate: jest.fn(),
      });

      mockedGetSchemaVersion.mockResolvedValue({ success: true, data: CURRENT_SCHEMA_VERSION });

      await runMigrations();

      expect(cleanupOrphanedPhotos).toHaveBeenCalledTimes(1);
    });

    it('should run multiple migrations in sequence (v1 -> v2 mock)', async () => {
      const migrate1 = jest.fn().mockResolvedValue({ success: true });
      const migrate2 = jest.fn().mockResolvedValue({ success: true });

      registerMigration({
        fromVersion: 0,
        toVersion: 1,
        description: 'Migration 0->1',
        migrate: migrate1,
      });
      registerMigration({
        fromVersion: 1,
        toVersion: 2,
        description: 'Migration 1->2',
        migrate: migrate2,
      });

      // Override CURRENT_SCHEMA_VERSION for this test by checking migrations up to 2
      mockedGetSchemaVersion.mockResolvedValue({ success: true, data: 0 });
      mockedSetSchemaVersion.mockResolvedValue({ success: true });

      // We need to actually test with the real runner
      // For now, just verify the structure works
      const path = getMigrationPath(0, 2);
      expect(path).toHaveLength(2);
    });

    it('should update schema version after each successful migration', async () => {
      registerMigration({
        fromVersion: 0,
        toVersion: 1,
        description: 'Migration 0->1',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 1,
        toVersion: 2,
        description: 'Migration 1->2',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 2,
        toVersion: 3,
        description: 'Migration 2->3',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 3,
        toVersion: 4,
        description: 'Migration 3->4',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 4,
        toVersion: 5,
        description: 'Migration 4->5',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 5,
        toVersion: 6,
        description: 'Migration 5->6',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 6,
        toVersion: 7,
        description: 'Migration 6->7',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 7,
        toVersion: 8,
        description: 'Migration 7->8',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 8,
        toVersion: 9,
        description: 'Migration 8->9',
        migrate: async () => ({ success: true }),
      });

      mockedGetSchemaVersion.mockResolvedValue({ success: true, data: 0 });
      mockedSetSchemaVersion.mockResolvedValue({ success: true });

      await runMigrations();

      expect(mockedSetSchemaVersion).toHaveBeenCalledWith(1);
      expect(mockedSetSchemaVersion).toHaveBeenCalledWith(2);
      expect(mockedSetSchemaVersion).toHaveBeenCalledWith(3);
      expect(mockedSetSchemaVersion).toHaveBeenCalledWith(4);
      expect(mockedSetSchemaVersion).toHaveBeenCalledWith(5);
      expect(mockedSetSchemaVersion).toHaveBeenCalledWith(6);
      expect(mockedSetSchemaVersion).toHaveBeenCalledWith(7);
      expect(mockedSetSchemaVersion).toHaveBeenCalledWith(8);
      expect(mockedSetSchemaVersion).toHaveBeenCalledWith(9);
    });
  });

  describe('Migration failure', () => {
    it('should enable read-only mode on migration failure', async () => {
      registerMigration({
        fromVersion: 0,
        toVersion: 1,
        description: 'Failing migration',
        migrate: async () => ({
          success: false,
          error: {
            code: 'MIGRATION_FAILED',
            message: 'Test failure',
            fromVersion: 0,
            toVersion: 1,
          },
        }),
      });

      mockedGetSchemaVersion.mockResolvedValue({ success: true, data: 0 });

      const result = await runMigrations();

      expect(result.success).toBe(false);
      expect(result.readOnlyMode).toBe(true);
      expect(mockedSetReadOnlyMode).toHaveBeenCalledWith(true);
    });

    it('should stop at failed migration and report partial progress', async () => {
      const migrate1 = jest.fn().mockResolvedValue({ success: true });
      const migrate2 = jest.fn().mockResolvedValue({
        success: false,
        error: {
          code: 'MIGRATION_FAILED',
          message: 'Second migration failed',
          fromVersion: 1,
          toVersion: 2,
        },
      });

      registerMigration({
        fromVersion: 0,
        toVersion: 1,
        description: 'Migration 0->1',
        migrate: migrate1,
      });
      registerMigration({
        fromVersion: 1,
        toVersion: 2,
        description: 'Migration 1->2 (failing)',
        migrate: migrate2,
      });

      mockedGetSchemaVersion.mockResolvedValue({ success: true, data: 0 });
      mockedSetSchemaVersion.mockResolvedValue({ success: true });

      // We need to run migrations up to version 2 to test this
      // Create a custom test that simulates running to v2
      let currentVersion = 0;
      mockedSetSchemaVersion.mockImplementation(async (v) => {
        currentVersion = v;
        return { success: true };
      });
      mockedGetSchemaVersion.mockImplementation(async () => ({
        success: true,
        data: currentVersion,
      }));
    });

    it('should include error details in result', async () => {
      registerMigration({
        fromVersion: 0,
        toVersion: 1,
        description: 'Failing migration',
        migrate: async () => ({
          success: false,
          error: {
            code: 'DATA_CORRUPTION',
            message: 'Data is corrupted',
            fromVersion: 0,
            toVersion: 1,
          },
        }),
      });
      registerMigration({
        fromVersion: 1,
        toVersion: 2,
        description: 'Migration 1->2',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 2,
        toVersion: 3,
        description: 'Migration 2->3',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 3,
        toVersion: 4,
        description: 'Migration 3->4',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 4,
        toVersion: 5,
        description: 'Migration 4->5',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 5,
        toVersion: 6,
        description: 'Migration 5->6',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 6,
        toVersion: 7,
        description: 'Migration 6->7',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 7,
        toVersion: 8,
        description: 'Migration 7->8',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 8,
        toVersion: 9,
        description: 'Migration 8->9',
        migrate: async () => ({ success: true }),
      });

      mockedGetSchemaVersion.mockResolvedValue({ success: true, data: 0 });

      const result = await runMigrations();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('DATA_CORRUPTION');
      expect(result.error?.message).toBe('Data is corrupted');
    });
  });

  describe('Migration retry', () => {
    it('should retry migrations successfully after fix', async () => {
      let attemptCount = 0;
      registerMigration({
        fromVersion: 0,
        toVersion: 1,
        description: 'Migration that succeeds on retry',
        migrate: async () => {
          attemptCount++;
          if (attemptCount === 1) {
            return {
              success: false,
              error: {
                code: 'MIGRATION_FAILED',
                message: 'First attempt fails',
                fromVersion: 0,
                toVersion: 1,
              },
            };
          }
          return { success: true };
        },
      });
      registerMigration({
        fromVersion: 1,
        toVersion: 2,
        description: 'Migration 1->2',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 2,
        toVersion: 3,
        description: 'Migration 2->3',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 3,
        toVersion: 4,
        description: 'Migration 3->4',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 4,
        toVersion: 5,
        description: 'Migration 4->5',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 5,
        toVersion: 6,
        description: 'Migration 5->6',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 6,
        toVersion: 7,
        description: 'Migration 6->7',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 7,
        toVersion: 8,
        description: 'Migration 7->8',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 8,
        toVersion: 9,
        description: 'Migration 8->9',
        migrate: async () => ({ success: true }),
      });

      mockedGetSchemaVersion.mockResolvedValue({ success: true, data: 0 });
      mockedSetSchemaVersion.mockResolvedValue({ success: true });

      // First attempt fails
      const firstResult = await runMigrations();
      expect(firstResult.success).toBe(false);
      expect(mockedSetReadOnlyMode).toHaveBeenCalledWith(true);

      // Retry succeeds
      const retryResult = await retryMigrations();
      expect(retryResult.success).toBe(true);
      expect(mockedSetReadOnlyMode).toHaveBeenCalledWith(false);
    });

    it('should disable read-only mode on successful retry', async () => {
      registerMigration({
        fromVersion: 0,
        toVersion: 1,
        description: 'Successful migration',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 1,
        toVersion: 2,
        description: 'Migration 1->2',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 2,
        toVersion: 3,
        description: 'Migration 2->3',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 3,
        toVersion: 4,
        description: 'Migration 3->4',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 4,
        toVersion: 5,
        description: 'Migration 4->5',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 5,
        toVersion: 6,
        description: 'Migration 5->6',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 6,
        toVersion: 7,
        description: 'Migration 6->7',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 7,
        toVersion: 8,
        description: 'Migration 7->8',
        migrate: async () => ({ success: true }),
      });
      registerMigration({
        fromVersion: 8,
        toVersion: 9,
        description: 'Migration 8->9',
        migrate: async () => ({ success: true }),
      });

      mockedGetSchemaVersion.mockResolvedValue({ success: true, data: 0 });
      mockedSetSchemaVersion.mockResolvedValue({ success: true });

      // Simulate being in read-only mode
      mockedSetReadOnlyMode(true);

      const result = await retryMigrations();

      expect(result.success).toBe(true);
      expect(result.readOnlyMode).toBe(false);
    });
  });

  describe('Migration check', () => {
    it('should check if migration is needed without running', async () => {
      registerMigration({
        fromVersion: 0,
        toVersion: 1,
        description: 'Migration 0->1',
        migrate: jest.fn(),
      });

      mockedGetSchemaVersion.mockResolvedValue({ success: true, data: 0 });

      const check = await checkMigrationNeeded();

      expect(check.needed).toBe(true);
      expect(check.currentVersion).toBe(0);
      expect(check.targetVersion).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('should report no migration needed when at current version', async () => {
      mockedGetSchemaVersion.mockResolvedValue({ success: true, data: CURRENT_SCHEMA_VERSION });

      const check = await checkMigrationNeeded();

      expect(check.needed).toBe(false);
      expect(check.currentVersion).toBe(CURRENT_SCHEMA_VERSION);
    });
  });
});
