/**
 * Subscription Service Tests
 *
 * TDD tests for RevenueCat SDK integration and subscription management.
 */

// Create mock functions for Purchases BEFORE jest.mock
const mockConfigure = jest.fn();
const mockGetCustomerInfo = jest.fn();
const mockRestorePurchases = jest.fn();

// Mock react-native-purchases with complete mock (factory must be before any imports)
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: (config: unknown) => mockConfigure(config),
    getCustomerInfo: () => mockGetCustomerInfo(),
    restorePurchases: () => mockRestorePurchases(),
  },
}));

// Mock expo-secure-store (required since secureStorageService imports it)
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  __esModule: true,
  getStartupTime: jest.fn(),
}));

// Mock other dependencies - these are auto-mocked
jest.mock('@/storage/secureStorageService');
jest.mock('@/subscription/uptimeService');
jest.mock('@/subscription/offlineValidationService');

// Now import after mocks are set up
import * as secureStorageService from '@/storage/secureStorageService';
import * as uptimeService from '@/subscription/uptimeService';
import * as offlineValidationService from '@/subscription/offlineValidationService';
import {
  configureRevenueCat,
  verifySubscriptionOnline,
  getProStatus,
  restorePurchases,
  clearSubscriptionData,
} from '@/subscription/subscriptionService';
import type { ProValidationResult } from '@/types/subscription';
import { createValidCache } from './helpers';

// Typed mocks
const mockedSecureStorage = jest.mocked(secureStorageService);
const mockedUptime = jest.mocked(uptimeService);
const mockedOfflineValidation = jest.mocked(offlineValidationService);

// Type for mock CustomerInfo
interface MockCustomerInfo {
  entitlements: {
    active: Record<string, { isActive: boolean; expirationDateMillis: number | null }>;
    all: Record<string, unknown>;
    verification: string;
  };
  requestDate: string;
}

// Helper to create mock CustomerInfo
function createMockCustomerInfo(
  isProActive: boolean,
  expirationDate?: Date | null
): MockCustomerInfo {
  const now = Date.now();
  const entitlements: Record<string, { isActive: boolean; expirationDateMillis: number | null }> = {};

  if (isProActive) {
    entitlements['pro'] = {
      isActive: true,
      expirationDateMillis: expirationDate?.getTime() ?? null,
    };
  }

  return {
    entitlements: {
      active: isProActive ? entitlements : {},
      all: entitlements,
      verification: 'VERIFIED',
    },
    requestDate: new Date(now).toISOString(),
  };
}

