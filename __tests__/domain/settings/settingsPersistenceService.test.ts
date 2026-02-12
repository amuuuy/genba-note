/**
 * Tests for Settings Persistence Service
 *
 * Tests the 2-phase save logic and load logic for settings.
 */

// Mock expo-secure-store before imports
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

// Mock storage services
const mockGetSettings = jest.fn();
const mockUpdateSettings = jest.fn();
jest.mock('@/storage/asyncStorageService', () => ({
  getSettings: (...args: unknown[]) => mockGetSettings(...args),
  updateSettings: (...args: unknown[]) => mockUpdateSettings(...args),
  setReadOnlyMode: jest.fn(),
}));

const mockGetSensitiveIssuerInfo = jest.fn();
const mockSaveSensitiveIssuerInfo = jest.fn();
const mockDeleteSensitiveIssuerInfo = jest.fn();
jest.mock('@/storage/secureStorageService', () => ({
  getSensitiveIssuerInfo: (...args: unknown[]) => mockGetSensitiveIssuerInfo(...args),
  saveSensitiveIssuerInfo: (...args: unknown[]) => mockSaveSensitiveIssuerInfo(...args),
  deleteSensitiveIssuerInfo: (...args: unknown[]) => mockDeleteSensitiveIssuerInfo(...args),
}));

// Mock image utils
const mockDeleteStoredImage = jest.fn();
const mockIsValidBackgroundImageUri = jest.fn();
jest.mock('@/utils/imageUtils', () => ({
  deleteStoredImage: (...args: unknown[]) => mockDeleteStoredImage(...args),
  isValidBackgroundImageUri: (...args: unknown[]) => mockIsValidBackgroundImageUri(...args),
}));

import { loadSettings, saveSettings } from '@/domain/settings/settingsPersistenceService';
import { DEFAULT_APP_SETTINGS } from '@/types/settings';
import { createValidSettingsFormValues } from './helpers';

