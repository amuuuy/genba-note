/**
 * Tests for v7-add-pdf-customization migration
 *
 * TDD approach: Write tests first, then implement to make them pass.
 *
 * v7 adds PDF customization fields to AppSettings:
 * - sealSize, backgroundDesign, defaultEstimateTemplateId, defaultInvoiceTemplateId
 * - Maps invoiceTemplateType → defaultInvoiceTemplateId for backward compatibility
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v7AddPdfCustomizationMigration } from '@/storage/migrations/v7-add-pdf-customization';
import { STORAGE_KEYS } from '@/utils/constants';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockedAsyncStorage = jest.mocked(AsyncStorage);

/** Helper: create a minimal v6 settings object */
function createV6Settings(overrides: Record<string, unknown> = {}) {
  return {
    issuer: {
      companyName: '株式会社テスト建設',
      representativeName: '山田太郎',
      address: '東京都渋谷区1-2-3',
      phone: '03-1234-5678',
      fax: null,
      sealImageUri: null,
      contactPerson: null,
      showContactPerson: true,
      email: null,
    },
    numbering: {
      estimatePrefix: 'EST-',
      invoicePrefix: 'INV-',
      nextEstimateNumber: 5,
      nextInvoiceNumber: 3,
    },
    invoiceTemplateType: 'ACCOUNTING',
    schemaVersion: 6,
    ...overrides,
  };
}

