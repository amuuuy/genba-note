/**
 * Tests for v1-initial migration
 *
 * TDD approach: Write tests first, then implement to make them pass
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v1InitialMigration } from '@/storage/migrations/v1-initial';
import { DEFAULT_APP_SETTINGS } from '@/types/settings';
import { STORAGE_KEYS } from '@/utils/constants';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiSet: jest.fn(),
}));

const mockedAsyncStorage = jest.mocked(AsyncStorage);

describe('v1-initial migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('migration metadata', () => {
    it('should have correct version numbers', () => {
      expect(v1InitialMigration.fromVersion).toBe(0);
      expect(v1InitialMigration.toVersion).toBe(1);
    });

    it('should have a description', () => {
      expect(v1InitialMigration.description).toBeTruthy();
      expect(typeof v1InitialMigration.description).toBe('string');
    });
  });

  describe('fresh install (no existing data)', () => {
    it('should initialize empty storage with defaults', async () => {
      // No pre-existing data
      mockedAsyncStorage.getItem.mockResolvedValue(null);
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await v1InitialMigration.migrate();

      expect(result.success).toBe(true);

      // Verify settings were initialized
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(DEFAULT_APP_SETTINGS)
      );

      // Verify documents array was initialized
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.DOCUMENTS,
        JSON.stringify([])
      );

      // Verify unit prices array was initialized
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.UNIT_PRICES,
        JSON.stringify([])
      );
    });
  });

  describe('legacy data (existing data without schema version)', () => {
    it('should preserve existing documents when migrating from version 0', async () => {
      const legacyDocuments = [
        {
          id: 'doc-1',
          documentNo: 'EST-001',
          type: 'estimate',
          status: 'draft',
          clientName: 'Legacy Client',
          lineItems: [],
          issueDate: '2026-01-15',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      mockedAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === STORAGE_KEYS.DOCUMENTS) {
          return JSON.stringify(legacyDocuments);
        }
        return null;
      });
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await v1InitialMigration.migrate();

      expect(result.success).toBe(true);

      // Documents should NOT be overwritten - only initialized if null
      const documentSetCalls = mockedAsyncStorage.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEYS.DOCUMENTS
      );
      expect(documentSetCalls).toHaveLength(0);
    });

    it('should preserve existing unit prices when migrating from version 0', async () => {
      const legacyUnitPrices = [
        {
          id: 'up-1',
          name: '外壁塗装',
          unit: 'm²',
          defaultPrice: 3000,
          defaultTaxRate: 10,
          category: '塗装',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      mockedAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === STORAGE_KEYS.UNIT_PRICES) {
          return JSON.stringify(legacyUnitPrices);
        }
        return null;
      });
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await v1InitialMigration.migrate();

      expect(result.success).toBe(true);

      // Unit prices should NOT be overwritten - only initialized if null
      const unitPriceSetCalls = mockedAsyncStorage.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEYS.UNIT_PRICES
      );
      expect(unitPriceSetCalls).toHaveLength(0);
    });

    it('should preserve existing settings when migrating from version 0', async () => {
      const legacySettings = {
        issuer: {
          companyName: 'Legacy Company',
          representativeName: null,
          address: null,
          phone: null,
        },
        numbering: {
          estimatePrefix: 'EST-',
          invoicePrefix: 'INV-',
          nextEstimateNumber: 5,
          nextInvoiceNumber: 3,
        },
        schemaVersion: 1,
      };

      mockedAsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === STORAGE_KEYS.SETTINGS) {
          return JSON.stringify(legacySettings);
        }
        return null;
      });
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await v1InitialMigration.migrate();

      expect(result.success).toBe(true);

      // Settings should NOT be overwritten - only initialized if null
      const settingsSetCalls = mockedAsyncStorage.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEYS.SETTINGS
      );
      expect(settingsSetCalls).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should return failure result on storage error', async () => {
      mockedAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await v1InitialMigration.migrate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('MIGRATION_FAILED');
      expect(result.error?.fromVersion).toBe(0);
      expect(result.error?.toVersion).toBe(1);
    });

    it('should return failure result on write error', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);
      mockedAsyncStorage.setItem.mockRejectedValue(new Error('Write error'));

      const result = await v1InitialMigration.migrate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
