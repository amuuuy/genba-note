/**
 * Integration test: malformed SecureStore data → getProStatus() fail-closed
 *
 * This test does NOT mock secureStorageService or offlineValidationService.
 * Only the low-level dependencies (expo-secure-store, react-native-purchases)
 * are mocked so that the real parsing and validation code runs end-to-end.
 */

// Mock react-native-purchases to simulate offline (throws network error)
const mockGetCustomerInfo = jest.fn();
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getCustomerInfo: () => mockGetCustomerInfo(),
    restorePurchases: jest.fn(),
  },
}));

// Mock expo-secure-store (low-level storage only)
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import { getProStatus } from '@/subscription/subscriptionService';
import { setUptimeOverride, resetUptimeOverride } from '@/subscription/uptimeService';
import { SUBSCRIPTION_STORE_KEYS } from '@/types/subscription';

const mockedSecureStore = jest.mocked(SecureStore);

describe('Malformed cache → fail-closed integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Simulate offline: RevenueCat always throws
    mockGetCustomerInfo.mockRejectedValue(new Error('Network error'));
    // Set deterministic uptime
    setUptimeOverride(1000000);
  });

  afterEach(() => {
    resetUptimeOverride();
  });

  it('should deny Pro when SecureStore contains partial numeric "123abc" in expiration', async () => {
    mockedSecureStore.getItemAsync.mockImplementation(async (key: string) => {
      switch (key) {
        case SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_ACTIVE: return 'true';
        case SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_EXPIRATION: return '123abc';
        case SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_AT: return '1000000';
        case SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_UPTIME: return '500000';
        default: return null;
      }
    });

    const result = await getProStatus();

    // Malformed cache → getSubscriptionCache returns PARSE_ERROR
    // → getProStatus treats as cache=null → validateProOffline → isProAllowed=false
    expect(result.isProAllowed).toBe(false);
  });

  it('should deny Pro when SecureStore contains scientific notation "1e3" in lastVerifiedAt', async () => {
    mockedSecureStore.getItemAsync.mockImplementation(async (key: string) => {
      switch (key) {
        case SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_ACTIVE: return 'true';
        case SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_EXPIRATION: return String(Date.now() + 86400000);
        case SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_AT: return '1e3';
        case SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_UPTIME: return '500000';
        default: return null;
      }
    });

    const result = await getProStatus();

    expect(result.isProAllowed).toBe(false);
  });

  it('should deny Pro when SecureStore throws on read', async () => {
    mockedSecureStore.getItemAsync.mockRejectedValue(new Error('Keychain unavailable'));

    const result = await getProStatus();

    expect(result.isProAllowed).toBe(false);
  });

  it('should allow Pro with valid cache and no online verification', async () => {
    const now = Date.now();
    mockedSecureStore.getItemAsync.mockImplementation(async (key: string) => {
      switch (key) {
        case SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_ACTIVE: return 'true';
        case SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_EXPIRATION: return String(now + 86400000);
        case SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_AT: return String(now - 1000);
        case SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_UPTIME: return '999000';
        default: return null;
      }
    });

    const result = await getProStatus();

    expect(result.isProAllowed).toBe(true);
    expect(result.reason).toBe('offline_grace_period');
  });
});