describe('v7-add-pdf-customization migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('migration metadata', () => {
    it('should have correct version numbers', () => {
      expect(v7AddPdfCustomizationMigration.fromVersion).toBe(6);
      expect(v7AddPdfCustomizationMigration.toVersion).toBe(7);
    });

    it('should have a description', () => {
      expect(v7AddPdfCustomizationMigration.description).toBeTruthy();
      expect(typeof v7AddPdfCustomizationMigration.description).toBe('string');
    });
  });

  describe('default values', () => {
    it('should add all new PDF customization fields with defaults', async () => {
      const v6Settings = createV6Settings();
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(v6Settings));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await v7AddPdfCustomizationMigration.migrate();

      expect(result.success).toBe(true);

      // Verify settings were saved with new fields
      const setItemCalls = mockedAsyncStorage.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEYS.SETTINGS
      );
      expect(setItemCalls).toHaveLength(1);

      const savedSettings = JSON.parse(setItemCalls[0][1]);
      expect(savedSettings.sealSize).toBe('MEDIUM');
      expect(savedSettings.backgroundDesign).toBe('NONE');
      expect(savedSettings.defaultEstimateTemplateId).toBe('FORMAL_STANDARD');
      expect(savedSettings.defaultInvoiceTemplateId).toBe('ACCOUNTING');
    });
  });

  describe('invoiceTemplateType mapping', () => {
    it('should map ACCOUNTING to defaultInvoiceTemplateId: ACCOUNTING', async () => {
      const v6Settings = createV6Settings({ invoiceTemplateType: 'ACCOUNTING' });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(v6Settings));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await v7AddPdfCustomizationMigration.migrate();

      expect(result.success).toBe(true);

      const setItemCalls = mockedAsyncStorage.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEYS.SETTINGS
      );
      const savedSettings = JSON.parse(setItemCalls[0][1]);
      expect(savedSettings.defaultInvoiceTemplateId).toBe('ACCOUNTING');
    });

    it('should map SIMPLE to defaultInvoiceTemplateId: SIMPLE', async () => {
      const v6Settings = createV6Settings({ invoiceTemplateType: 'SIMPLE' });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(v6Settings));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await v7AddPdfCustomizationMigration.migrate();

      expect(result.success).toBe(true);

      const setItemCalls = mockedAsyncStorage.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEYS.SETTINGS
      );
      const savedSettings = JSON.parse(setItemCalls[0][1]);
      expect(savedSettings.defaultInvoiceTemplateId).toBe('SIMPLE');
    });

    it('should fallback to ACCOUNTING when invoiceTemplateType is missing', async () => {
      const v6Settings = createV6Settings();
      // Remove invoiceTemplateType to simulate missing field
      delete (v6Settings as Record<string, unknown>).invoiceTemplateType;
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(v6Settings));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await v7AddPdfCustomizationMigration.migrate();

      expect(result.success).toBe(true);

      const setItemCalls = mockedAsyncStorage.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEYS.SETTINGS
      );
      const savedSettings = JSON.parse(setItemCalls[0][1]);
      expect(savedSettings.defaultInvoiceTemplateId).toBe('ACCOUNTING');
    });
  });

  describe('existing data preservation', () => {
    it('should preserve all existing issuer and numbering fields', async () => {
      const v6Settings = createV6Settings();
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(v6Settings));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await v7AddPdfCustomizationMigration.migrate();

      expect(result.success).toBe(true);

      const setItemCalls = mockedAsyncStorage.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEYS.SETTINGS
      );
      const savedSettings = JSON.parse(setItemCalls[0][1]);

      // Verify existing fields are preserved
      expect(savedSettings.issuer.companyName).toBe('株式会社テスト建設');
      expect(savedSettings.issuer.representativeName).toBe('山田太郎');
      expect(savedSettings.issuer.address).toBe('東京都渋谷区1-2-3');
      expect(savedSettings.issuer.phone).toBe('03-1234-5678');
      expect(savedSettings.numbering.estimatePrefix).toBe('EST-');
      expect(savedSettings.numbering.nextEstimateNumber).toBe(5);
      expect(savedSettings.numbering.nextInvoiceNumber).toBe(3);
      expect(savedSettings.invoiceTemplateType).toBe('ACCOUNTING');
      expect(savedSettings.schemaVersion).toBe(6);
    });
  });

  describe('no existing settings', () => {
    it('should succeed even when no settings exist in storage', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await v7AddPdfCustomizationMigration.migrate();

      expect(result.success).toBe(true);

      const setItemCalls = mockedAsyncStorage.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEYS.SETTINGS
      );
      expect(setItemCalls).toHaveLength(1);

      const savedSettings = JSON.parse(setItemCalls[0][1]);
      expect(savedSettings.sealSize).toBe('MEDIUM');
      expect(savedSettings.backgroundDesign).toBe('NONE');
      expect(savedSettings.defaultEstimateTemplateId).toBe('FORMAL_STANDARD');
      expect(savedSettings.defaultInvoiceTemplateId).toBe('ACCOUNTING');
    });
  });

  describe('idempotency', () => {
    it('should preserve existing new fields if already present', async () => {
      const settingsWithExistingFields = createV6Settings({
        sealSize: 'LARGE',
        backgroundDesign: 'STRIPE',
        defaultEstimateTemplateId: 'MODERN',
        defaultInvoiceTemplateId: 'SIMPLE',
      });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(settingsWithExistingFields));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await v7AddPdfCustomizationMigration.migrate();

      expect(result.success).toBe(true);

      const setItemCalls = mockedAsyncStorage.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEYS.SETTINGS
      );
      const savedSettings = JSON.parse(setItemCalls[0][1]);
      expect(savedSettings.sealSize).toBe('LARGE');
      expect(savedSettings.backgroundDesign).toBe('STRIPE');
      expect(savedSettings.defaultEstimateTemplateId).toBe('MODERN');
      expect(savedSettings.defaultInvoiceTemplateId).toBe('SIMPLE');
    });
  });

  describe('error handling', () => {
    it('should return failure result on storage read error', async () => {
      mockedAsyncStorage.getItem.mockRejectedValue(new Error('Storage read error'));

      const result = await v7AddPdfCustomizationMigration.migrate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('MIGRATION_FAILED');
      expect(result.error?.fromVersion).toBe(6);
      expect(result.error?.toVersion).toBe(7);
    });

    it('should return failure result on storage write error', async () => {
      const v6Settings = createV6Settings();
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(v6Settings));
      mockedAsyncStorage.setItem.mockRejectedValue(new Error('Storage write error'));

      const result = await v7AddPdfCustomizationMigration.migrate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('MIGRATION_FAILED');
    });
  });
});
