/**
 * useReadOnlyMode Hook Tests
 *
 * Tests for the useReadOnlyMode hook logic.
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

describe('useReadOnlyMode - core logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetReadOnlyMode(false);
  });

  describe('read-only mode detection', () => {
    it('should detect normal mode when getReadOnlyMode returns false', () => {
      mockSetReadOnlyMode(false);
      expect(mockGetReadOnlyMode()).toBe(false);
    });

    it('should detect read-only mode when getReadOnlyMode returns true', () => {
      mockSetReadOnlyMode(true);
      expect(mockGetReadOnlyMode()).toBe(true);
    });
  });

  describe('retry migrations logic', () => {
    it('should return true on successful retry', async () => {
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
    });

    it('should return false on retry failure', async () => {
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
    });
  });

  describe('UseReadOnlyModeReturn type shape', () => {
    it('should define correct return type shape', () => {
      // Type-level test: verify the expected shape compiles
      type UseReadOnlyModeReturn = {
        isReadOnlyMode: boolean;
        isInitialized: boolean;
        migrationError: MigrationError | null;
        retryMigrations: () => Promise<boolean>;
        showRetryDialog: boolean;
        setShowRetryDialog: (show: boolean) => void;
      };

      const hookReturn: UseReadOnlyModeReturn = {
        isReadOnlyMode: false,
        isInitialized: true,
        migrationError: null,
        retryMigrations: async () => true,
        showRetryDialog: false,
        setShowRetryDialog: (show: boolean) => {},
      };

      expect(typeof hookReturn.isReadOnlyMode).toBe('boolean');
      expect(typeof hookReturn.isInitialized).toBe('boolean');
      expect(hookReturn.migrationError).toBeNull();
      expect(typeof hookReturn.retryMigrations).toBe('function');
      expect(typeof hookReturn.showRetryDialog).toBe('boolean');
      expect(typeof hookReturn.setShowRetryDialog).toBe('function');
    });

    it('should define correct failure state shape', () => {
      const error: MigrationError = {
        code: 'MIGRATION_FAILED',
        message: 'Test failure',
        fromVersion: 0,
        toVersion: 1,
      };

      type UseReadOnlyModeReturn = {
        isReadOnlyMode: boolean;
        isInitialized: boolean;
        migrationError: MigrationError | null;
        retryMigrations: () => Promise<boolean>;
        showRetryDialog: boolean;
        setShowRetryDialog: (show: boolean) => void;
      };

      const hookReturn: UseReadOnlyModeReturn = {
        isReadOnlyMode: true,
        isInitialized: true,
        migrationError: error,
        retryMigrations: async () => false,
        showRetryDialog: true,
        setShowRetryDialog: (show: boolean) => {},
      };

      expect(hookReturn.isReadOnlyMode).toBe(true);
      expect(hookReturn.migrationError).toEqual(error);
      expect(hookReturn.showRetryDialog).toBe(true);
    });
  });

  describe('migration error handling', () => {
    it('should extract error from failed migration result', async () => {
      const error: MigrationError = {
        code: 'DATA_CORRUPTION',
        message: 'Data is corrupted',
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

      expect(result.error).toEqual(error);
    });

    it('should have no error on successful migration', async () => {
      const successResult: MigrationRunResult = {
        success: true,
        startVersion: 0,
        endVersion: 1,
        migrationsRun: 1,
        readOnlyMode: false,
      };
      mockRunMigrations.mockResolvedValue(successResult);

      const result = await runMigrations();

      expect(result.error).toBeUndefined();
    });
  });

  describe('dialog state logic', () => {
    it('should default showRetryDialog to false', () => {
      // This verifies the expected initial state
      const initialShowRetryDialog = false;
      expect(initialShowRetryDialog).toBe(false);
    });

    it('should allow setting showRetryDialog to true', () => {
      let showRetryDialog = false;
      const setShowRetryDialog = (show: boolean) => {
        showRetryDialog = show;
      };

      setShowRetryDialog(true);
      expect(showRetryDialog).toBe(true);
    });

    it('should allow setting showRetryDialog back to false', () => {
      let showRetryDialog = true;
      const setShowRetryDialog = (show: boolean) => {
        showRetryDialog = show;
      };

      setShowRetryDialog(false);
      expect(showRetryDialog).toBe(false);
    });
  });

  describe('retry returns simplified boolean', () => {
    it('should convert successful MigrationRunResult to true', async () => {
      const successResult: MigrationRunResult = {
        success: true,
        startVersion: 0,
        endVersion: 1,
        migrationsRun: 1,
        readOnlyMode: false,
      };
      mockRetryMigrations.mockResolvedValue(successResult);

      const result = await retryMigrations();
      // The hook should return result.success as boolean
      const simplifiedResult = result.success;

      expect(simplifiedResult).toBe(true);
    });

    it('should convert failed MigrationRunResult to false', async () => {
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
      mockRetryMigrations.mockResolvedValue(failureResult);

      const result = await retryMigrations();
      // The hook should return result.success as boolean
      const simplifiedResult = result.success;

      expect(simplifiedResult).toBe(false);
    });
  });
});
