/**
 * Tests for autoNumberingService.ts
 * TDD: Tests are written first, implementation follows
 */

import {
  formatDocumentNumber,
  validatePrefix,
  generateDocumentNumber,
  getNumberingSettings,
} from '@/domain/document/autoNumberingService';
import * as asyncStorageService from '@/storage/asyncStorageService';
import type { StorageErrorCode } from '@/storage/asyncStorageService';
import { DEFAULT_APP_SETTINGS, AppSettings } from '@/types/settings';

// Mock AsyncStorage (required by asyncStorageService)
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock secureStorageService (required by asyncStorageService)
jest.mock('@/storage/secureStorageService', () => ({
  deleteIssuerSnapshot: jest.fn(),
}));

// Mock the storage service
jest.mock('@/storage/asyncStorageService');

const mockedAsyncStorageService = jest.mocked(asyncStorageService);

describe('autoNumberingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('formatDocumentNumber', () => {
    it('should format with 3-digit padding: EST-001', () => {
      expect(formatDocumentNumber('EST-', 1)).toBe('EST-001');
    });

    it('should format with 3-digit padding: EST-099', () => {
      expect(formatDocumentNumber('EST-', 99)).toBe('EST-099');
    });

    it('should format with 3-digit padding: EST-999', () => {
      expect(formatDocumentNumber('EST-', 999)).toBe('EST-999');
    });

    it('should format beyond 999: EST-1000', () => {
      expect(formatDocumentNumber('EST-', 1000)).toBe('EST-1000');
    });

    it('should format beyond 999: EST-12345', () => {
      expect(formatDocumentNumber('EST-', 12345)).toBe('EST-12345');
    });

    it('should work with custom prefix: QUOTE-001', () => {
      expect(formatDocumentNumber('QUOTE-', 1)).toBe('QUOTE-001');
    });

    it('should work with prefix without hyphen: INV001', () => {
      expect(formatDocumentNumber('INV', 1)).toBe('INV001');
    });

    it('should work with empty prefix', () => {
      expect(formatDocumentNumber('', 1)).toBe('001');
    });
  });

  describe('validatePrefix', () => {
    it('should return true for valid prefixes', () => {
      expect(validatePrefix('EST-')).toBe(true);
      expect(validatePrefix('INV-')).toBe(true);
      expect(validatePrefix('QUOTE')).toBe(true);
      expect(validatePrefix('ABC123')).toBe(true);
      expect(validatePrefix('a-b_c')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(validatePrefix('')).toBe(false);
    });

    it('should return false for prefix > 10 chars', () => {
      expect(validatePrefix('12345678901')).toBe(false); // 11 chars
      expect(validatePrefix('ABCDEFGHIJK')).toBe(false); // 11 chars
    });

    it('should return true for exactly 10 chars', () => {
      expect(validatePrefix('1234567890')).toBe(true);
    });

    it('should return false for invalid characters', () => {
      expect(validatePrefix('EST!')).toBe(false);
      expect(validatePrefix('INV@')).toBe(false);
      expect(validatePrefix('A B')).toBe(false); // space
      expect(validatePrefix('株式')).toBe(false); // Japanese
    });
  });

  describe('generateDocumentNumber', () => {
    // Helper to create mock for updateSettingsAtomic
    function mockUpdateSettingsAtomic(
      settings: AppSettings,
      success: boolean = true,
      errorCode?: StorageErrorCode
    ) {
      mockedAsyncStorageService.updateSettingsAtomic.mockImplementation(
        async (transform) => {
          if (!success) {
            return {
              success: false as const,
              error: { code: errorCode || 'WRITE_ERROR' as StorageErrorCode, message: 'Failed to write' },
            };
          }
          // Call transform to get the updated settings
          const updated = transform(settings);
          return { success: true as const, data: updated };
        }
      );
    }

    it('should generate EST-001 for first estimate', async () => {
      mockUpdateSettingsAtomic({ ...DEFAULT_APP_SETTINGS });

      const result = await generateDocumentNumber('estimate');

      expect(result.success).toBe(true);
      expect(result.data).toBe('EST-001');
    });

    it('should generate INV-001 for first invoice', async () => {
      mockUpdateSettingsAtomic({ ...DEFAULT_APP_SETTINGS });

      const result = await generateDocumentNumber('invoice');

      expect(result.success).toBe(true);
      expect(result.data).toBe('INV-001');
    });

    it('should increment number after each call', async () => {
      const settings = {
        ...DEFAULT_APP_SETTINGS,
        numbering: {
          ...DEFAULT_APP_SETTINGS.numbering,
          nextEstimateNumber: 5,
        },
      };

      mockUpdateSettingsAtomic(settings);

      const result = await generateDocumentNumber('estimate');

      expect(result.success).toBe(true);
      expect(result.data).toBe('EST-005');

      // Verify updateSettingsAtomic was called
      expect(mockedAsyncStorageService.updateSettingsAtomic).toHaveBeenCalled();
    });

    it('should use custom prefix from settings', async () => {
      const settings = {
        ...DEFAULT_APP_SETTINGS,
        numbering: {
          ...DEFAULT_APP_SETTINGS.numbering,
          estimatePrefix: 'QUOTE-',
          nextEstimateNumber: 1,
        },
      };

      mockUpdateSettingsAtomic(settings);

      const result = await generateDocumentNumber('estimate');

      expect(result.success).toBe(true);
      expect(result.data).toBe('QUOTE-001');
    });

    it('should return error on settings write failure', async () => {
      mockUpdateSettingsAtomic({ ...DEFAULT_APP_SETTINGS }, false, 'WRITE_ERROR' as StorageErrorCode);

      const result = await generateDocumentNumber('estimate');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SETTINGS_WRITE_ERROR');
    });

    it('should return error on read-only mode', async () => {
      mockUpdateSettingsAtomic({ ...DEFAULT_APP_SETTINGS }, false, 'READONLY_MODE' as StorageErrorCode);

      const result = await generateDocumentNumber('estimate');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SETTINGS_WRITE_ERROR');
      expect(result.error?.message).toContain('read-only');
    });

    it('should handle large numbers correctly', async () => {
      const settings = {
        ...DEFAULT_APP_SETTINGS,
        numbering: {
          ...DEFAULT_APP_SETTINGS.numbering,
          nextInvoiceNumber: 99999,
        },
      };

      mockUpdateSettingsAtomic(settings);

      const result = await generateDocumentNumber('invoice');

      expect(result.success).toBe(true);
      expect(result.data).toBe('INV-99999');
    });
  });

  describe('getNumberingSettings', () => {
    it('should return current numbering settings', async () => {
      const settings = {
        ...DEFAULT_APP_SETTINGS,
        numbering: {
          ...DEFAULT_APP_SETTINGS.numbering,
          estimatePrefix: 'EST-',
          invoicePrefix: 'INV-',
          nextEstimateNumber: 10,
          nextInvoiceNumber: 5,
        },
      };

      mockedAsyncStorageService.getSettings.mockResolvedValue({
        success: true,
        data: settings,
      });

      const result = await getNumberingSettings();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        estimatePrefix: 'EST-',
        invoicePrefix: 'INV-',
        nextEstimateNumber: 10,
        nextInvoiceNumber: 5,
      });
    });

    it('should return default settings if none exist', async () => {
      // Create a fresh copy with default values
      const defaultSettings = {
        ...DEFAULT_APP_SETTINGS,
        numbering: {
          estimatePrefix: 'EST-',
          invoicePrefix: 'INV-',
          nextEstimateNumber: 1,
          nextInvoiceNumber: 1,
        },
      };
      mockedAsyncStorageService.getSettings.mockResolvedValue({
        success: true,
        data: defaultSettings,
      });

      const result = await getNumberingSettings();

      expect(result.success).toBe(true);
      expect(result.data?.estimatePrefix).toBe('EST-');
      expect(result.data?.invoicePrefix).toBe('INV-');
      expect(result.data?.nextEstimateNumber).toBe(1);
      expect(result.data?.nextInvoiceNumber).toBe(1);
    });

    it('should return error on read failure', async () => {
      mockedAsyncStorageService.getSettings.mockResolvedValue({
        success: false,
        error: { code: 'READ_ERROR', message: 'Failed' },
      });

      const result = await getNumberingSettings();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SETTINGS_READ_ERROR');
    });
  });
});
