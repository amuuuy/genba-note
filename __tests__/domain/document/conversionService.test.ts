/**
 * Tests for conversionService.ts
 * TDD: Tests are written first, implementation follows
 *
 * Test coverage for SPEC 2.1.6 conversion rules:
 * - Document ID: New UUID generated
 * - Document number: New invoice number auto-generated
 * - Type: estimate -> invoice
 * - Issue date: Set to conversion date
 * - validUntil: Removed (set to null)
 * - dueDate: Empty (null, manual input)
 * - Status: draft
 * - Client info: Copied from estimate
 * - Line items: Copied with new IDs
 * - Notes: Copied from estimate
 * - Issuer snapshot: Re-fetched from current settings
 * - Sensitive snapshot: Re-fetched from current settings
 */

// Mock expo-secure-store FIRST before any imports
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock storage services
jest.mock('@/storage/asyncStorageService');
jest.mock('@/storage/secureStorageService');
jest.mock('@/domain/document/autoNumberingService');
import { convertEstimateToInvoice } from '@/domain/document/conversionService';
import * as asyncStorageService from '@/storage/asyncStorageService';
import * as secureStorageService from '@/storage/secureStorageService';
import * as autoNumberingService from '@/domain/document/autoNumberingService';
import { DEFAULT_APP_SETTINGS } from '@/types/settings';
import { FREE_DOCUMENT_LIMIT } from '@/subscription/freeTierLimitsService';
import {
  createTestDocument,
  createTestInvoice,
  createTestLineItem,
  createTestIssuerSnapshot,
} from './helpers';

const mockedAsyncStorage = jest.mocked(asyncStorageService);
const mockedSecureStorage = jest.mocked(secureStorageService);
const mockedNumbering = jest.mocked(autoNumberingService);

