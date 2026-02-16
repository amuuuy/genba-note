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
import { setReadOnlyMode } from '@/storage/asyncStorageService';
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

    it('should reject data exceeding 2KB size limit', async () => {
      // Create data that exceeds 2048 bytes when JSON-serialized
      const largeIssuerInfo: SensitiveIssuerSettings = {
        invoiceNumber: 'T1234567890123',
        bankAccount: {
          bankName: 'あ'.repeat(500), // 500 chars × 3 bytes = 1500 bytes
          branchName: 'い'.repeat(500), // 500 chars × 3 bytes = 1500 bytes
          accountType: '普通',
          accountNumber: '1234567',
          accountHolderName: '山田太郎',
        },
      };

      const result = await saveSensitiveIssuerInfo(largeIssuerInfo);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SIZE_LIMIT_EXCEEDED');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should accept data within 2KB size limit', async () => {
      mockedSecureStore.setItemAsync.mockResolvedValue();

      // Normal sized data should succeed
      const normalIssuerInfo: SensitiveIssuerSettings = {
        invoiceNumber: 'T1234567890123',
        bankAccount: {
          bankName: '三菱UFJ銀行',
          branchName: '渋谷支店',
          accountType: '普通',
          accountNumber: '1234567',
          accountHolderName: '山田太郎',
        },
      };

      const result = await saveSensitiveIssuerInfo(normalIssuerInfo);
      expect(result.success).toBe(true);
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalled();
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

    it('should reject snapshot exceeding 2KB size limit', async () => {
      // Create snapshot that exceeds 2048 bytes when JSON-serialized
      const largeSnapshot: SensitiveIssuerSnapshot = {
        invoiceNumber: 'T1234567890123',
        bankName: 'あ'.repeat(500), // 500 chars × 3 bytes = 1500 bytes
        branchName: 'い'.repeat(500), // 500 chars × 3 bytes = 1500 bytes
        accountType: '普通',
        accountNumber: '1234567',
        accountHolderName: '山田太郎',
      };

      const result = await saveIssuerSnapshot(testDocumentId, largeSnapshot);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SIZE_LIMIT_EXCEEDED');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should accept snapshot within 2KB size limit', async () => {
      mockedSecureStore.setItemAsync.mockResolvedValue();

      const result = await saveIssuerSnapshot(testDocumentId, testSnapshot);
      expect(result.success).toBe(true);
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalled();
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

    it('should reject partial numeric "123abc" in expiration via getSubscriptionCache', async () => {
      mockedSecureStore.getItemAsync
        .mockResolvedValueOnce('true')
        .mockResolvedValueOnce('123abc')
        .mockResolvedValueOnce('1000')
        .mockResolvedValueOnce('2000');

      const result = await getSubscriptionCache();
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
    });

    it('should reject scientific notation "1e3" in lastVerifiedAt via getSubscriptionCache', async () => {
      mockedSecureStore.getItemAsync
        .mockResolvedValueOnce('true')
        .mockResolvedValueOnce('1000')
        .mockResolvedValueOnce('1e3')
        .mockResolvedValueOnce('2000');

      const result = await getSubscriptionCache();
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
    });

    it('should reject hex "0x10" in lastVerifiedUptime via getSubscriptionCache', async () => {
      mockedSecureStore.getItemAsync
        .mockResolvedValueOnce('true')
        .mockResolvedValueOnce('1000')
        .mockResolvedValueOnce('2000')
        .mockResolvedValueOnce('0x10');

      const result = await getSubscriptionCache();
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
    });

    it('should reject NaN in entitlementExpiration via saveSubscriptionCache', async () => {
      const result = await saveSubscriptionCache({
        entitlementActive: true,
        entitlementExpiration: NaN,
        lastVerifiedAt: 1000,
        lastVerifiedUptime: 2000,
      });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WRITE_ERROR');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should reject Infinity in lastVerifiedAt via saveSubscriptionCache', async () => {
      const result = await saveSubscriptionCache({
        entitlementActive: true,
        entitlementExpiration: 1000,
        lastVerifiedAt: Infinity,
        lastVerifiedUptime: 2000,
      });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WRITE_ERROR');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should reject negative values in lastVerifiedUptime via saveSubscriptionCache', async () => {
      const result = await saveSubscriptionCache({
        entitlementActive: true,
        entitlementExpiration: 1000,
        lastVerifiedAt: 2000,
        lastVerifiedUptime: -1,
      });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WRITE_ERROR');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should reject unsafe integer in entitlementExpiration via saveSubscriptionCache', async () => {
      const result = await saveSubscriptionCache({
        entitlementActive: true,
        entitlementExpiration: Number.MAX_SAFE_INTEGER + 1,
        lastVerifiedAt: 1000,
        lastVerifiedUptime: 2000,
      });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WRITE_ERROR');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should accept null entitlementExpiration via saveSubscriptionCache', async () => {
      mockedSecureStore.setItemAsync.mockResolvedValue();

      const result = await saveSubscriptionCache({
        entitlementActive: true,
        entitlementExpiration: null,
        lastVerifiedAt: 1000,
        lastVerifiedUptime: 2000,
      });
      expect(result.success).toBe(true);
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_EXPIRATION,
        'null'
      );
    });

    it('should normalize float values via saveSubscriptionCache (Math.floor)', async () => {
      mockedSecureStore.setItemAsync.mockResolvedValue();

      const floatCache: SubscriptionCache = {
        entitlementActive: true,
        entitlementExpiration: 1000.7,
        lastVerifiedAt: 2000.9,
        lastVerifiedUptime: 3000.3,
      };

      await saveSubscriptionCache(floatCache);

      // Verify Math.floor was applied
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_EXPIRATION,
        '1000'
      );
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_AT,
        '2000'
      );
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
        SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_UPTIME,
        '3000'
      );
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

      it('should return PARSE_ERROR for corrupt value', async () => {
        mockedSecureStore.getItemAsync.mockResolvedValue('not_a_number');

        const result = await getEntitlementExpiration();
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('PARSE_ERROR');
      });

      it('should return PARSE_ERROR for partial numeric like "123abc"', async () => {
        mockedSecureStore.getItemAsync.mockResolvedValue('123abc');
        const result = await getEntitlementExpiration();
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('PARSE_ERROR');
      });

      it('should return PARSE_ERROR for scientific notation "1e3"', async () => {
        mockedSecureStore.getItemAsync.mockResolvedValue('1e3');
        const result = await getEntitlementExpiration();
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('PARSE_ERROR');
      });

      it('should return PARSE_ERROR for hex "0x10"', async () => {
        mockedSecureStore.getItemAsync.mockResolvedValue('0x10');
        const result = await getEntitlementExpiration();
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('PARSE_ERROR');
      });

      it('should reject NaN via setEntitlementExpiration', async () => {
        const result = await setEntitlementExpiration(NaN);
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('WRITE_ERROR');
        expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
      });

      it('should reject negative via setEntitlementExpiration', async () => {
        const result = await setEntitlementExpiration(-1);
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('WRITE_ERROR');
        expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
      });

      it('should reject Infinity via setEntitlementExpiration', async () => {
        const result = await setEntitlementExpiration(Infinity);
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('WRITE_ERROR');
        expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
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

      it('should return PARSE_ERROR for corrupt value', async () => {
        mockedSecureStore.getItemAsync.mockResolvedValue('corrupt');

        const result = await getLastVerifiedAt();
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('PARSE_ERROR');
      });

      it('should return PARSE_ERROR for partial numeric like "123abc"', async () => {
        mockedSecureStore.getItemAsync.mockResolvedValue('123abc');
        const result = await getLastVerifiedAt();
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('PARSE_ERROR');
      });

      it('should reject NaN via setLastVerifiedAt', async () => {
        const result = await setLastVerifiedAt(NaN);
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('WRITE_ERROR');
        expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
      });

      it('should reject negative via setLastVerifiedAt', async () => {
        const result = await setLastVerifiedAt(-1);
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('WRITE_ERROR');
        expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
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

      it('should return PARSE_ERROR for corrupt value', async () => {
        mockedSecureStore.getItemAsync.mockResolvedValue('abc');

        const result = await getLastVerifiedUptime();
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('PARSE_ERROR');
      });

      it('should return PARSE_ERROR for partial numeric like "123abc"', async () => {
        mockedSecureStore.getItemAsync.mockResolvedValue('123abc');
        const result = await getLastVerifiedUptime();
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('PARSE_ERROR');
      });

      it('should reject NaN via setLastVerifiedUptime', async () => {
        const result = await setLastVerifiedUptime(NaN);
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('WRITE_ERROR');
        expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
      });

      it('should reject negative via setLastVerifiedUptime', async () => {
        const result = await setLastVerifiedUptime(-1);
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('WRITE_ERROR');
        expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
      });
    });
  });

  // === Read-Only Mode Tests ===
  describe('Read-only mode enforcement', () => {
    const testIssuerInfo: SensitiveIssuerSettings = {
      invoiceNumber: 'T1234567890123',
      bankAccount: {
        bankName: 'テスト銀行',
        branchName: 'テスト支店',
        accountType: '普通',
        accountNumber: '1234567',
        accountHolderName: 'テスト',
      },
    };

    const testSnapshot: SensitiveIssuerSnapshot = {
      invoiceNumber: 'T1234567890123',
      bankName: 'テスト銀行',
      branchName: 'テスト支店',
      accountType: '普通',
      accountNumber: '1234567',
      accountHolderName: 'テスト',
    };

    const testCache: SubscriptionCache = {
      entitlementActive: true,
      entitlementExpiration: Date.now() + 30 * 24 * 60 * 60 * 1000,
      lastVerifiedAt: Date.now(),
      lastVerifiedUptime: 12345678,
    };

    beforeEach(() => {
      // Ensure read-only mode is disabled before each test
      setReadOnlyMode(false);
    });

    afterAll(() => {
      // Clean up after all tests
      setReadOnlyMode(false);
    });

    it('should block saveSensitiveIssuerInfo in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await saveSensitiveIssuerInfo(testIssuerInfo);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should block saveIssuerSnapshot in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await saveIssuerSnapshot('doc-123', testSnapshot);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should block deleteIssuerSnapshot in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await deleteIssuerSnapshot('doc-123');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();
    });

    it('should block saveSubscriptionCache in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await saveSubscriptionCache(testCache);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should block clearSubscriptionCache in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await clearSubscriptionCache();
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedSecureStore.deleteItemAsync).not.toHaveBeenCalled();
    });

    it('should block setEntitlementActive in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await setEntitlementActive(true);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should block setEntitlementExpiration in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await setEntitlementExpiration(Date.now());
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should block setLastVerifiedAt in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await setLastVerifiedAt(Date.now());
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should block setLastVerifiedUptime in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await setLastVerifiedUptime(12345678);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedSecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('should allow read operations in read-only mode', async () => {
      setReadOnlyMode(true);
      mockedSecureStore.getItemAsync.mockResolvedValue(null);

      // All read operations should still work
      const issuerResult = await getSensitiveIssuerInfo();
      expect(issuerResult.success).toBe(true);

      const snapshotResult = await getIssuerSnapshot('doc-123');
      expect(snapshotResult.success).toBe(true);

      const cacheResult = await getSubscriptionCache();
      expect(cacheResult.success).toBe(true);

      const activeResult = await getEntitlementActive();
      expect(activeResult.success).toBe(true);

      const expirationResult = await getEntitlementExpiration();
      expect(expirationResult.success).toBe(true);

      const verifiedAtResult = await getLastVerifiedAt();
      expect(verifiedAtResult.success).toBe(true);

      const uptimeResult = await getLastVerifiedUptime();
      expect(uptimeResult.success).toBe(true);
    });

    it('should allow write operations when read-only mode is disabled', async () => {
      setReadOnlyMode(false);
      mockedSecureStore.setItemAsync.mockResolvedValue();

      const result = await saveSensitiveIssuerInfo(testIssuerInfo);
      expect(result.success).toBe(true);
      expect(mockedSecureStore.setItemAsync).toHaveBeenCalled();
    });
  });
});
