/**
 * Tests for v9-add-email-field migration
 *
 * v9 adds email field to:
 * - IssuerSnapshot.email (null for existing documents)
 * - AppSettings.issuer.email (null)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v9AddEmailFieldMigration } from '@/storage/migrations/v9-add-email-field';
import { STORAGE_KEYS } from '@/utils/constants';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('v9-add-email-field migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should upgrade from version 8 to 9', () => {
      expect(v9AddEmailFieldMigration.fromVersion).toBe(8);
      expect(v9AddEmailFieldMigration.toVersion).toBe(9);
    });

    it('should have a description', () => {
      expect(v9AddEmailFieldMigration.description).toBeTruthy();
      expect(typeof v9AddEmailFieldMigration.description).toBe('string');
    });
  });

  describe('documents migration', () => {
    it('should add email: null to documents missing the field', async () => {
      const documents = [
        {
          id: 'doc-1',
          issuerSnapshot: {
            companyName: 'テスト',
            representativeName: null,
            address: null,
            phone: null,
            fax: null,
            sealImageBase64: null,
            contactPerson: null,
          },
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(documents);
        if (key === STORAGE_KEYS.SETTINGS) return null;
        return null;
      });

      const result = await v9AddEmailFieldMigration.migrate();

      expect(result.success).toBe(true);
      const savedDocs = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.DOCUMENTS
        )[1]
      );
      expect(savedDocs[0].issuerSnapshot.email).toBeNull();
    });

    it('should preserve existing email value', async () => {
      const documents = [
        {
          id: 'doc-1',
          issuerSnapshot: {
            companyName: 'テスト',
            representativeName: null,
            address: null,
            phone: null,
            fax: null,
            sealImageBase64: null,
            contactPerson: null,
            email: 'test@example.com',
          },
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(documents);
        if (key === STORAGE_KEYS.SETTINGS) return null;
        return null;
      });

      const result = await v9AddEmailFieldMigration.migrate();

      expect(result.success).toBe(true);
      const savedDocs = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.DOCUMENTS
        )[1]
      );
      expect(savedDocs[0].issuerSnapshot.email).toBe('test@example.com');
    });
  });

  describe('settings migration', () => {
    it('should add email: null to settings missing the field', async () => {
      const settings = {
        issuer: {
          companyName: 'テスト',
          representativeName: null,
          address: null,
          phone: null,
          fax: null,
          sealImageUri: null,
          contactPerson: null,
          showContactPerson: true,
        },
      };
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return null;
        if (key === STORAGE_KEYS.SETTINGS) return JSON.stringify(settings);
        return null;
      });

      const result = await v9AddEmailFieldMigration.migrate();

      expect(result.success).toBe(true);
      const savedSettings = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.SETTINGS
        )[1]
      );
      expect(savedSettings.issuer.email).toBeNull();
    });
  });

  describe('no data', () => {
    it('should succeed when no documents or settings exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await v9AddEmailFieldMigration.migrate();

      expect(result.success).toBe(true);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('corrupted settings root', () => {
    it('should succeed when settings JSON parses to null', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return null;
        if (key === STORAGE_KEYS.SETTINGS) return 'null';
        return null;
      });

      const result = await v9AddEmailFieldMigration.migrate();
      expect(result.success).toBe(true);
    });

    it('should succeed when settings JSON parses to an array', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return null;
        if (key === STORAGE_KEYS.SETTINGS) return '[]';
        return null;
      });

      const result = await v9AddEmailFieldMigration.migrate();
      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return error on failure', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await v9AddEmailFieldMigration.migrate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('MIGRATION_FAILED');
      expect(result.error!.fromVersion).toBe(8);
      expect(result.error!.toVersion).toBe(9);
    });
  });
});