describe('conversionService', () => {
  const TODAY = '2026-01-30';

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAsyncStorage.getReadOnlyMode.mockReturnValue(false);
    // Default: no existing documents (allows creation for free users)
    mockedAsyncStorage.getAllDocuments.mockResolvedValue({ success: true, data: [] });
  });

  describe('convertEstimateToInvoice', () => {
    // === Happy Path Tests ===

    describe('successful conversion', () => {
      beforeEach(() => {
        mockedNumbering.generateDocumentNumber.mockResolvedValue({
          success: true,
          data: 'INV-001',
        });
        mockedAsyncStorage.getSettings.mockResolvedValue({
          success: true,
          data: DEFAULT_APP_SETTINGS,
        });
        mockedSecureStorage.getSensitiveIssuerInfo.mockResolvedValue({
          success: true,
          data: null,
        });
        mockedAsyncStorage.saveDocument.mockImplementation(async (doc) => ({
          success: true,
          data: doc,
        }));
        mockedSecureStorage.saveIssuerSnapshot.mockResolvedValue({
          success: true,
        });
      });

      it('should create new invoice with new UUID', async () => {
        const estimate = createTestDocument({
          id: 'estimate-id-123',
          type: 'estimate',
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice('estimate-id-123', { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.id).not.toBe('estimate-id-123');
        expect(result.data?.invoice.id).toBeDefined();
        expect(result.data?.invoice.id.length).toBeGreaterThan(0);
      });

      it('should generate new invoice document number', async () => {
        const estimate = createTestDocument({ type: 'estimate', documentNo: 'EST-001' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.documentNo).toBe('INV-001');
        expect(result.data?.invoice.documentNo).not.toBe('EST-001');
      });

      it('should change type from estimate to invoice', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.type).toBe('invoice');
      });

      it('should set issueDate to conversion date', async () => {
        const estimate = createTestDocument({
          type: 'estimate',
          issueDate: '2025-12-01', // Old date
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.issueDate).toBe(TODAY); // '2026-01-30'
      });

      it('should remove validUntil (set to null)', async () => {
        const estimate = createTestDocument({
          type: 'estimate',
          validUntil: '2026-03-01',
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.validUntil).toBeNull();
      });

      it('should set dueDate to null (for manual input)', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.dueDate).toBeNull();
      });

      it('should set status to draft', async () => {
        const estimate = createTestDocument({
          type: 'estimate',
          status: 'sent', // Even if estimate was sent
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.status).toBe('draft');
      });

      it('should set paidAt to null', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.paidAt).toBeNull();
      });

      it('should copy clientName from estimate', async () => {
        const estimate = createTestDocument({
          type: 'estimate',
          clientName: 'ABC Construction Co.',
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.clientName).toBe('ABC Construction Co.');
      });

      it('should copy clientAddress from estimate', async () => {
        const estimate = createTestDocument({
          type: 'estimate',
          clientAddress: '123 Main Street, Tokyo',
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.clientAddress).toBe('123 Main Street, Tokyo');
      });

      it('should copy subject from estimate', async () => {
        const estimate = createTestDocument({
          type: 'estimate',
          subject: 'Exterior Painting Project',
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.subject).toBe('Exterior Painting Project');
      });

      it('should copy notes from estimate', async () => {
        const estimate = createTestDocument({
          type: 'estimate',
          notes: 'Payment due within 30 days',
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.notes).toBe('Payment due within 30 days');
      });

      it('should copy lineItems content but regenerate IDs', async () => {
        const lineItem1 = createTestLineItem({
          id: 'old-line-1',
          name: 'Exterior Wall Painting',
          quantityMilli: 100000, // 100 m2
          unit: 'm²',
          unitPrice: 3000,
          taxRate: 10,
        });
        const lineItem2 = createTestLineItem({
          id: 'old-line-2',
          name: 'Scaffolding',
          quantityMilli: 1000,
          unit: '式',
          unitPrice: 50000,
          taxRate: 10,
        });
        const estimate = createTestDocument({
          type: 'estimate',
          lineItems: [lineItem1, lineItem2],
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        const invoice = result.data!.invoice;

        // Same content
        expect(invoice.lineItems).toHaveLength(2);
        expect(invoice.lineItems[0].name).toBe('Exterior Wall Painting');
        expect(invoice.lineItems[0].quantityMilli).toBe(100000);
        expect(invoice.lineItems[0].unit).toBe('m²');
        expect(invoice.lineItems[0].unitPrice).toBe(3000);
        expect(invoice.lineItems[0].taxRate).toBe(10);

        expect(invoice.lineItems[1].name).toBe('Scaffolding');

        // New IDs
        expect(invoice.lineItems[0].id).not.toBe('old-line-1');
        expect(invoice.lineItems[1].id).not.toBe('old-line-2');
        expect(invoice.lineItems[0].id).toBeDefined();
        expect(invoice.lineItems[1].id).toBeDefined();
      });

      it('should re-fetch issuerSnapshot from current settings (not copy from estimate)', async () => {
        // Estimate has old issuer info
        const estimate = createTestDocument({
          type: 'estimate',
          issuerSnapshot: createTestIssuerSnapshot({
            companyName: 'Old Company Name',
            address: 'Old Address',
          }),
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        // Current settings have new issuer info
        mockedAsyncStorage.getSettings.mockResolvedValue({
          success: true,
          data: {
            ...DEFAULT_APP_SETTINGS,
            issuer: {
              companyName: 'New Company Name',
              representativeName: 'New Representative',
              address: 'New Address',
              phone: '090-1234-5678',
              fax: null,
              sealImageUri: null,
              contactPerson: null,
              showContactPerson: true,
              email: null,
            },
          },
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        // Invoice should have NEW issuer info from current settings
        expect(result.data?.invoice.issuerSnapshot.companyName).toBe('New Company Name');
        expect(result.data?.invoice.issuerSnapshot.address).toBe('New Address');
        expect(result.data?.invoice.issuerSnapshot.representativeName).toBe('New Representative');
        expect(result.data?.invoice.issuerSnapshot.phone).toBe('090-1234-5678');
      });

      it('should save sensitive issuer snapshot for the new invoice', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        // Sensitive info from current settings
        mockedSecureStorage.getSensitiveIssuerInfo.mockResolvedValue({
          success: true,
          data: {
            invoiceNumber: 'T1234567890123',
            bankAccount: {
              bankName: 'Test Bank',
              branchName: 'Test Branch',
              accountType: '普通',
              accountNumber: '1234567',
              accountHolderName: 'Test Holder',
            },
          },
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        expect(mockedSecureStorage.saveIssuerSnapshot).toHaveBeenCalledWith(
          result.data!.invoice.id,
          expect.objectContaining({
            invoiceNumber: 'T1234567890123',
            bankName: 'Test Bank',
            branchName: 'Test Branch',
            accountType: '普通',
            accountNumber: '1234567',
            accountHolderName: 'Test Holder',
          })
        );
      });

      it('should return both the new invoice and the original estimate', async () => {
        const estimate = createTestDocument({
          id: 'estimate-id',
          type: 'estimate',
          documentNo: 'EST-001',
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice('estimate-id', { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        expect(result.data?.originalEstimate.id).toBe('estimate-id');
        expect(result.data?.originalEstimate.documentNo).toBe('EST-001');
        expect(result.data?.originalEstimate.type).toBe('estimate');
      });

      it('should preserve estimate (not modify it)', async () => {
        const originalEstimate = createTestDocument({
          id: 'estimate-id',
          type: 'estimate',
          status: 'sent',
          documentNo: 'EST-001',
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: originalEstimate,
        });

        const result = await convertEstimateToInvoice('estimate-id', { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        // Original estimate should be unchanged
        expect(result.data?.originalEstimate.type).toBe('estimate');
        expect(result.data?.originalEstimate.status).toBe('sent');
        expect(result.data?.originalEstimate.documentNo).toBe('EST-001');

        // saveDocument should only be called once (for the new invoice)
        expect(mockedAsyncStorage.saveDocument).toHaveBeenCalledTimes(1);
      });

      it('should set new createdAt and updatedAt timestamps', async () => {
        const oldTimestamp = Date.now() - 86400000; // 1 day ago
        const estimate = createTestDocument({
          type: 'estimate',
          createdAt: oldTimestamp,
          updatedAt: oldTimestamp,
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const beforeConversion = Date.now();
        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });
        const afterConversion = Date.now();

        expect(result.success).toBe(true);
        expect(result.data?.invoice.createdAt).toBeGreaterThanOrEqual(beforeConversion);
        expect(result.data?.invoice.createdAt).toBeLessThanOrEqual(afterConversion);
        expect(result.data?.invoice.updatedAt).toBeGreaterThanOrEqual(beforeConversion);
        expect(result.data?.invoice.updatedAt).toBeLessThanOrEqual(afterConversion);
      });
    });

    // === Error Cases ===

    describe('error handling', () => {
      it('should return DOCUMENT_NOT_FOUND when document does not exist', async () => {
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: null,
        });

        const result = await convertEstimateToInvoice('non-existent-id', { today: TODAY, isPro: true });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('DOCUMENT_NOT_FOUND');
      });

      it('should return VALIDATION_ERROR when document is an invoice', async () => {
        const invoice = createTestInvoice({ id: 'invoice-id', type: 'invoice' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: invoice,
        });

        const result = await convertEstimateToInvoice('invoice-id', { today: TODAY, isPro: true });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('VALIDATION_ERROR');
        expect(result.error?.message).toContain('invoice');
      });

      it('should return STORAGE_ERROR when getDocumentById fails', async () => {
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: false,
          error: { code: 'READ_ERROR', message: 'Storage failure' },
        });

        const result = await convertEstimateToInvoice('some-id', { today: TODAY, isPro: true });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('STORAGE_ERROR');
      });

      it('should return NUMBERING_ERROR when generateDocumentNumber fails', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });
        mockedNumbering.generateDocumentNumber.mockResolvedValue({
          success: false,
          error: { code: 'SETTINGS_READ_ERROR', message: 'Cannot read settings' },
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('NUMBERING_ERROR');
      });

      it('should return STORAGE_ERROR when saveDocument fails', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });
        mockedNumbering.generateDocumentNumber.mockResolvedValue({
          success: true,
          data: 'INV-001',
        });
        mockedAsyncStorage.getSettings.mockResolvedValue({
          success: true,
          data: DEFAULT_APP_SETTINGS,
        });
        mockedSecureStorage.getSensitiveIssuerInfo.mockResolvedValue({
          success: true,
          data: null,
        });
        mockedAsyncStorage.saveDocument.mockResolvedValue({
          success: false,
          error: { code: 'WRITE_ERROR', message: 'Storage full' },
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('STORAGE_ERROR');
      });

      it('should succeed even if saveIssuerSnapshot fails (non-fatal)', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });
        mockedNumbering.generateDocumentNumber.mockResolvedValue({
          success: true,
          data: 'INV-001',
        });
        mockedAsyncStorage.getSettings.mockResolvedValue({
          success: true,
          data: DEFAULT_APP_SETTINGS,
        });
        mockedSecureStorage.getSensitiveIssuerInfo.mockResolvedValue({
          success: true,
          data: null,
        });
        mockedAsyncStorage.saveDocument.mockImplementation(async (doc) => ({
          success: true,
          data: doc,
        }));
        mockedSecureStorage.saveIssuerSnapshot.mockResolvedValue({
          success: false,
          error: { code: 'WRITE_ERROR', message: 'Secure store failure' },
        });

        // Conversion should still succeed
        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        expect(result.data?.invoice).toBeDefined();
      });
    });

    // === Edge Cases ===

    describe('edge cases', () => {
      beforeEach(() => {
        mockedNumbering.generateDocumentNumber.mockResolvedValue({
          success: true,
          data: 'INV-001',
        });
        mockedAsyncStorage.getSettings.mockResolvedValue({
          success: true,
          data: DEFAULT_APP_SETTINGS,
        });
        mockedSecureStorage.getSensitiveIssuerInfo.mockResolvedValue({
          success: true,
          data: null,
        });
        mockedAsyncStorage.saveDocument.mockImplementation(async (doc) => ({
          success: true,
          data: doc,
        }));
        mockedSecureStorage.saveIssuerSnapshot.mockResolvedValue({
          success: true,
        });
      });

      it('should handle estimate with null optional fields', async () => {
        const estimate = createTestDocument({
          type: 'estimate',
          clientAddress: null,
          subject: null,
          validUntil: null,
          notes: null,
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.clientAddress).toBeNull();
        expect(result.data?.invoice.subject).toBeNull();
        expect(result.data?.invoice.notes).toBeNull();
      });

      it('should handle estimate with empty settings (null issuer info)', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });
        mockedAsyncStorage.getSettings.mockResolvedValue({
          success: false, // Settings read fails
          error: { code: 'READ_ERROR', message: 'No settings' },
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        // Should use default empty issuer snapshot
        expect(result.data?.invoice.issuerSnapshot.companyName).toBeNull();
        expect(result.data?.invoice.issuerSnapshot.address).toBeNull();
      });

      it('should handle estimate with many line items', async () => {
        const lineItems = Array.from({ length: 50 }, (_, i) =>
          createTestLineItem({
            id: `old-line-${i}`,
            name: `Item ${i + 1}`,
          })
        );
        const estimate = createTestDocument({
          type: 'estimate',
          lineItems,
        });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const result = await convertEstimateToInvoice(estimate.id, { today: TODAY, isPro: true });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.lineItems).toHaveLength(50);
        // All IDs should be different
        const oldIds = new Set(lineItems.map((li) => li.id));
        const invoiceLineItems = result.data?.invoice.lineItems ?? [];
        const newIds = new Set(invoiceLineItems.map((li) => li.id));
        // No overlap between old and new IDs
        for (const newId of Array.from(newIds)) {
          expect(oldIds.has(newId)).toBe(false);
        }
      });

      it('should use provided today parameter for issueDate', async () => {
        const estimate = createTestDocument({ type: 'estimate' });
        mockedAsyncStorage.getDocumentById.mockResolvedValue({
          success: true,
          data: estimate,
        });

        const customToday = '2026-06-15';
        const result = await convertEstimateToInvoice(estimate.id, { today: customToday, isPro: true });

        expect(result.success).toBe(true);
        expect(result.data?.invoice.issueDate).toBe('2026-06-15');
      });
    });

    // === Free Tier Limit Tests ===

    describe('free tier limits', () => {
      const estimate = createTestDocument({ id: 'est-for-limit', type: 'estimate' });

      beforeEach(() => {
        mockedAsyncStorage.getDocumentById.mockResolvedValue({ success: true, data: estimate });
        mockedNumbering.generateDocumentNumber.mockResolvedValue({ success: true, data: 'INV-001' });
        mockedAsyncStorage.getSettings.mockResolvedValue({ success: true, data: DEFAULT_APP_SETTINGS });
        mockedSecureStorage.getSensitiveIssuerInfo.mockResolvedValue({ success: true, data: null });
        mockedAsyncStorage.saveDocument.mockImplementation(async (doc) => ({ success: true, data: doc }));
        mockedSecureStorage.saveIssuerSnapshot.mockResolvedValue({ success: true });
      });

      it('should reject when active document count reaches limit (isPro=false)', async () => {
        mockedAsyncStorage.getAllDocuments.mockResolvedValue({
          success: true,
          data: Array(FREE_DOCUMENT_LIMIT).fill(null).map(() => createTestDocument()),
        });
        const result = await convertEstimateToInvoice('est-for-limit', { today: TODAY, isPro: false });
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('FREE_TIER_LIMIT_EXCEEDED');
        expect(mockedAsyncStorage.getDocumentById).not.toHaveBeenCalled();
      });

      it('should reject when document list read fails for free user (fail-closed)', async () => {
        mockedAsyncStorage.getAllDocuments.mockResolvedValue({
          success: false,
          error: { code: 'READ_ERROR' as const, message: 'err' },
        });
        const result = await convertEstimateToInvoice('est-for-limit', { today: TODAY, isPro: false });
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('FREE_TIER_LIMIT_EXCEEDED');
      });

      it('should allow when document list read fails for Pro user (fail-open)', async () => {
        mockedAsyncStorage.getAllDocuments.mockResolvedValue({
          success: false,
          error: { code: 'READ_ERROR' as const, message: 'err' },
        });
        const result = await convertEstimateToInvoice('est-for-limit', { today: TODAY, isPro: true });
        expect(result.success).toBe(true);
      });

      it('should allow for Pro user regardless of count', async () => {
        mockedAsyncStorage.getAllDocuments.mockResolvedValue({
          success: true,
          data: Array(100).fill(null).map(() => createTestDocument()),
        });
        const result = await convertEstimateToInvoice('est-for-limit', { today: TODAY, isPro: true });
        expect(result.success).toBe(true);
      });

      it('should treat undefined isPro as free-tier (fail-closed default)', async () => {
        mockedAsyncStorage.getAllDocuments.mockResolvedValue({
          success: true,
          data: Array(FREE_DOCUMENT_LIMIT).fill(null).map(() => createTestDocument()),
        });
        const result = await convertEstimateToInvoice('est-for-limit', { today: TODAY });
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('FREE_TIER_LIMIT_EXCEEDED');
      });
    });
  });
});
