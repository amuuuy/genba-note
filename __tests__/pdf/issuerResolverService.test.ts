/**
 * Tests for Issuer Resolver Service
 *
 * TDD: RED phase - Tests are written before implementation
 */

import {
  createTestIssuerSnapshot,
  createTestSensitiveSnapshot,
  createNullSensitiveSnapshot,
} from './helpers';
import type { IssuerSnapshot, SensitiveIssuerSnapshot } from '@/types/document';

// Mock storage services
jest.mock('@/storage/secureStorageService', () => ({
  getIssuerSnapshot: jest.fn(),
  getSensitiveIssuerInfo: jest.fn(),
}));

jest.mock('@/storage/asyncStorageService', () => ({
  getSettings: jest.fn(),
}));

import { getIssuerSnapshot, getSensitiveIssuerInfo } from '@/storage/secureStorageService';
import { getSettings } from '@/storage/asyncStorageService';
import { resolveIssuerInfo, hasIssuerSnapshotData } from '@/pdf/issuerResolverService';
import type { AppSettings } from '@/types/settings';

const mockGetIssuerSnapshot = getIssuerSnapshot as jest.MockedFunction<typeof getIssuerSnapshot>;
const mockGetSensitiveIssuerInfo = getSensitiveIssuerInfo as jest.MockedFunction<typeof getSensitiveIssuerInfo>;
const mockGetSettings = getSettings as jest.MockedFunction<typeof getSettings>;

