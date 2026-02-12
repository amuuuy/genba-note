/**
 * Tests for v4-add-customer-master migration
 *
 * v4:
 * 1. Extracts unique customers from existing documents (clientName + clientAddress)
 * 2. Creates Customer records with auto-generated UUIDs
 * 3. Links existing Documents to their corresponding Customer via customerId
 * 4. Initializes empty customer_photos collection
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4AddCustomerMasterMigration } from '@/storage/migrations/v4-add-customer-master';
import { STORAGE_KEYS } from '@/utils/constants';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock generateUUID for deterministic tests
let uuidCounter = 0;
jest.mock('@/utils/uuid', () => ({
  generateUUID: jest.fn(() => `uuid-${++uuidCounter}`),
}));

describe('v4-add-customer-master migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    uuidCounter = 0;
  });

  describe('metadata', () => {
    it('should upgrade from version 3 to 4', () => {
      expect(v4AddCustomerMasterMigration.fromVersion).toBe(3);
      expect(v4AddCustomerMasterMigration.toVersion).toBe(4);
    });

    it('should have a description', () => {
      expect(v4AddCustomerMasterMigration.description).toBeTruthy();
      expect(typeof v4AddCustomerMasterMigration.description).toBe('string');
    });
  });

  describe('customer extraction', () => {
    it('should deduplicate documents with same clientName and clientAddress into one customer', async () => {
      const documents = [
        {
          id: 'doc-1',
          clientName: '株式会社A',
          clientAddress: '東京都渋谷区1-2-3',
          createdAt: 1000,
        },
        {
          id: 'doc-2',
          clientName: '株式会社A',
          clientAddress: '東京都渋谷区1-2-3',
          createdAt: 2000,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(documents);
        return null;
      });

      const result = await v4AddCustomerMasterMigration.migrate();

      expect(result.success).toBe(true);

      // Verify customers
      const customersCalls = (AsyncStorage.setItem as jest.Mock).mock.calls.filter(
        (c: string[]) => c[0] === STORAGE_KEYS.CUSTOMERS
      );
      expect(customersCalls).toHaveLength(1);
      const customers = JSON.parse(customersCalls[0][1]);
      expect(customers).toHaveLength(1);
      expect(customers[0].name).toBe('株式会社A');
      expect(customers[0].address).toBe('東京都渋谷区1-2-3');
    });

    it('should create separate customers for different clientName', async () => {
      const documents = [
        {
          id: 'doc-1',
          clientName: '株式会社A',
          clientAddress: '東京都渋谷区1-2-3',
          createdAt: 1000,
        },
        {
          id: 'doc-2',
          clientName: '株式会社B',
          clientAddress: '大阪府大阪市1-2-3',
          createdAt: 2000,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(documents);
        return null;
      });

      const result = await v4AddCustomerMasterMigration.migrate();

      expect(result.success).toBe(true);
      const customers = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.CUSTOMERS
        )[1]
      );
      expect(customers).toHaveLength(2);
    });

    it('should use the earliest document createdAt as customer createdAt', async () => {
      const documents = [
        {
          id: 'doc-1',
          clientName: '株式会社A',
          clientAddress: null,
          createdAt: 3000,
        },
        {
          id: 'doc-2',
          clientName: '株式会社A',
          clientAddress: null,
          createdAt: 1000,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(documents);
        return null;
      });

      const result = await v4AddCustomerMasterMigration.migrate();

      expect(result.success).toBe(true);
      const customers = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.CUSTOMERS
        )[1]
      );
      expect(customers[0].createdAt).toBe(1000);
    });
  });

  describe('document linking', () => {
    it('should set customerId on each document', async () => {
      const documents = [
        {
          id: 'doc-1',
          clientName: '株式会社A',
          clientAddress: null,
          createdAt: 1000,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(documents);
        return null;
      });

      const result = await v4AddCustomerMasterMigration.migrate();

      expect(result.success).toBe(true);
      const savedDocs = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.DOCUMENTS
        )[1]
      );
      expect(savedDocs[0].customerId).toBe('uuid-1');
    });
  });

  describe('customer_photos initialization', () => {
    it('should initialize CUSTOMER_PHOTOS to empty array', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await v4AddCustomerMasterMigration.migrate();

      expect(result.success).toBe(true);
      const photosCalls = (AsyncStorage.setItem as jest.Mock).mock.calls.filter(
        (c: string[]) => c[0] === STORAGE_KEYS.CUSTOMER_PHOTOS
      );
      expect(photosCalls).toHaveLength(1);
      expect(JSON.parse(photosCalls[0][1])).toEqual([]);
    });
  });

  describe('no documents', () => {
    it('should succeed with empty customers when no documents exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await v4AddCustomerMasterMigration.migrate();

      expect(result.success).toBe(true);
      const customers = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.CUSTOMERS
        )[1]
      );
      expect(customers).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should return error on failure', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await v4AddCustomerMasterMigration.migrate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('MIGRATION_FAILED');
      expect(result.error!.fromVersion).toBe(3);
      expect(result.error!.toVersion).toBe(4);
    });
  });
});
