/**
 * Tests for v2-add-carried-forward-and-contact-person migration
 *
 * v2 adds:
 * - Document.carriedForwardAmount (null for existing documents)
 * - IssuerSnapshot.contactPerson (null for existing documents)
 * - AppSettings.issuer.contactPerson (null)
 * - AppSettings.issuer.showContactPerson (true)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v2AddCarriedForwardAndContactPersonMigration } from '@/storage/migrations/v2-add-carried-forward-and-contact-person';
import { STORAGE_KEYS } from '@/utils/constants';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('v2-add-carried-forward-and-contact-person migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should upgrade from version 1 to 2', () => {
      expect(v2AddCarriedForwardAndContactPersonMigration.fromVersion).toBe(1);
      expect(v2AddCarriedForwardAndContactPersonMigration.toVersion).toBe(2);
    });

    it('should have a description', () => {
      expect(v2AddCarriedForwardAndContactPersonMigration.description).toBeTruthy();
      expect(typeof v2AddCarriedForwardAndContactPersonMigration.description).toBe('string');
    });
  });

  describe('documents migration', () => {
    it('should add carriedForwardAmount: null and contactPerson: null to documents', async () => {
      const documents = [
        {
          id: 'doc-1',
          issuerSnapshot: {
            companyName: 'テスト',
            representativeName: null,
            address: null,
            phone: null,
          },
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(documents);
        if (key === STORAGE_KEYS.SETTINGS) return null;
        return null;
      });

      const result = await v2AddCarriedForwardAndContactPersonMigration.migrate();

      expect(result.success).toBe(true);
      const savedDocs = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.DOCUMENTS
        )[1]
      );
      expect(savedDocs[0].carriedForwardAmount).toBeNull();
      expect(savedDocs[0].issuerSnapshot.contactPerson).toBeNull();
    });

    it('should preserve existing carriedForwardAmount value', async () => {
      const documents = [
        {
          id: 'doc-1',
          carriedForwardAmount: 50000,
          issuerSnapshot: {
            companyName: 'テスト',
            representativeName: null,
            address: null,
            phone: null,
            contactPerson: '田中',
          },
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return JSON.stringify(documents);
        if (key === STORAGE_KEYS.SETTINGS) return null;
        return null;
      });

      const result = await v2AddCarriedForwardAndContactPersonMigration.migrate();

      expect(result.success).toBe(true);
      const savedDocs = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.DOCUMENTS
        )[1]
      );
      expect(savedDocs[0].carriedForwardAmount).toBe(50000);
      expect(savedDocs[0].issuerSnapshot.contactPerson).toBe('田中');
    });
  });

  describe('settings migration', () => {
    it('should add contactPerson: null and showContactPerson: true to settings', async () => {
      const settings = {
        issuer: {
          companyName: 'テスト',
          representativeName: null,
          address: null,
          phone: null,
        },
      };
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return null;
        if (key === STORAGE_KEYS.SETTINGS) return JSON.stringify(settings);
        return null;
      });

      const result = await v2AddCarriedForwardAndContactPersonMigration.migrate();

      expect(result.success).toBe(true);
      const savedSettings = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.SETTINGS
        )[1]
      );
      expect(savedSettings.issuer.contactPerson).toBeNull();
      expect(savedSettings.issuer.showContactPerson).toBe(true);
    });

    it('should preserve existing contactPerson and showContactPerson values', async () => {
      const settings = {
        issuer: {
          companyName: 'テスト',
          representativeName: null,
          address: null,
          phone: null,
          contactPerson: '鈴木',
          showContactPerson: false,
        },
      };
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return null;
        if (key === STORAGE_KEYS.SETTINGS) return JSON.stringify(settings);
        return null;
      });

      const result = await v2AddCarriedForwardAndContactPersonMigration.migrate();

      expect(result.success).toBe(true);
      const savedSettings = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.SETTINGS
        )[1]
      );
      expect(savedSettings.issuer.contactPerson).toBe('鈴木');
      expect(savedSettings.issuer.showContactPerson).toBe(false);
    });
  });

  describe('no data', () => {
    it('should succeed when no documents or settings exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await v2AddCarriedForwardAndContactPersonMigration.migrate();

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

      const result = await v2AddCarriedForwardAndContactPersonMigration.migrate();
      expect(result.success).toBe(true);
    });

    it('should succeed when settings JSON parses to an array', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.DOCUMENTS) return null;
        if (key === STORAGE_KEYS.SETTINGS) return '[]';
        return null;
      });

      const result = await v2AddCarriedForwardAndContactPersonMigration.migrate();
      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return error on failure', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await v2AddCarriedForwardAndContactPersonMigration.migrate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('MIGRATION_FAILED');
      expect(result.error!.fromVersion).toBe(1);
      expect(result.error!.toVersion).toBe(2);
    });
  });
});