describe('subscriptionService', () => {
  const MOCK_NOW = 1700000000000;
  const MOCK_UPTIME = 1000000000;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_NOW);

    // Default mock setup
    mockedUptime.getDeviceUptime.mockResolvedValue({
      success: true,
      uptimeMs: MOCK_UPTIME,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('configureRevenueCat', () => {
    it('should configure SDK with provided API key', async () => {
      mockConfigure.mockReturnValue(undefined);

      const result = await configureRevenueCat('test_api_key');

      expect(result.success).toBe(true);
      expect(mockConfigure).toHaveBeenCalledWith({
        apiKey: 'test_api_key',
      });
    });

    it('should return error when configuration fails', async () => {
      mockConfigure.mockImplementation(() => {
        throw new Error('Configuration failed');
      });

      const result = await configureRevenueCat('bad_key');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RC_NOT_CONFIGURED');
    });
  });

  describe('verifySubscriptionOnline', () => {
    it('should fetch CustomerInfo from RevenueCat', async () => {
      const mockInfo = createMockCustomerInfo(true, new Date(MOCK_NOW + 30 * 24 * 60 * 60 * 1000));
      mockGetCustomerInfo.mockResolvedValue(mockInfo);
      mockedSecureStorage.saveSubscriptionCache.mockResolvedValue({ success: true });

      const result = await verifySubscriptionOnline();

      expect(mockGetCustomerInfo).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should update cache with entitlementActive=true when Pro is active', async () => {
      const expirationDate = new Date(MOCK_NOW + 30 * 24 * 60 * 60 * 1000);
      const mockInfo = createMockCustomerInfo(true, expirationDate);
      mockGetCustomerInfo.mockResolvedValue(mockInfo);
      mockedSecureStorage.saveSubscriptionCache.mockResolvedValue({ success: true });

      await verifySubscriptionOnline();

      expect(mockedSecureStorage.saveSubscriptionCache).toHaveBeenCalledWith(
        expect.objectContaining({
          entitlementActive: true,
        })
      );
    });

    it('should set entitlementExpiration to expirationDate', async () => {
      const expirationDate = new Date(MOCK_NOW + 30 * 24 * 60 * 60 * 1000);
      const mockInfo = createMockCustomerInfo(true, expirationDate);
      mockGetCustomerInfo.mockResolvedValue(mockInfo);
      mockedSecureStorage.saveSubscriptionCache.mockResolvedValue({ success: true });

      await verifySubscriptionOnline();

      expect(mockedSecureStorage.saveSubscriptionCache).toHaveBeenCalledWith(
        expect.objectContaining({
          entitlementExpiration: expirationDate.getTime(),
        })
      );
    });

    it('should set entitlementExpiration to null for lifetime', async () => {
      const mockInfo = createMockCustomerInfo(true, null); // null = lifetime
      mockGetCustomerInfo.mockResolvedValue(mockInfo);
      mockedSecureStorage.saveSubscriptionCache.mockResolvedValue({ success: true });

      await verifySubscriptionOnline();

      expect(mockedSecureStorage.saveSubscriptionCache).toHaveBeenCalledWith(
        expect.objectContaining({
          entitlementExpiration: null,
        })
      );
    });

    it('should set entitlementExpiration to 0 when not subscribed', async () => {
      const mockInfo = createMockCustomerInfo(false);
      mockGetCustomerInfo.mockResolvedValue(mockInfo);
      mockedSecureStorage.saveSubscriptionCache.mockResolvedValue({ success: true });

      await verifySubscriptionOnline();

      expect(mockedSecureStorage.saveSubscriptionCache).toHaveBeenCalledWith(
        expect.objectContaining({
          entitlementActive: false,
          entitlementExpiration: 0,
        })
      );
    });

    it('should update lastVerifiedAt with server time (request_date)', async () => {
      const mockInfo = createMockCustomerInfo(true, new Date(MOCK_NOW + 30 * 24 * 60 * 60 * 1000));
      mockGetCustomerInfo.mockResolvedValue(mockInfo);
      mockedSecureStorage.saveSubscriptionCache.mockResolvedValue({ success: true });

      await verifySubscriptionOnline();

      // requestDate is set to current time (ISO string) in the mock
      expect(mockedSecureStorage.saveSubscriptionCache).toHaveBeenCalledWith(
        expect.objectContaining({
          lastVerifiedAt: expect.any(Number),
        })
      );
    });

    it('should update lastVerifiedUptime with current uptime', async () => {
      const mockInfo = createMockCustomerInfo(true, new Date(MOCK_NOW + 30 * 24 * 60 * 60 * 1000));
      mockGetCustomerInfo.mockResolvedValue(mockInfo);
      mockedSecureStorage.saveSubscriptionCache.mockResolvedValue({ success: true });

      await verifySubscriptionOnline();

      expect(mockedSecureStorage.saveSubscriptionCache).toHaveBeenCalledWith(
        expect.objectContaining({
          lastVerifiedUptime: MOCK_UPTIME,
        })
      );
    });

    it('should return error when requestDate is missing', async () => {
      const mockInfo = createMockCustomerInfo(true, new Date(MOCK_NOW + 30 * 24 * 60 * 60 * 1000));
      // Remove requestDate to simulate missing field
      delete (mockInfo as unknown as Record<string, unknown>).requestDate;
      mockGetCustomerInfo.mockResolvedValue(mockInfo);

      const result = await verifySubscriptionOnline();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_SERVER_TIME');
      expect(mockedSecureStorage.saveSubscriptionCache).not.toHaveBeenCalled();
    });

    it('should return error when requestDate is invalid', async () => {
      const mockInfo = createMockCustomerInfo(true, new Date(MOCK_NOW + 30 * 24 * 60 * 60 * 1000));
      (mockInfo as unknown as Record<string, unknown>).requestDate = 'not-a-date';
      mockGetCustomerInfo.mockResolvedValue(mockInfo);

      const result = await verifySubscriptionOnline();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_SERVER_TIME');
      expect(mockedSecureStorage.saveSubscriptionCache).not.toHaveBeenCalled();
    });

    it('should return error when RevenueCat fetch fails', async () => {
      mockGetCustomerInfo.mockRejectedValue(new Error('Network error'));

      const result = await verifySubscriptionOnline();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RC_FETCH_ERROR');
    });

    it('should succeed with warning when cache write fails', async () => {
      const mockInfo = createMockCustomerInfo(true, new Date(MOCK_NOW + 30 * 24 * 60 * 60 * 1000));
      mockGetCustomerInfo.mockResolvedValue(mockInfo);
      mockedSecureStorage.saveSubscriptionCache.mockResolvedValue({
        success: false,
        error: { code: 'WRITE_ERROR', message: 'Write failed' },
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await verifySubscriptionOnline();

      expect(result.success).toBe(true);
      expect(result.data?.isProActive).toBe(true);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should return online result with isProActive=false even when cache write fails', async () => {
      const mockInfo = createMockCustomerInfo(false);
      mockGetCustomerInfo.mockResolvedValue(mockInfo);
      mockedSecureStorage.saveSubscriptionCache.mockResolvedValue({
        success: false,
        error: { code: 'WRITE_ERROR', message: 'Write failed' },
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await verifySubscriptionOnline();

      expect(result.success).toBe(true);
      expect(result.data?.isProActive).toBe(false);
      warnSpy.mockRestore();
    });

    it('should return error when uptime fetch fails', async () => {
      mockedUptime.getDeviceUptime.mockResolvedValue({
        success: false,
        error: { code: 'UPTIME_UNAVAILABLE', message: 'Failed' },
      });

      const result = await verifySubscriptionOnline();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UPTIME_ERROR');
    });
  });

  describe('getProStatus', () => {
    it('should attempt online verification first', async () => {
      const mockInfo = createMockCustomerInfo(true, new Date(MOCK_NOW + 30 * 24 * 60 * 60 * 1000));
      mockGetCustomerInfo.mockResolvedValue(mockInfo);
      mockedSecureStorage.saveSubscriptionCache.mockResolvedValue({ success: true });

      await getProStatus();

      expect(mockGetCustomerInfo).toHaveBeenCalled();
    });

    it('should return online_verified on successful online check', async () => {
      const mockInfo = createMockCustomerInfo(true, new Date(MOCK_NOW + 30 * 24 * 60 * 60 * 1000));
      mockGetCustomerInfo.mockResolvedValue(mockInfo);
      mockedSecureStorage.saveSubscriptionCache.mockResolvedValue({ success: true });

      const result = await getProStatus();

      expect(result.isProAllowed).toBe(true);
      expect(result.reason).toBe('online_verified');
    });

    it('should return not Pro when online verification shows inactive', async () => {
      const mockInfo = createMockCustomerInfo(false);
      mockGetCustomerInfo.mockResolvedValue(mockInfo);
      mockedSecureStorage.saveSubscriptionCache.mockResolvedValue({ success: true });

      const result = await getProStatus();

      expect(result.isProAllowed).toBe(false);
      expect(result.reason).toBe('online_verified');
    });

    it('should fall back to offline validation on network error', async () => {
      mockGetCustomerInfo.mockRejectedValue(new Error('Network error'));

      const mockCache = createValidCache();
      mockedSecureStorage.getSubscriptionCache.mockResolvedValue({
        success: true,
        data: mockCache,
      });

      const mockOfflineResult: ProValidationResult = {
        isProAllowed: true,
        reason: 'offline_grace_period',
        requiresOnlineVerification: false,
      };
      mockedOfflineValidation.validateProOffline.mockReturnValue(mockOfflineResult);

      const result = await getProStatus();

      expect(mockedSecureStorage.getSubscriptionCache).toHaveBeenCalled();
      expect(mockedOfflineValidation.validateProOffline).toHaveBeenCalled();
      expect(result.reason).toBe('offline_grace_period');
    });

    it('should return online_verified when cache write fails but online verification succeeds', async () => {
      const mockInfo = createMockCustomerInfo(true, new Date(MOCK_NOW + 30 * 24 * 60 * 60 * 1000));
      mockGetCustomerInfo.mockResolvedValue(mockInfo);
      mockedSecureStorage.saveSubscriptionCache.mockResolvedValue({
        success: false,
        error: { code: 'WRITE_ERROR', message: 'Write failed' },
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await getProStatus();

      expect(result.isProAllowed).toBe(true);
      expect(result.reason).toBe('online_verified');
      expect(mockedOfflineValidation.validateProOffline).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should return offline validation result on fallback', async () => {
      mockGetCustomerInfo.mockRejectedValue(new Error('Network error'));

      mockedSecureStorage.getSubscriptionCache.mockResolvedValue({
        success: true,
        data: null,
      });

      const mockOfflineResult: ProValidationResult = {
        isProAllowed: false,
        reason: 'cache_missing',
        requiresOnlineVerification: true,
      };
      mockedOfflineValidation.validateProOffline.mockReturnValue(mockOfflineResult);

      const result = await getProStatus();

      expect(result.isProAllowed).toBe(false);
      expect(result.reason).toBe('cache_missing');
    });
  });

  describe('restorePurchases', () => {
    it('should call RevenueCat restorePurchases', async () => {
      const mockInfo = createMockCustomerInfo(true, new Date(MOCK_NOW + 30 * 24 * 60 * 60 * 1000));
      mockRestorePurchases.mockResolvedValue(mockInfo);
      mockedSecureStorage.saveSubscriptionCache.mockResolvedValue({ success: true });

      await restorePurchases();

      expect(mockRestorePurchases).toHaveBeenCalled();
    });

    it('should update cache on successful restore', async () => {
      const expirationDate = new Date(MOCK_NOW + 30 * 24 * 60 * 60 * 1000);
      const mockInfo = createMockCustomerInfo(true, expirationDate);
      mockRestorePurchases.mockResolvedValue(mockInfo);
      mockedSecureStorage.saveSubscriptionCache.mockResolvedValue({ success: true });

      const result = await restorePurchases();

      expect(result.success).toBe(true);
      expect(mockedSecureStorage.saveSubscriptionCache).toHaveBeenCalled();
    });

    it('should return restore result even when cache write fails', async () => {
      const expirationDate = new Date(MOCK_NOW + 30 * 24 * 60 * 60 * 1000);
      const mockInfo = createMockCustomerInfo(true, expirationDate);
      mockRestorePurchases.mockResolvedValue(mockInfo);
      mockedSecureStorage.saveSubscriptionCache.mockResolvedValue({
        success: false,
        error: { code: 'WRITE_ERROR', message: 'Write failed' },
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await restorePurchases();

      expect(result.success).toBe(true);
      expect(result.data?.isProActive).toBe(true);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should return error when restore fails', async () => {
      mockRestorePurchases.mockRejectedValue(new Error('Restore failed'));

      const result = await restorePurchases();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RC_RESTORE_ERROR');
    });

    it('should return error when requestDate is missing on restore', async () => {
      const mockInfo = createMockCustomerInfo(true, new Date(MOCK_NOW + 30 * 24 * 60 * 60 * 1000));
      delete (mockInfo as unknown as Record<string, unknown>).requestDate;
      mockRestorePurchases.mockResolvedValue(mockInfo);

      const result = await restorePurchases();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_SERVER_TIME');
      expect(mockedSecureStorage.saveSubscriptionCache).not.toHaveBeenCalled();
    });

    it('should return error when requestDate is invalid on restore', async () => {
      const mockInfo = createMockCustomerInfo(true, new Date(MOCK_NOW + 30 * 24 * 60 * 60 * 1000));
      (mockInfo as unknown as Record<string, unknown>).requestDate = 'not-a-date';
      mockRestorePurchases.mockResolvedValue(mockInfo);

      const result = await restorePurchases();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_SERVER_TIME');
      expect(mockedSecureStorage.saveSubscriptionCache).not.toHaveBeenCalled();
    });
  });

  describe('clearSubscriptionData', () => {
    it('should clear all subscription cache values', async () => {
      mockedSecureStorage.clearSubscriptionCache.mockResolvedValue({ success: true });

      const result = await clearSubscriptionData();

      expect(result.success).toBe(true);
      expect(mockedSecureStorage.clearSubscriptionCache).toHaveBeenCalled();
    });

    it('should return error when clear fails', async () => {
      mockedSecureStorage.clearSubscriptionCache.mockResolvedValue({
        success: false,
        error: { code: 'DELETE_ERROR', message: 'Delete failed' },
      });

      const result = await clearSubscriptionData();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CACHE_WRITE_ERROR');
    });
  });
});
