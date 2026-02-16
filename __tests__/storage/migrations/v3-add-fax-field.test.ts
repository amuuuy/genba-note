/**
 * Tests for v3-add-fax-field migration
 *
 * v3 adds:
 * - IssuerSnapshot.fax (null for existing documents)
 * - AppSettings.issuer.fax (null)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v3AddFaxFieldMigration } from '@/storage/migrations/v3-add-fax-field';
import { STORAGE_KEYS } from '@/utils/constants';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('v3-add-fax-field migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should upgrade from version 2 to 3', () => {
      expect(v3AddFaxFieldMigration.fromVersion).toBe(2);
      expect(v3AddFaxFieldMigration.toVersion).toBe(3);
    });

    it('should have a description', () => {
      expect(v3AddFaxFieldMigration.description).toBeTruthy();
      expect(typeof v3AddFaxFieldMigration.description).toBe('string');
    });
  });

  describe('documents migration', () => {
    it('should add fax: null to documents missing the field', async () => {
      const documents = [
        {
          id: 'doc-1',
          issuerSnapshot: {
            companyName: 'テスト',
            representativeName: null,
            address: null,
            phone: null,
            contactPerson: null,
          },
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(documents);
        if (key === STORAGE_KEYS.SETTINGS) return null;
        return null;
      });

      const result = await v3AddFaxFieldMigration.migrate();

      expect(result.success).toBe(true);
      const savedDocs = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.DOCUMENTS
        )[1]
      );
      expect(savedDocs[0].issuerSnapshot.fax).toBeNull();
    });

    it('should preserve existing fax value', async () => {
      const documents = [
        {
          id: 'doc-1',
          issuerSnapshot: {
            companyName: 'テスト',
            representativeName: null,
            address: null,
            phone: null,
            contactPerson: null,
            fax: '03-9999-0000',
          },
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(documents);
        if (key === STORAGE_KEYS.SETTINGS) return null;
        return null;
      });

      const result = await v3AddFaxFieldMigration.migrate();

      expect(result.success).toBe(true);
      const savedDocs = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.DOCUMENTS
        )[1]
      );
      expect(savedDocs[0].issuerSnapshot.fax).toBe('03-9999-0000');
    });
  });

  describe('settings migration', () => {
    it('should add fax: null to settings missing the field', async () => {
      const settings = {
        issuer: {
          companyName: 'テスト',
          representativeName: null,
          address: null,
          phone: null,
          contactPerson: null,
          showContactPerson: true,
        },
      };
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return null;
        if (key === STORAGE_KEYS.SETTINGS) return JSON.stringify(settings);
        return null;
      });

      const result = await v3AddFaxFieldMigration.migrate();

      expect(result.success).toBe(true);
      const savedSettings = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.SETTINGS
        )[1]
      );
      expect(savedSettings.issuer.fax).toBeNull();
    });

    it('should preserve existing fax value in settings', async () => {
      const settings = {
        issuer: {
          companyName: 'テスト',
          representativeName: null,
          address: null,
          phone: null,
          contactPerson: null,
          showContactPerson: true,
          fax: '03-1111-2222',
        },
      };
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return null;
        if (key === STORAGE_KEYS.SETTINGS) return JSON.stringify(settings);
        return null;
      });

      const result = await v3AddFaxFieldMigration.migrate();

      expect(result.success).toBe(true);
      const savedSettings = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.SETTINGS
        )[1]
      );
      expect(savedSettings.issuer.fax).toBe('03-1111-2222');
    });
  });

  describe('no data', () => {
    it('should succeed when no documents or settings exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await v3AddFaxFieldMigration.migrate();

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

      const result = await v3AddFaxFieldMigration.migrate();
      expect(result.success).toBe(true);
    });

    it('should succeed when settings JSON parses to an array', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return null;
        if (key === STORAGE_KEYS.SETTINGS) return '[]';
        return null;
      });

      const result = await v3AddFaxFieldMigration.migrate();
      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return error on failure', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await v3AddFaxFieldMigration.migrate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('MIGRATION_FAILED');
      expect(result.error!.fromVersion).toBe(2);
      expect(result.error!.toVersion).toBe(3);
    });
  });
});
