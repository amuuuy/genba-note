/**
 * Tests for secureStorageService
 *
 * TDD approach: Write tests first, then implement to make them pass
 */

import * as SecureStore from 'expo-secure-store';
import {
  getSensitiveIssuerInfo,
  saveSensitiveIssuerInfo,
  getIssuerSnapshot,
  saveIssuerSnapshot,
  deleteIssuerSnapshot,
  getSubscriptionCache,
  saveSubscriptionCache,
  clearSubscriptionCache,
  getEntitlementActive,
  setEntitlementActive,
  getEntitlementExpiration,
  setEntitlementExpiration,
  getLastVerifiedAt,
  setLastVerifiedAt,
  getLastVerifiedUptime,
  setLastVerifiedUptime,
} from '@/storage/secureStorageService';
import { SensitiveIssuerSettings } from '@/types/settings';
import { SensitiveIssuerSnapshot } from '@/types/document';
import { SubscriptionCache, SUBSCRIPTION_STORE_KEYS } from '@/types/subscription';
import { SECURE_STORAGE_KEYS } from '@/utils/constants';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const mockedSecureStore = jest.mocked(SecureStore);

describe('secureStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // === Sensitive Issuer Info Tests ===
  describe('Sensitive issuer info', () => {
    const testIssuerInfo: SensitiveIssuerSettings = {
      invoiceNumber: 'T1234567890123',
      bankAccount: {
        bankName: '三菱UFJ銀行',
        branchName: '渋谷支店',
        accountType: '普通',
        accountNumber: '1234567',
        accountHolderName: '山田太郎',
      },
    };

    it('should save and retrieve sensitive issuer info', async () => {
      mockedSecureStore.setItemAsync.mockResolvedValue();
      mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(testIssuerInfo));

      const saveResult = await saveSensitiveIssuerInfo(testIssuerInfo);
      expect(saveResult.success).toBe(true);
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        SECURE_STORAGE_KEYS.SENSITIVE_ISSUER_INFO,
        JSON.stringify(testIssuerInfo)
      );

      const getResult = await getSensitiveIssuerInfo();
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(testIssuerInfo);
    });

    it('should return null when no info exists', async () => {
      mockedSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await getSensitiveIssuerInfo();
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle read errors gracefully', async () => {
      mockedSecureStore.getItemAsync.mockRejectedValue(new Error('Read failed'));

      const result = await getSensitiveIssuerInfo();
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READ_ERROR');
    });

    it('should handle write errors gracefully', async () => {
      mockedSecureStore.setItemAsync.mockRejectedValue(new Error('Write failed'));

      const result = await saveSensitiveIssuerInfo(testIssuerInfo);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WRITE_ERROR');
    });

    it('should handle malformed JSON gracefully', async () => {
      mockedSecureStore.getItemAsync.mockResolvedValue('invalid json');

      const result = await getSensitiveIssuerInfo();
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
    });
  });

  // === Document Snapshot Tests ===
  describe('Issuer snapshots', () => {
    const testDocumentId = 'doc-123-uuid';
    const testSnapshot: SensitiveIssuerSnapshot = {
      invoiceNumber: 'T1234567890123',
      bankName: '三菱UFJ銀行',
      branchName: '渋谷支店',
      accountType: '普通',
      accountNumber: '1234567',
      accountHolderName: '山田太郎',
    };

    it('should save and retrieve issuer snapshot by document ID', async () => {
      mockedSecureStore.setItemAsync.mockResolvedValue();
      mockedSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(testSnapshot));

      const saveResult = await saveIssuerSnapshot(testDocumentId, testSnapshot);
      expect(saveResult.success).toBe(true);
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        `${SECURE_STORAGE_KEYS.ISSUER_SNAPSHOT_PREFIX}${testDocumentId}`,
        JSON.stringify(testSnapshot)
      );

      const getResult = await getIssuerSnapshot(testDocumentId);
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(testSnapshot);
    });

    it('should delete issuer snapshot', async () => {
      mockedSecureStore.deleteItemAsync.mockResolvedValue();

      const result = await deleteIssuerSnapshot(testDocumentId);
      expect(result.success).toBe(true);
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        `${SECURE_STORAGE_KEYS.ISSUER_SNAPSHOT_PREFIX}${testDocumentId}`
      );
    });

    it('should return null for non-existent snapshot', async () => {
      mockedSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await getIssuerSnapshot('non-existent-id');
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle delete errors gracefully', async () => {
      mockedSecureStore.deleteItemAsync.mockRejectedValue(new Error('Delete failed'));

      const result = await deleteIssuerSnapshot(testDocumentId);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DELETE_ERROR');
    });
  });

  // === Subscription Cache Tests ===
  describe('Subscription cache', () => {
    const testCache: SubscriptionCache = {
      entitlementActive: true,
      entitlementExpiration: Date.now() + 30 * 24 * 60 * 60 * 1000,
      lastVerifiedAt: Date.now(),
      lastVerifiedUptime: 12345678,
    };

    it('should save and retrieve subscription cache', async () => {
      mockedSecureStore.setItemAsync.mockResolvedValue();
      mockedSecureStore.getItemAsync
        .mockResolvedValueOnce('true') // entitlementActive
        .mockResolvedValueOnce(String(testCache.entitlementExpiration)) // entitlementExpiration
        .mockResolvedValueOnce(String(testCache.lastVerifiedAt)) // lastVerifiedAt
        .mockResolvedValueOnce(String(testCache.lastVerifiedUptime)); // lastVerifiedUptime

      const saveResult = await saveSubscriptionCache(testCache);
      expect(saveResult.success).toBe(true);

      const getResult = await getSubscriptionCache();
      expect(getResult.success).toBe(true);
      expect(getResult.data).toEqual(testCache);
    });

    it('should handle null expiration (lifetime subscription)', async () => {
      const lifetimeCache: SubscriptionCache = {
        entitlementActive: true,
        entitlementExpiration: null, // lifetime
        lastVerifiedAt: Date.now(),
        lastVerifiedUptime: 12345678,
      };

      mockedSecureStore.setItemAsync.mockResolvedValue();
      mockedSecureStore.getItemAsync
        .mockResolvedValueOnce('true')
        .mockResolvedValueOnce('null') // null string for lifetime
        .mockResolvedValueOnce(String(lifetimeCache.lastVerifiedAt))
        .mockResolvedValueOnce(String(lifetimeCache.lastVerifiedUptime));

      const saveResult = await saveSubscriptionCache(lifetimeCache);
      expect(saveResult.success).toBe(true);

      const getResult = await getSubscriptionCache();
      expect(getResult.success).toBe(true);
      expect(getResult.data?.entitlementExpiration).toBeNull();
    });

    it('should handle expiration = 0 (explicitly inactive)', async () => {
      const inactiveCache: SubscriptionCache = {
        entitlementActive: false,
        entitlementExpiration: 0, // explicitly inactive
        lastVerifiedAt: Date.now(),
        lastVerifiedUptime: 12345678,
      };

      mockedSecureStore.setItemAsync.mockResolvedValue();
      mockedSecureStore.getItemAsync
        .mockResolvedValueOnce('false')
        .mockResolvedValueOnce('0')
        .mockResolvedValueOnce(String(inactiveCache.lastVerifiedAt))
        .mockResolvedValueOnce(String(inactiveCache.lastVerifiedUptime));

      const saveResult = await saveSubscriptionCache(inactiveCache);
      expect(saveResult.success).toBe(true);

      const getResult = await getSubscriptionCache();
      expect(getResult.success).toBe(true);
      expect(getResult.data?.entitlementExpiration).toBe(0);
    });

    it('should return null when cache is missing', async () => {
      mockedSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await getSubscriptionCache();
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should clear subscription cache', async () => {
      mockedSecureStore.deleteItemAsync.mockResolvedValue();

      const result = await clearSubscriptionCache();
      expect(result.success).toBe(true);
      expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledTimes(4);
    });
  });

  // === Individual Subscription Value Tests ===
  describe('Individual subscription values', () => {
    describe('entitlement_active', () => {
      it('should set and get true', async () => {
        mockedSecureStore.setItemAsync.mockResolvedValue();
        mockedSecureStore.getItemAsync.mockResolvedValue('true');

        await setEntitlementActive(true);
        const result = await getEntitlementActive();
        expect(result.success).toBe(true);
        expect(result.data).toBe(true);
      });

      it('should set and get false', async () => {
        mockedSecureStore.setItemAsync.mockResolvedValue();
        mockedSecureStore.getItemAsync.mockResolvedValue('false');

        await setEntitlementActive(false);
        const result = await getEntitlementActive();
        expect(result.success).toBe(true);
        expect(result.data).toBe(false);
      });

      it('should return null when not set', async () => {
        mockedSecureStore.getItemAsync.mockResolvedValue(null);

        const result = await getEntitlementActive();
        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });
    });

    describe('entitlement_expiration', () => {
      it('should set and get expiration timestamp', async () => {
        const expiration = Date.now() + 86400000;
        mockedSecureStore.setItemAsync.mockResolvedValue();
        mockedSecureStore.getItemAsync.mockResolvedValue(String(expiration));

        await setEntitlementExpiration(expiration);
        const result = await getEntitlementExpiration();
        expect(result.success).toBe(true);
        expect(result.data).toBe(expiration);
      });

      it('should handle null (lifetime)', async () => {
        mockedSecureStore.setItemAsync.mockResolvedValue();
        mockedSecureStore.getItemAsync.mockResolvedValue('null');

        await setEntitlementExpiration(null);
        const result = await getEntitlementExpiration();
        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });

      it('should handle 0 (explicitly inactive)', async () => {
        mockedSecureStore.setItemAsync.mockResolvedValue();
        mockedSecureStore.getItemAsync.mockResolvedValue('0');

        await setEntitlementExpiration(0);
        const result = await getEntitlementExpiration();
        expect(result.success).toBe(true);
        expect(result.data).toBe(0);
      });
    });

    describe('last_verified_at', () => {
      it('should set and get timestamp', async () => {
        const timestamp = Date.now();
        mockedSecureStore.setItemAsync.mockResolvedValue();
        mockedSecureStore.getItemAsync.mockResolvedValue(String(timestamp));

        await setLastVerifiedAt(timestamp);
        const result = await getLastVerifiedAt();
        expect(result.success).toBe(true);
        expect(result.data).toBe(timestamp);
      });

      it('should return null when not set', async () => {
        mockedSecureStore.getItemAsync.mockResolvedValue(null);

        const result = await getLastVerifiedAt();
        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });
    });

    describe('last_verified_uptime', () => {
      it('should set and get uptime', async () => {
        const uptime = 12345678;
        mockedSecureStore.setItemAsync.mockResolvedValue();
        mockedSecureStore.getItemAsync.mockResolvedValue(String(uptime));

        await setLastVerifiedUptime(uptime);
        const result = await getLastVerifiedUptime();
        expect(result.success).toBe(true);
        expect(result.data).toBe(uptime);
      });

      it('should return null when not set', async () => {
        mockedSecureStore.getItemAsync.mockResolvedValue(null);

        const result = await getLastVerifiedUptime();
        expect(result.success).toBe(true);
        expect(result.data).toBeNull();
      });
    });
  });
});