describe('issuerResolverService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasIssuerSnapshotData', () => {
    it('returns true when companyName is present', () => {
      const snapshot: IssuerSnapshot = {
        companyName: 'テスト株式会社',
        representativeName: null,
        address: null,
        phone: null,
        fax: null,
        sealImageBase64: null,
        contactPerson: null,
        email: null,
      };
      expect(hasIssuerSnapshotData(snapshot)).toBe(true);
    });

    it('returns true when representativeName is present', () => {
      const snapshot: IssuerSnapshot = {
        companyName: null,
        representativeName: '山田太郎',
        address: null,
        phone: null,
        fax: null,
        sealImageBase64: null,
        contactPerson: null,
        email: null,
      };
      expect(hasIssuerSnapshotData(snapshot)).toBe(true);
    });

    it('returns true when address is present', () => {
      const snapshot: IssuerSnapshot = {
        companyName: null,
        representativeName: null,
        address: '東京都渋谷区',
        phone: null,
        fax: null,
        sealImageBase64: null,
        contactPerson: null,
        email: null,
      };
      expect(hasIssuerSnapshotData(snapshot)).toBe(true);
    });

    it('returns true when phone is present', () => {
      const snapshot: IssuerSnapshot = {
        companyName: null,
        representativeName: null,
        address: null,
        phone: '03-1234-5678',
        fax: null,
        sealImageBase64: null,
        contactPerson: null,
        email: null,
      };
      expect(hasIssuerSnapshotData(snapshot)).toBe(true);
    });

    it('returns true when fax is present', () => {
      const snapshot: IssuerSnapshot = {
        companyName: null,
        representativeName: null,
        address: null,
        phone: null,
        fax: '03-9876-5432',
        sealImageBase64: null,
        contactPerson: null,
        email: null,
      };
      expect(hasIssuerSnapshotData(snapshot)).toBe(true);
    });

    it('returns true when email is present', () => {
      const snapshot: IssuerSnapshot = {
        companyName: null,
        representativeName: null,
        address: null,
        phone: null,
        fax: null,
        sealImageBase64: null,
        contactPerson: null,
        email: 'test@example.com',
      };
      expect(hasIssuerSnapshotData(snapshot)).toBe(true);
    });

    it('returns false when all fields are null', () => {
      const snapshot: IssuerSnapshot = {
        companyName: null,
        representativeName: null,
        address: null,
        phone: null,
        fax: null,
        sealImageBase64: null,
        contactPerson: null,
        email: null,
      };
      expect(hasIssuerSnapshotData(snapshot)).toBe(false);
    });

    it('returns false when all fields are empty strings', () => {
      const snapshot: IssuerSnapshot = {
        companyName: '' as unknown as string | null,
        representativeName: '' as unknown as string | null,
        address: '' as unknown as string | null,
        phone: '' as unknown as string | null,
        fax: null,
        sealImageBase64: null,
        contactPerson: null,
        email: null,
      };
      expect(hasIssuerSnapshotData(snapshot)).toBe(false);
    });
  });

  describe('resolveIssuerInfo', () => {
    const documentId = 'test-doc-123';

    describe('when document snapshot has data', () => {
      const filledSnapshot = createTestIssuerSnapshot();
      const sensitivSnapshot = createTestSensitiveSnapshot();

      beforeEach(() => {
        mockGetIssuerSnapshot.mockResolvedValue({
          success: true,
          data: sensitivSnapshot,
        });
        // Mock getSettings for seal image loading fallback
        mockGetSettings.mockResolvedValue({
          success: true,
          data: {
            issuer: {
              companyName: null,
              representativeName: null,
              address: null,
              phone: null,
              fax: null,
              sealImageUri: null,
              contactPerson: null,
              showContactPerson: true,
              email: null,
            },
            numbering: {
              estimatePrefix: 'EST-',
              invoicePrefix: 'INV-',
              nextEstimateNumber: 1,
              nextInvoiceNumber: 1,
            },
            invoiceTemplateType: 'ACCOUNTING',
            sealSize: 'MEDIUM',
            backgroundDesign: 'NONE',
            backgroundImageUri: null,
            defaultEstimateTemplateId: 'FORMAL_STANDARD',
            defaultInvoiceTemplateId: 'ACCOUNTING',
            schemaVersion: 1,
          },
        });
      });

      it('returns snapshot data with source "snapshot"', async () => {
        const result = await resolveIssuerInfo(documentId, filledSnapshot);

        expect(result.source).toBe('snapshot');
        expect(result.issuerSnapshot).toEqual(filledSnapshot);
      });

      it('fetches sensitiveSnapshot from SecureStore using documentId', async () => {
        await resolveIssuerInfo(documentId, filledSnapshot);

        expect(mockGetIssuerSnapshot).toHaveBeenCalledWith(documentId);
        expect(mockGetIssuerSnapshot).toHaveBeenCalledTimes(1);
      });

      it('returns the fetched sensitiveSnapshot', async () => {
        const result = await resolveIssuerInfo(documentId, filledSnapshot);

        expect(result.sensitiveSnapshot).toEqual(sensitivSnapshot);
      });

      it('returns null sensitiveSnapshot when SecureStore returns null', async () => {
        mockGetIssuerSnapshot.mockResolvedValue({
          success: true,
          data: null,
        });

        const result = await resolveIssuerInfo(documentId, filledSnapshot);

        expect(result.sensitiveSnapshot).toBeNull();
        expect(result.source).toBe('snapshot');
      });

      it('returns null sensitiveSnapshot when SecureStore fails', async () => {
        mockGetIssuerSnapshot.mockResolvedValue({
          success: false,
          error: { code: 'READ_ERROR', message: 'Failed' },
        });

        const result = await resolveIssuerInfo(documentId, filledSnapshot);

        expect(result.sensitiveSnapshot).toBeNull();
        expect(result.source).toBe('snapshot');
      });
    });

    describe('when document snapshot has data but companyName is null', () => {
      const snapshotWithoutCompanyName: IssuerSnapshot = {
        companyName: null,
        representativeName: '山田太郎',
        address: '東京都渋谷区',
        phone: '03-1234-5678',
        fax: null,
        sealImageBase64: null,
        contactPerson: null,
        email: null,
      };

      const settingsWithCompanyName = {
        issuer: {
          companyName: '設定の会社名',
          representativeName: '設定の代表者',
          address: '設定の住所',
          phone: '設定の電話番号',
          fax: null,
          sealImageUri: null,
          contactPerson: null,
          showContactPerson: true,
          email: null,
        },
        numbering: {
          estimatePrefix: 'EST-',
          invoicePrefix: 'INV-',
          nextEstimateNumber: 1,
          nextInvoiceNumber: 1,
        },
        invoiceTemplateType: 'ACCOUNTING' as const,
        sealSize: 'MEDIUM' as const,
        backgroundDesign: 'NONE' as const,
        backgroundImageUri: null,
        defaultEstimateTemplateId: 'FORMAL_STANDARD' as const,
        defaultInvoiceTemplateId: 'ACCOUNTING' as const,
        schemaVersion: 1,
      };

      beforeEach(() => {
        mockGetIssuerSnapshot.mockResolvedValue({
          success: true,
          data: null,
        });
        mockGetSettings.mockResolvedValue({
          success: true,
          data: settingsWithCompanyName,
        });
      });

      it('fills companyName from settings when snapshot companyName is null', async () => {
        const result = await resolveIssuerInfo(documentId, snapshotWithoutCompanyName);

        expect(result.issuerSnapshot.companyName).toBe('設定の会社名');
        expect(result.source).toBe('snapshot');
      });

      it('preserves other snapshot fields while filling companyName', async () => {
        const result = await resolveIssuerInfo(documentId, snapshotWithoutCompanyName);

        expect(result.issuerSnapshot.representativeName).toBe('山田太郎');
        expect(result.issuerSnapshot.address).toBe('東京都渋谷区');
        expect(result.issuerSnapshot.phone).toBe('03-1234-5678');
      });

      it('keeps companyName as null when settings also have null companyName', async () => {
        mockGetSettings.mockResolvedValue({
          success: true,
          data: {
            ...settingsWithCompanyName,
            issuer: {
              ...settingsWithCompanyName.issuer,
              companyName: null,
            },
          },
        });

        const result = await resolveIssuerInfo(documentId, snapshotWithoutCompanyName);

        expect(result.issuerSnapshot.companyName).toBeNull();
      });

      it('fills companyName from settings when snapshot companyName is whitespace-only', async () => {
        const snapshotWithWhitespaceCompanyName: IssuerSnapshot = {
          companyName: '   ',
          representativeName: '山田太郎',
          address: '東京都渋谷区',
          phone: '03-1234-5678',
          fax: null,
          sealImageBase64: null,
          contactPerson: null,
          email: null,
        };

        const result = await resolveIssuerInfo(documentId, snapshotWithWhitespaceCompanyName);

        expect(result.issuerSnapshot.companyName).toBe('設定の会社名');
        expect(result.source).toBe('snapshot');
      });
    });

    describe('when document snapshot has only email (should use snapshot path)', () => {
      const emailOnlySnapshot: IssuerSnapshot = {
        companyName: null,
        representativeName: null,
        address: null,
        phone: null,
        fax: null,
        sealImageBase64: null,
        contactPerson: null,
        email: 'snapshot@example.com',
      };

      beforeEach(() => {
        mockGetIssuerSnapshot.mockResolvedValue({
          success: true,
          data: null,
        });
        mockGetSettings.mockResolvedValue({
          success: true,
          data: {
            issuer: {
              companyName: '設定の会社名',
              representativeName: null,
              address: null,
              phone: null,
              fax: null,
              sealImageUri: null,
              contactPerson: null,
              showContactPerson: true,
              email: 'settings@example.com',
            },
            numbering: {
              estimatePrefix: 'EST-',
              invoicePrefix: 'INV-',
              nextEstimateNumber: 1,
              nextInvoiceNumber: 1,
            },
            invoiceTemplateType: 'ACCOUNTING' as const,
            sealSize: 'MEDIUM' as const,
            backgroundDesign: 'NONE' as const,
            backgroundImageUri: null,
            defaultEstimateTemplateId: 'FORMAL_STANDARD' as const,
            defaultInvoiceTemplateId: 'ACCOUNTING' as const,
                schemaVersion: 1,
          },
        });
      });

      it('uses snapshot path (not settings fallback) when only email is set', async () => {
        const result = await resolveIssuerInfo(documentId, emailOnlySnapshot);

        expect(result.source).toBe('snapshot');
        expect(result.issuerSnapshot.email).toBe('snapshot@example.com');
      });

      it('preserves snapshot email even though settings have different email', async () => {
        const result = await resolveIssuerInfo(documentId, emailOnlySnapshot);

        expect(result.issuerSnapshot.email).toBe('snapshot@example.com');
        expect(result.issuerSnapshot.email).not.toBe('settings@example.com');
      });
    });

    describe('when document snapshot is all null (fallback to settings)', () => {
      const emptySnapshot: IssuerSnapshot = {
        companyName: null,
        representativeName: null,
        address: null,
        phone: null,
        fax: null,
        sealImageBase64: null,
        contactPerson: null,
        email: null,
      };

      const settingsIssuer = {
        companyName: '設定の会社名',
        representativeName: '設定の代表者',
        address: '設定の住所',
        phone: '設定の電話番号',
        fax: null,
        sealImageUri: null,
        contactPerson: null,
        showContactPerson: true,
        email: null,
      };

      const mockAppSettings: AppSettings = {
        issuer: settingsIssuer,
        numbering: {
          estimatePrefix: 'EST-',
          invoicePrefix: 'INV-',
          nextEstimateNumber: 1,
          nextInvoiceNumber: 1,
        },
        invoiceTemplateType: 'ACCOUNTING' as const,
        sealSize: 'MEDIUM' as const,
        backgroundDesign: 'NONE' as const,
        backgroundImageUri: null,
        defaultEstimateTemplateId: 'FORMAL_STANDARD' as const,
        defaultInvoiceTemplateId: 'ACCOUNTING' as const,
        schemaVersion: 1,
      };

      const settingsSensitive = {
        invoiceNumber: 'T1234567890123',
        bankAccount: {
          bankName: '設定の銀行',
          branchName: '設定の支店',
          accountType: '普通' as const,
          accountNumber: '1234567',
          accountHolderName: '設定の口座名義',
        },
      };

      beforeEach(() => {
        mockGetSettings.mockResolvedValue({
          success: true,
          data: mockAppSettings,
        });
        // Default: no document-specific snapshot exists
        mockGetIssuerSnapshot.mockResolvedValue({
          success: true,
          data: null,
        });
        mockGetSensitiveIssuerInfo.mockResolvedValue({
          success: true,
          data: settingsSensitive,
        });
      });

      it('returns settings data with source "settings"', async () => {
        const result = await resolveIssuerInfo(documentId, emptySnapshot);

        expect(result.source).toBe('settings');
        // Result should convert settings to IssuerSnapshot format (sealImageUri -> sealImageBase64)
        expect(result.issuerSnapshot).toEqual({
          companyName: settingsIssuer.companyName,
          representativeName: settingsIssuer.representativeName,
          address: settingsIssuer.address,
          phone: settingsIssuer.phone,
          fax: null,
          sealImageBase64: null, // Mock returns null for seal image
          contactPerson: null, // showContactPerson is true but contactPerson is null in settings
          email: null,
        });
      });

      it('fetches issuer info from settings for non-sensitive data', async () => {
        await resolveIssuerInfo(documentId, emptySnapshot);

        expect(mockGetSettings).toHaveBeenCalledTimes(1);
        // Should also call getIssuerSnapshot for sensitive data
        expect(mockGetIssuerSnapshot).toHaveBeenCalledWith(documentId);
      });

      it('returns sensitiveSnapshot from current settings when no doc-specific snapshot exists', async () => {
        // Ensure no document-specific snapshot exists
        mockGetIssuerSnapshot.mockResolvedValue({
          success: true,
          data: null,
        });

        const result = await resolveIssuerInfo(documentId, emptySnapshot);

        expect(result.sensitiveSnapshot).toEqual({
          invoiceNumber: settingsSensitive.invoiceNumber,
          bankName: settingsSensitive.bankAccount.bankName,
          branchName: settingsSensitive.bankAccount.branchName,
          accountType: settingsSensitive.bankAccount.accountType,
          accountNumber: settingsSensitive.bankAccount.accountNumber,
          accountHolderName: settingsSensitive.bankAccount.accountHolderName,
        });
      });

      it('fetches sensitiveSnapshot from getSensitiveIssuerInfo when no doc-specific snapshot', async () => {
        mockGetIssuerSnapshot.mockResolvedValue({
          success: true,
          data: null,
        });

        await resolveIssuerInfo(documentId, emptySnapshot);

        expect(mockGetSensitiveIssuerInfo).toHaveBeenCalledTimes(1);
      });
    });

    describe('when issuerSnapshot is empty but document has sensitive snapshot', () => {
      const emptySnapshot: IssuerSnapshot = {
        companyName: null,
        representativeName: null,
        address: null,
        phone: null,
        fax: null,
        sealImageBase64: null,
        contactPerson: null,
        email: null,
      };

      const docSensitiveSnapshot: SensitiveIssuerSnapshot = {
        invoiceNumber: 'T9999999999999',
        bankName: '文書固有銀行',
        branchName: '文書固有支店',
        accountType: '当座',
        accountNumber: '7654321',
        accountHolderName: '文書固有名義',
      };

      const settingsSensitive = {
        invoiceNumber: 'T1234567890123',
        bankAccount: {
          bankName: '設定の銀行',
          branchName: '設定の支店',
          accountType: '普通' as const,
          accountNumber: '1234567',
          accountHolderName: '設定の口座名義',
        },
      };

      beforeEach(() => {
        mockGetSettings.mockResolvedValue({
          success: true,
          data: {
            issuer: {
              companyName: '設定の会社名',
              representativeName: null,
              address: null,
              phone: null,
              fax: null,
              sealImageUri: null,
              contactPerson: null,
              showContactPerson: true,
              email: null,
            },
            numbering: {
              estimatePrefix: 'EST-',
              invoicePrefix: 'INV-',
              nextEstimateNumber: 1,
              nextInvoiceNumber: 1,
            },
            invoiceTemplateType: 'ACCOUNTING',
            sealSize: 'MEDIUM',
            backgroundDesign: 'NONE',
            backgroundImageUri: null,
            defaultEstimateTemplateId: 'FORMAL_STANDARD',
            defaultInvoiceTemplateId: 'ACCOUNTING',
            schemaVersion: 1,
          },
        });
        // Document has its own sensitive snapshot
        mockGetIssuerSnapshot.mockResolvedValue({
          success: true,
          data: docSensitiveSnapshot,
        });
        mockGetSensitiveIssuerInfo.mockResolvedValue({
          success: true,
          data: settingsSensitive,
        });
      });

      it('uses document-specific sensitive snapshot instead of current settings', async () => {
        const result = await resolveIssuerInfo(documentId, emptySnapshot);

        expect(result.sensitiveSnapshot).toEqual(docSensitiveSnapshot);
      });

      it('uses settings for non-sensitive issuer data', async () => {
        const result = await resolveIssuerInfo(documentId, emptySnapshot);

        expect(result.issuerSnapshot.companyName).toBe('設定の会社名');
        expect(result.source).toBe('settings');
      });

      it('prioritizes document snapshot over global settings for sensitive data', async () => {
        const result = await resolveIssuerInfo(documentId, emptySnapshot);

        // Should use document-specific values, not global settings
        expect(result.sensitiveSnapshot?.invoiceNumber).toBe('T9999999999999');
        expect(result.sensitiveSnapshot?.bankName).toBe('文書固有銀行');
      });
    });

    describe('when both snapshot and settings are empty', () => {
      const emptySnapshot: IssuerSnapshot = {
        companyName: null,
        representativeName: null,
        address: null,
        phone: null,
        fax: null,
        sealImageBase64: null,
        contactPerson: null,
        email: null,
      };

      const emptySettings: AppSettings = {
        issuer: {
          companyName: null,
          representativeName: null,
          address: null,
          phone: null,
          fax: null,
          sealImageUri: null,
          contactPerson: null,
          showContactPerson: true,
          email: null,
        },
        numbering: {
          estimatePrefix: 'EST-',
          invoicePrefix: 'INV-',
          nextEstimateNumber: 1,
          nextInvoiceNumber: 1,
        },
        invoiceTemplateType: 'ACCOUNTING' as const,
        sealSize: 'MEDIUM' as const,
        backgroundDesign: 'NONE' as const,
        backgroundImageUri: null,
        defaultEstimateTemplateId: 'FORMAL_STANDARD' as const,
        defaultInvoiceTemplateId: 'ACCOUNTING' as const,
        schemaVersion: 1,
      };

      beforeEach(() => {
        mockGetSettings.mockResolvedValue({
          success: true,
          data: emptySettings,
        });
        mockGetIssuerSnapshot.mockResolvedValue({
          success: true,
          data: null,
        });
        mockGetSensitiveIssuerInfo.mockResolvedValue({
          success: true,
          data: null,
        });
      });

      it('returns all-null issuerSnapshot gracefully', async () => {
        const result = await resolveIssuerInfo(documentId, emptySnapshot);

        expect(result.issuerSnapshot).toEqual({
          companyName: null,
          representativeName: null,
          address: null,
          phone: null,
          fax: null,
          sealImageBase64: null,
          contactPerson: null,
          email: null,
        });
      });

      it('returns null sensitiveSnapshot', async () => {
        const result = await resolveIssuerInfo(documentId, emptySnapshot);

        expect(result.sensitiveSnapshot).toBeNull();
      });

      it('returns source as "settings" since it tried fallback', async () => {
        const result = await resolveIssuerInfo(documentId, emptySnapshot);

        expect(result.source).toBe('settings');
      });
    });

    describe('error handling', () => {
      const emptySnapshot: IssuerSnapshot = {
        companyName: null,
        representativeName: null,
        address: null,
        phone: null,
        fax: null,
        sealImageBase64: null,
        contactPerson: null,
        email: null,
      };

      it('returns empty data when getSettings fails', async () => {
        mockGetSettings.mockResolvedValue({
          success: false,
          error: { code: 'READ_ERROR', message: 'Failed' },
        });
        mockGetIssuerSnapshot.mockResolvedValue({
          success: true,
          data: null,
        });
        mockGetSensitiveIssuerInfo.mockResolvedValue({
          success: true,
          data: null,
        });

        const result = await resolveIssuerInfo(documentId, emptySnapshot);

        expect(result.issuerSnapshot).toEqual({
          companyName: null,
          representativeName: null,
          address: null,
          phone: null,
          fax: null,
          sealImageBase64: null,
          contactPerson: null,
          email: null,
        });
        expect(result.source).toBe('settings');
      });

      it('returns null sensitiveSnapshot when both getIssuerSnapshot and getSensitiveIssuerInfo fail', async () => {
        mockGetSettings.mockResolvedValue({
          success: true,
          data: {
            issuer: {
              companyName: 'テスト',
              representativeName: null,
              address: null,
              phone: null,
              fax: null,
              sealImageUri: null,
              contactPerson: null,
              showContactPerson: true,
              email: null,
            },
            numbering: {
              estimatePrefix: 'EST-',
              invoicePrefix: 'INV-',
              nextEstimateNumber: 1,
              nextInvoiceNumber: 1,
            },
            invoiceTemplateType: 'ACCOUNTING',
            sealSize: 'MEDIUM',
            backgroundDesign: 'NONE',
            backgroundImageUri: null,
            defaultEstimateTemplateId: 'FORMAL_STANDARD',
            defaultInvoiceTemplateId: 'ACCOUNTING',
            schemaVersion: 1,
          },
        });
        mockGetIssuerSnapshot.mockResolvedValue({
          success: false,
          error: { code: 'READ_ERROR', message: 'Failed' },
        });
        mockGetSensitiveIssuerInfo.mockResolvedValue({
          success: false,
          error: { code: 'READ_ERROR', message: 'Failed' },
        });

        const result = await resolveIssuerInfo(documentId, emptySnapshot);

        expect(result.sensitiveSnapshot).toBeNull();
      });

      it('uses global settings when doc-specific snapshot fails but global succeeds', async () => {
        const globalSensitive = {
          invoiceNumber: 'T1111111111111',
          bankAccount: {
            bankName: 'グローバル銀行',
            branchName: 'グローバル支店',
            accountType: '普通' as const,
            accountNumber: '1111111',
            accountHolderName: 'グローバル名義',
          },
        };

        mockGetSettings.mockResolvedValue({
          success: true,
          data: {
            issuer: {
              companyName: 'テスト',
              representativeName: null,
              address: null,
              phone: null,
              fax: null,
              sealImageUri: null,
              contactPerson: null,
              showContactPerson: true,
              email: null,
            },
            numbering: {
              estimatePrefix: 'EST-',
              invoicePrefix: 'INV-',
              nextEstimateNumber: 1,
              nextInvoiceNumber: 1,
            },
            invoiceTemplateType: 'ACCOUNTING',
            sealSize: 'MEDIUM',
            backgroundDesign: 'NONE',
            backgroundImageUri: null,
            defaultEstimateTemplateId: 'FORMAL_STANDARD',
            defaultInvoiceTemplateId: 'ACCOUNTING',
            schemaVersion: 1,
          },
        });
        mockGetIssuerSnapshot.mockResolvedValue({
          success: false,
          error: { code: 'READ_ERROR', message: 'Failed' },
        });
        mockGetSensitiveIssuerInfo.mockResolvedValue({
          success: true,
          data: globalSensitive,
        });

        const result = await resolveIssuerInfo(documentId, emptySnapshot);

        expect(result.sensitiveSnapshot?.invoiceNumber).toBe('T1111111111111');
        expect(result.sensitiveSnapshot?.bankName).toBe('グローバル銀行');
      });
    });
  });
});
