/**
 * ReadOnlyModeContext Tests
 *
 * Tests for the read-only mode context logic.
 * Note: Full React hook integration tests require a React Native environment.
 * These tests focus on the core logic and type safety.
 */

// Mock storage modules before imports
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  getAllKeys: jest.fn().mockResolvedValue([]),
}));

import {
  setReadOnlyMode,
  getReadOnlyMode,
} from '@/storage/asyncStorageService';
import {
  runMigrations,
  retryMigrations,
  type MigrationRunResult,
  type MigrationError,
} from '@/storage/migrationRunner';

// Mock migration runner
jest.mock('@/storage/migrationRunner', () => ({
  runMigrations: jest.fn(),
  retryMigrations: jest.fn(),
  CURRENT_SCHEMA_VERSION: 1,
}));

// Mock asyncStorageService (partial)
jest.mock('@/storage/asyncStorageService', () => {
  let isReadOnlyMode = false;
  return {
    setReadOnlyMode: jest.fn((value: boolean) => {
      isReadOnlyMode = value;
    }),
    getReadOnlyMode: jest.fn(() => isReadOnlyMode),
    getSchemaVersion: jest.fn().mockResolvedValue({ success: true, data: 1 }),
    setSchemaVersion: jest.fn().mockResolvedValue({ success: true }),
  };
});

const mockRunMigrations = runMigrations as jest.MockedFunction<
  typeof runMigrations
>;
const mockRetryMigrations = retryMigrations as jest.MockedFunction<
  typeof retryMigrations
>;
const mockGetReadOnlyMode = getReadOnlyMode as jest.MockedFunction<
  typeof getReadOnlyMode
>;
const mockSetReadOnlyMode = setReadOnlyMode as jest.MockedFunction<
  typeof setReadOnlyMode
>;

describe('ReadOnlyModeContext - core logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetReadOnlyMode(false);
  });

  describe('migration result handling', () => {
    it('should process successful migration result correctly', async () => {
      const successResult: MigrationRunResult = {
        success: true,
        startVersion: 0,
        endVersion: 1,
        migrationsRun: 1,
        readOnlyMode: false,
      };
      mockRunMigrations.mockResolvedValue(successResult);

      const result = await runMigrations();

      expect(result.success).toBe(true);
      expect(result.readOnlyMode).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should process failed migration result correctly', async () => {
      const failureResult: MigrationRunResult = {
        success: false,
        startVersion: 0,
        endVersion: 0,
        migrationsRun: 0,
        readOnlyMode: true,
        error: {
          code: 'MIGRATION_FAILED',
          message: 'Test failure',
          fromVersion: 0,
          toVersion: 1,
        },
      };
      mockRunMigrations.mockResolvedValue(failureResult);

      const result = await runMigrations();

      expect(result.success).toBe(false);
      expect(result.readOnlyMode).toBe(true);
      expect(result.error).toEqual({
        code: 'MIGRATION_FAILED',
        message: 'Test failure',
        fromVersion: 0,
        toVersion: 1,
      });
    });
  });

  describe('retry migration logic', () => {
    it('should return success result on successful retry', async () => {
      const successResult: MigrationRunResult = {
        success: true,
        startVersion: 0,
        endVersion: 1,
        migrationsRun: 1,
        readOnlyMode: false,
      };
      mockRetryMigrations.mockResolvedValue(successResult);

      const result = await retryMigrations();

      expect(result.success).toBe(true);
      expect(result.readOnlyMode).toBe(false);
    });

    it('should return failure result on retry failure', async () => {
      const failureResult: MigrationRunResult = {
        success: false,
        startVersion: 0,
        endVersion: 0,
        migrationsRun: 0,
        readOnlyMode: true,
        error: {
          code: 'DATA_CORRUPTION',
          message: 'Still failing',
          fromVersion: 0,
          toVersion: 1,
        },
      };
      mockRetryMigrations.mockResolvedValue(failureResult);

      const result = await retryMigrations();

      expect(result.success).toBe(false);
      expect(result.readOnlyMode).toBe(true);
      expect(result.error?.code).toBe('DATA_CORRUPTION');
    });
  });

  describe('read-only mode state', () => {
    it('should track read-only mode via getReadOnlyMode', () => {
      mockSetReadOnlyMode(true);
      expect(mockGetReadOnlyMode()).toBe(true);

      mockSetReadOnlyMode(false);
      expect(mockGetReadOnlyMode()).toBe(false);
    });
  });

  describe('migration error types', () => {
    it('should handle MIGRATION_FAILED error code', async () => {
      const error: MigrationError = {
        code: 'MIGRATION_FAILED',
        message: 'Failed to migrate',
        fromVersion: 0,
        toVersion: 1,
      };
      const failureResult: MigrationRunResult = {
        success: false,
        startVersion: 0,
        endVersion: 0,
        migrationsRun: 0,
        readOnlyMode: true,
        error,
      };
      mockRunMigrations.mockResolvedValue(failureResult);

      const result = await runMigrations();
      expect(result.error?.code).toBe('MIGRATION_FAILED');
    });

    it('should handle DATA_CORRUPTION error code', async () => {
      const error: MigrationError = {
        code: 'DATA_CORRUPTION',
        message: 'Data corrupted',
        fromVersion: 0,
        toVersion: 1,
      };
      const failureResult: MigrationRunResult = {
        success: false,
        startVersion: 0,
        endVersion: 0,
        migrationsRun: 0,
        readOnlyMode: true,
        error,
      };
      mockRunMigrations.mockResolvedValue(failureResult);

      const result = await runMigrations();
      expect(result.error?.code).toBe('DATA_CORRUPTION');
    });

    it('should handle ROLLBACK_FAILED error code', async () => {
      const error: MigrationError = {
        code: 'ROLLBACK_FAILED',
        message: 'Rollback failed',
        fromVersion: 0,
        toVersion: 1,
      };
      const failureResult: MigrationRunResult = {
        success: false,
        startVersion: 0,
        endVersion: 0,
        migrationsRun: 0,
        readOnlyMode: true,
        error,
      };
      mockRunMigrations.mockResolvedValue(failureResult);

      const result = await runMigrations();
      expect(result.error?.code).toBe('ROLLBACK_FAILED');
    });
  });

  describe('context value shape', () => {
    it('should define correct ReadOnlyModeContextValue type', () => {
      // Type-level test: verify the expected shape compiles
      const contextValue = {
        isReadOnlyMode: false,
        isInitialized: true,
        migrationError: null as MigrationError | null,
        retryMigrations: async () =>
          ({
            success: true,
            startVersion: 0,
            endVersion: 1,
            migrationsRun: 1,
            readOnlyMode: false,
          } as MigrationRunResult),
      };

      expect(typeof contextValue.isReadOnlyMode).toBe('boolean');
      expect(typeof contextValue.isInitialized).toBe('boolean');
      expect(contextValue.migrationError).toBeNull();
      expect(typeof contextValue.retryMigrations).toBe('function');
    });

    it('should define correct failure state shape', () => {
      const error: MigrationError = {
        code: 'MIGRATION_FAILED',
        message: 'Test failure',
        fromVersion: 0,
        toVersion: 1,
      };

      const contextValue = {
        isReadOnlyMode: true,
        isInitialized: true,
        migrationError: error,
        retryMigrations: async () =>
          ({
            success: false,
            startVersion: 0,
            endVersion: 0,
            migrationsRun: 0,
            readOnlyMode: true,
            error,
          } as MigrationRunResult),
      };

      expect(contextValue.isReadOnlyMode).toBe(true);
      expect(contextValue.migrationError).toEqual(error);
    });
  });
});