describe('settingsPersistenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadSettings', () => {
    it('returns app settings and sensitive settings on success', async () => {
      const appSettings = { ...DEFAULT_APP_SETTINGS };
      mockGetSettings.mockResolvedValue({ success: true, data: appSettings });
      mockGetSensitiveIssuerInfo.mockResolvedValue({
        success: true,
        data: {
          invoiceNumber: 'T1234567890123',
          bankAccount: {
            bankName: 'テスト銀行',
            branchName: null,
            accountType: null,
            accountNumber: null,
            accountHolderName: null,
          },
        },
      });

      const result = await loadSettings();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.appSettings).toBe(appSettings);
        expect(result.sensitiveSettings?.invoiceNumber).toBe('T1234567890123');
      }
    });

    it('returns default app settings when no data exists', async () => {
      mockGetSettings.mockResolvedValue({ success: true, data: null });
      mockGetSensitiveIssuerInfo.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await loadSettings();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.appSettings).toEqual(DEFAULT_APP_SETTINGS);
        expect(result.sensitiveSettings).toBeNull();
      }
    });

    it('returns error when AsyncStorage read fails', async () => {
      mockGetSettings.mockResolvedValue({
        success: false,
        error: { message: 'Parse error' },
      });

      const result = await loadSettings();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.message).toBe('Parse error');
      }
    });

    it('returns error when SecureStore read fails', async () => {
      mockGetSettings.mockResolvedValue({
        success: true,
        data: DEFAULT_APP_SETTINGS,
      });
      mockGetSensitiveIssuerInfo.mockResolvedValue({
        success: false,
        error: { message: 'Keychain error' },
      });

      const result = await loadSettings();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.message).toBe('Keychain error');
      }
    });

    it('returns null sensitiveSettings for first-time use', async () => {
      mockGetSettings.mockResolvedValue({
        success: true,
        data: DEFAULT_APP_SETTINGS,
      });
      mockGetSensitiveIssuerInfo.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await loadSettings();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.sensitiveSettings).toBeNull();
      }
    });
  });

  describe('saveSettings', () => {
    const values = createValidSettingsFormValues();

    it('saves to SecureStore first, then AsyncStorage', async () => {
      mockGetSettings.mockResolvedValue({
        success: true,
        data: DEFAULT_APP_SETTINGS,
      });
      mockGetSensitiveIssuerInfo.mockResolvedValue({
        success: true,
        data: null,
      });
      mockSaveSensitiveIssuerInfo.mockResolvedValue({ success: true });
      mockUpdateSettings.mockResolvedValue({ success: true });

      const result = await saveSettings(values);

      expect(result.success).toBe(true);
      // SecureStore save called before AsyncStorage update
      expect(mockSaveSensitiveIssuerInfo).toHaveBeenCalledTimes(1);
      expect(mockUpdateSettings).toHaveBeenCalledTimes(1);
    });

    it('returns error when SecureStore pre-read fails', async () => {
      mockGetSettings.mockResolvedValue({
        success: true,
        data: DEFAULT_APP_SETTINGS,
      });
      mockGetSensitiveIssuerInfo.mockResolvedValue({
        success: false,
        error: { message: 'Keychain locked' },
      });

      const result = await saveSettings(values);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.message).toBe('Keychain locked');
      }
      // Should NOT attempt any writes
      expect(mockSaveSensitiveIssuerInfo).not.toHaveBeenCalled();
      expect(mockUpdateSettings).not.toHaveBeenCalled();
    });

    it('returns error when SecureStore save fails', async () => {
      mockGetSettings.mockResolvedValue({
        success: true,
        data: DEFAULT_APP_SETTINGS,
      });
      mockGetSensitiveIssuerInfo.mockResolvedValue({
        success: true,
        data: null,
      });
      mockSaveSensitiveIssuerInfo.mockResolvedValue({
        success: false,
        error: { message: 'Size limit exceeded' },
      });

      const result = await saveSettings(values);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.message).toBe('Size limit exceeded');
      }
      // AsyncStorage should NOT be touched
      expect(mockUpdateSettings).not.toHaveBeenCalled();
    });

    it('rolls back SecureStore when AsyncStorage fails (existing data)', async () => {
      const previousSensitive = {
        invoiceNumber: 'T0000000000000',
        bankAccount: {
          bankName: '旧銀行',
          branchName: null,
          accountType: null,
          accountNumber: null,
          accountHolderName: null,
        },
      };

      mockGetSettings.mockResolvedValue({
        success: true,
        data: DEFAULT_APP_SETTINGS,
      });
      mockGetSensitiveIssuerInfo.mockResolvedValue({
        success: true,
        data: previousSensitive,
      });
      mockSaveSensitiveIssuerInfo
        .mockResolvedValueOnce({ success: true }) // Phase 1: save succeeds
        .mockResolvedValueOnce({ success: true }); // Rollback succeeds
      mockUpdateSettings.mockResolvedValue({
        success: false,
        error: { message: 'AsyncStorage write error' },
      });

      const result = await saveSettings(values);

      expect(result.success).toBe(false);
      // Rollback: saveSensitiveIssuerInfo called twice (save + rollback)
      expect(mockSaveSensitiveIssuerInfo).toHaveBeenCalledTimes(2);
      expect(mockSaveSensitiveIssuerInfo).toHaveBeenLastCalledWith(
        previousSensitive
      );
    });

    it('deletes SecureStore when AsyncStorage fails (first-time save)', async () => {
      mockGetSettings.mockResolvedValue({
        success: true,
        data: DEFAULT_APP_SETTINGS,
      });
      mockGetSensitiveIssuerInfo.mockResolvedValue({
        success: true,
        data: null, // First time - no previous data
      });
      mockSaveSensitiveIssuerInfo.mockResolvedValue({ success: true });
      mockUpdateSettings.mockResolvedValue({
        success: false,
        error: { message: 'Write failed' },
      });
      mockDeleteSensitiveIssuerInfo.mockResolvedValue({ success: true });

      const result = await saveSettings(values);

      expect(result.success).toBe(false);
      expect(mockDeleteSensitiveIssuerInfo).toHaveBeenCalledTimes(1);
    });

    it('returns critical error when rollback also fails', async () => {
      const previousSensitive = {
        invoiceNumber: 'T0000000000000',
        bankAccount: {
          bankName: '旧銀行',
          branchName: null,
          accountType: null,
          accountNumber: null,
          accountHolderName: null,
        },
      };

      mockGetSettings.mockResolvedValue({
        success: true,
        data: DEFAULT_APP_SETTINGS,
      });
      mockGetSensitiveIssuerInfo.mockResolvedValue({
        success: true,
        data: previousSensitive,
      });
      mockSaveSensitiveIssuerInfo
        .mockResolvedValueOnce({ success: true }) // Phase 1 succeeds
        .mockResolvedValueOnce({ success: false }); // Rollback fails
      mockUpdateSettings.mockResolvedValue({
        success: false,
        error: { message: 'Write failed' },
      });

      const result = await saveSettings(values);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.message).toContain('ロールバック');
        expect(result.message).toContain('整合性');
      }
    });

    it('cleans up old background image when URI changes', async () => {
      const previousUri = 'file:///old-image.png';
      mockGetSettings.mockResolvedValue({
        success: true,
        data: { ...DEFAULT_APP_SETTINGS, backgroundImageUri: previousUri },
      });
      mockGetSensitiveIssuerInfo.mockResolvedValue({
        success: true,
        data: null,
      });
      mockSaveSensitiveIssuerInfo.mockResolvedValue({ success: true });
      mockUpdateSettings.mockResolvedValue({ success: true });
      mockIsValidBackgroundImageUri.mockReturnValue(true);
      mockDeleteStoredImage.mockResolvedValue(undefined);

      const newValues = createValidSettingsFormValues({
        backgroundImageUri: 'file:///new-image.png',
      });

      const result = await saveSettings(newValues);

      expect(result.success).toBe(true);
      expect(mockDeleteStoredImage).toHaveBeenCalledWith(previousUri);
    });

    it('does not clean up background image when URI unchanged', async () => {
      const sameUri = 'file:///same-image.png';
      mockGetSettings.mockResolvedValue({
        success: true,
        data: { ...DEFAULT_APP_SETTINGS, backgroundImageUri: sameUri },
      });
      mockGetSensitiveIssuerInfo.mockResolvedValue({
        success: true,
        data: null,
      });
      mockSaveSensitiveIssuerInfo.mockResolvedValue({ success: true });
      mockUpdateSettings.mockResolvedValue({ success: true });

      const newValues = createValidSettingsFormValues({
        backgroundImageUri: sameUri,
      });

      await saveSettings(newValues);

      expect(mockDeleteStoredImage).not.toHaveBeenCalled();
    });
  });
});
