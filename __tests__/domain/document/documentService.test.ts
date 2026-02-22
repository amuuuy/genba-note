/**
 * Tests for documentService.ts
 * TDD: Tests are written first, implementation follows
 */

// Mock expo-secure-store FIRST before any imports
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock AsyncStorage (required by modules)
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
import {
  createDocument,
  getDocument,
  listDocuments,
  updateDocument,
  changeDocumentStatus,
  deleteDocumentById,
  duplicateDocument,
} from '@/domain/document/documentService';
import * as asyncStorageService from '@/storage/asyncStorageService';
import * as secureStorageService from '@/storage/secureStorageService';
import * as autoNumberingService from '@/domain/document/autoNumberingService';
import { DEFAULT_APP_SETTINGS } from '@/types/settings';
import { FREE_DOCUMENT_LIMIT } from '@/subscription/freeTierLimitsService';
import {
  createTestDocument,
  createTestInvoice,
  createTestLineItem,
} from './helpers';

const mockedAsyncStorage = jest.mocked(asyncStorageService);
const mockedSecureStorage = jest.mocked(secureStorageService);
const mockedNumbering = jest.mocked(autoNumberingService);

describe('documentService', () => {
  const TODAY = '2026-01-30';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset read-only mode
    mockedAsyncStorage.getReadOnlyMode.mockReturnValue(false);
    // Default: no existing documents (allows creation for free users)
    mockedAsyncStorage.getAllDocuments.mockResolvedValue({ success: true, data: [] });
  });

  describe('createDocument', () => {
    it('should create estimate with auto-generated number', async () => {
      mockedNumbering.generateDocumentNumber.mockResolvedValue({
        success: true,
        data: 'EST-001',
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

      const result = await createDocument(
        {
          type: 'estimate',
          clientName: 'Test Client',
          issueDate: '2026-01-30',
          lineItems: [{ name: 'Item 1', quantityMilli: 1000, unit: '式', unitPrice: 10000, taxRate: 10 }],
        },
        { today: TODAY, isPro: true }
      );

      expect(result.success).toBe(true);
      expect(result.data?.type).toBe('estimate');
      expect(result.data?.documentNo).toBe('EST-001');
      expect(result.data?.status).toBe('draft');
    });

    it('should create invoice with auto-generated number', async () => {
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

      const result = await createDocument(
        {
          type: 'invoice',
          clientName: 'Test Client',
          issueDate: '2026-01-30',
          lineItems: [{ name: 'Item 1', quantityMilli: 1000, unit: '式', unitPrice: 10000, taxRate: 10 }],
        },
        { today: TODAY, isPro: true }
      );

      expect(result.success).toBe(true);
      expect(result.data?.type).toBe('invoice');
      expect(result.data?.documentNo).toBe('INV-001');
    });

    it('should set initial status to draft', async () => {
      mockedNumbering.generateDocumentNumber.mockResolvedValue({
        success: true,
        data: 'EST-001',
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

      const result = await createDocument(
        {
          type: 'estimate',
          clientName: 'Test Client',
          issueDate: '2026-01-30',
          lineItems: [{ name: 'Item 1', quantityMilli: 1000, unit: '式', unitPrice: 10000, taxRate: 10 }],
        },
        { today: TODAY, isPro: true }
      );

      expect(result.data?.status).toBe('draft');
    });

    it('should generate UUID for document and line items', async () => {
      mockedNumbering.generateDocumentNumber.mockResolvedValue({
        success: true,
        data: 'EST-001',
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

      const result = await createDocument(
        {
          type: 'estimate',
          clientName: 'Test Client',
          issueDate: '2026-01-30',
          lineItems: [{ name: 'Item 1', quantityMilli: 1000, unit: '式', unitPrice: 10000, taxRate: 10 }],
        },
        { today: TODAY, isPro: true }
      );

      expect(result.data?.id).toBeDefined();
      expect(result.data?.id.length).toBeGreaterThan(0);
      expect(result.data?.lineItems[0].id).toBeDefined();
    });

    it('should capture issuer snapshot from settings', async () => {
      const settings = {
        ...DEFAULT_APP_SETTINGS,
        issuer: {
          companyName: 'Test Company',
          representativeName: 'Test Rep',
          address: 'Test Address',
          phone: '123-456-7890',
          fax: null,
          sealImageUri: null,
          contactPerson: null,
          showContactPerson: true,
          email: null,
        },
      };
      mockedNumbering.generateDocumentNumber.mockResolvedValue({
        success: true,
        data: 'EST-001',
      });
      mockedAsyncStorage.getSettings.mockResolvedValue({
        success: true,
        data: settings,
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

      const result = await createDocument(
        {
          type: 'estimate',
          clientName: 'Test Client',
          issueDate: '2026-01-30',
          lineItems: [{ name: 'Item 1', quantityMilli: 1000, unit: '式', unitPrice: 10000, taxRate: 10 }],
        },
        { today: TODAY, isPro: true }
      );

      expect(result.data?.issuerSnapshot.companyName).toBe('Test Company');
      expect(result.data?.issuerSnapshot.address).toBe('Test Address');
    });

    it('should return validation errors for invalid input', async () => {
      const result = await createDocument(
        {
          type: 'estimate',
          clientName: '', // Invalid: empty
          issueDate: '2026-01-30',
          lineItems: [{ name: 'Item 1', quantityMilli: 1000, unit: '式', unitPrice: 10000, taxRate: 10 }],
        },
        { today: TODAY, isPro: true }
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should reject estimate with dueDate', async () => {
      const result = await createDocument(
        {
          type: 'estimate',
          clientName: 'Test Client',
          issueDate: '2026-01-30',
          dueDate: '2026-02-28', // Invalid: estimate cannot have dueDate
          lineItems: [{ name: 'Item 1', quantityMilli: 1000, unit: '式', unitPrice: 10000, taxRate: 10 }],
        },
        { today: TODAY, isPro: true }
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('dueDate');
    });

    it('should reject invoice with validUntil', async () => {
      const result = await createDocument(
        {
          type: 'invoice',
          clientName: 'Test Client',
          issueDate: '2026-01-30',
          validUntil: '2026-02-28', // Invalid: invoice cannot have validUntil
          lineItems: [{ name: 'Item 1', quantityMilli: 1000, unit: '式', unitPrice: 10000, taxRate: 10 }],
        },
        { today: TODAY, isPro: true }
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('validUntil');
    });

    it('should return error on storage failure', async () => {
      mockedNumbering.generateDocumentNumber.mockResolvedValue({
        success: true,
        data: 'EST-001',
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
        error: { code: 'WRITE_ERROR', message: 'Failed to save' },
      });

      const result = await createDocument(
        {
          type: 'estimate',
          clientName: 'Test Client',
          issueDate: '2026-01-30',
          lineItems: [{ name: 'Item 1', quantityMilli: 1000, unit: '式', unitPrice: 10000, taxRate: 10 }],
        },
        { today: TODAY, isPro: true }
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
    });
  });

  describe('createDocument - free tier limits', () => {
    const validInput = {
      type: 'estimate' as const,
      clientName: 'Test Client',
      issueDate: '2026-01-30',
      lineItems: [{ name: 'Item', quantityMilli: 1000, unit: '式', unitPrice: 10000, taxRate: 10 as const }],
    };

    beforeEach(() => {
      mockedNumbering.generateDocumentNumber.mockResolvedValue({ success: true, data: 'EST-001' });
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
      const result = await createDocument(validInput, { today: TODAY, isPro: false });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FREE_TIER_LIMIT_EXCEEDED');
      expect(mockedNumbering.generateDocumentNumber).not.toHaveBeenCalled();
    });

    it('should reject when document list read fails for free user (fail-closed)', async () => {
      mockedAsyncStorage.getAllDocuments.mockResolvedValue({
        success: false,
        error: { code: 'READ_ERROR' as const, message: 'storage error' },
      });
      const result = await createDocument(validInput, { today: TODAY, isPro: false });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FREE_TIER_LIMIT_EXCEEDED');
    });

    it('should allow when document list read fails for Pro user (fail-open)', async () => {
      mockedAsyncStorage.getAllDocuments.mockResolvedValue({
        success: false,
        error: { code: 'READ_ERROR' as const, message: 'storage error' },
      });
      const result = await createDocument(validInput, { today: TODAY, isPro: true });
      expect(result.success).toBe(true);
    });

    it('should allow when under limit (isPro=false)', async () => {
      mockedAsyncStorage.getAllDocuments.mockResolvedValue({
        success: true,
        data: Array(FREE_DOCUMENT_LIMIT - 1).fill(null).map(() => createTestDocument()),
      });
      const result = await createDocument(validInput, { today: TODAY, isPro: false });
      expect(result.success).toBe(true);
    });

    it('should allow for Pro user regardless of count', async () => {
      mockedAsyncStorage.getAllDocuments.mockResolvedValue({
        success: true,
        data: Array(100).fill(null).map(() => createTestDocument()),
      });
      const result = await createDocument(validInput, { today: TODAY, isPro: true });
      expect(result.success).toBe(true);
    });

    it('should treat undefined isPro as free-tier (fail-closed default)', async () => {
      mockedAsyncStorage.getAllDocuments.mockResolvedValue({
        success: true,
        data: Array(FREE_DOCUMENT_LIMIT).fill(null).map(() => createTestDocument()),
      });
      const result = await createDocument(validInput, { today: TODAY });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FREE_TIER_LIMIT_EXCEEDED');
    });
  });

  describe('getDocument', () => {
    it('should return document by id', async () => {
      const doc = createTestDocument({ id: 'test-id' });
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: doc,
      });

      const result = await getDocument('test-id');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('test-id');
    });

    it('should return null for non-existent id', async () => {
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await getDocument('non-existent');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should return error on storage failure', async () => {
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: false,
        error: { code: 'READ_ERROR', message: 'Failed' },
      });

      const result = await getDocument('test-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
    });
  });

  describe('listDocuments', () => {
    it('should return all documents', async () => {
      const docs = [createTestDocument(), createTestInvoice()];
      mockedAsyncStorage.filterDocuments.mockResolvedValue({
        success: true,
        data: docs,
      });

      const result = await listDocuments();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should apply filters', async () => {
      const docs = [createTestInvoice()];
      mockedAsyncStorage.filterDocuments.mockResolvedValue({
        success: true,
        data: docs,
      });

      const result = await listDocuments({ type: 'invoice' });

      expect(result.success).toBe(true);
      expect(mockedAsyncStorage.filterDocuments).toHaveBeenCalledWith(
        { type: 'invoice' },
        undefined
      );
    });

    it('should apply sorting', async () => {
      mockedAsyncStorage.filterDocuments.mockResolvedValue({
        success: true,
        data: [],
      });

      await listDocuments(undefined, { field: 'issueDate', direction: 'desc' });

      expect(mockedAsyncStorage.filterDocuments).toHaveBeenCalledWith(
        undefined,
        { field: 'issueDate', direction: 'desc' }
      );
    });
  });

  describe('updateDocument', () => {
    it('should update allowed fields', async () => {
      const original = createTestDocument({ id: 'test-id', status: 'draft' });
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: original,
      });
      mockedAsyncStorage.saveDocument.mockImplementation(async (doc) => ({
        success: true,
        data: doc,
      }));

      const result = await updateDocument(
        'test-id',
        { clientName: 'New Client' },
        TODAY
      );

      expect(result.success).toBe(true);
      expect(result.data?.clientName).toBe('New Client');
    });

    it('should preserve unchanged fields', async () => {
      const original = createTestDocument({
        id: 'test-id',
        clientName: 'Original',
        subject: 'Original Subject',
      });
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: original,
      });
      mockedAsyncStorage.saveDocument.mockImplementation(async (doc) => ({
        success: true,
        data: doc,
      }));

      const result = await updateDocument(
        'test-id',
        { clientName: 'New Client' },
        TODAY
      );

      expect(result.data?.clientName).toBe('New Client');
      expect(result.data?.subject).toBe('Original Subject');
    });

    it('should return error for non-existent document', async () => {
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await updateDocument('non-existent', { clientName: 'New' }, TODAY);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DOCUMENT_NOT_FOUND');
    });

    it('should return validation errors for invalid updates', async () => {
      const original = createTestDocument({ id: 'test-id' });
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: original,
      });

      const result = await updateDocument('test-id', { clientName: '' }, TODAY);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should return error when editing forbidden fields in paid status', async () => {
      const original = createTestInvoice({
        id: 'test-id',
        status: 'paid',
        paidAt: '2026-01-25',
      });
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: original,
      });

      const result = await updateDocument(
        'test-id',
        { clientName: 'New Client' },
        TODAY
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EDIT_FORBIDDEN');
    });

    it('should regenerate line item IDs when lineItems are updated', async () => {
      const original = createTestDocument({ id: 'test-id' });
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: original,
      });
      mockedAsyncStorage.saveDocument.mockImplementation(async (doc) => ({
        success: true,
        data: doc,
      }));

      const result = await updateDocument(
        'test-id',
        {
          lineItems: [
            { name: 'New Item', quantityMilli: 2000, unit: 'm', unitPrice: 5000, taxRate: 10 },
          ],
        },
        TODAY
      );

      expect(result.success).toBe(true);
      expect(result.data?.lineItems[0].name).toBe('New Item');
      expect(result.data?.lineItems[0].id).toBeDefined();
    });
  });

  describe('changeDocumentStatus', () => {
    it('should change status with valid transition', async () => {
      const original = createTestInvoice({ id: 'test-id', status: 'draft' });
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: original,
      });
      mockedAsyncStorage.saveDocument.mockImplementation(async (doc) => ({
        success: true,
        data: doc,
      }));

      const result = await changeDocumentStatus('test-id', 'sent');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('sent');
    });

    it('should set paidAt when changing to paid', async () => {
      const original = createTestInvoice({
        id: 'test-id',
        status: 'sent',
        issueDate: '2026-01-15', // paidAt must be >= issueDate
      });
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: original,
      });
      mockedAsyncStorage.saveDocument.mockImplementation(async (doc) => ({
        success: true,
        data: doc,
      }));

      const result = await changeDocumentStatus('test-id', 'paid', '2026-01-25');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('paid');
      expect(result.data?.paidAt).toBe('2026-01-25');
    });

    it('should clear paidAt when changing from paid', async () => {
      const original = createTestInvoice({
        id: 'test-id',
        status: 'paid',
        paidAt: '2026-01-25',
      });
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: original,
      });
      mockedAsyncStorage.saveDocument.mockImplementation(async (doc) => ({
        success: true,
        data: doc,
      }));

      const result = await changeDocumentStatus('test-id', 'sent');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('sent');
      expect(result.data?.paidAt).toBeNull();
    });

    it('should return error for invalid transition', async () => {
      const original = createTestInvoice({ id: 'test-id', status: 'draft' });
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: original,
      });

      const result = await changeDocumentStatus('test-id', 'paid'); // draft -> paid forbidden

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TRANSITION_ERROR');
    });

    it('should validate paidAt constraints', async () => {
      const original = createTestInvoice({ id: 'test-id', status: 'sent' });
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: original,
      });

      // Future paidAt should fail
      const result = await changeDocumentStatus('test-id', 'paid', '2030-01-01');

      expect(result.success).toBe(false);
    });
  });

  describe('deleteDocumentById', () => {
    it('should delete document', async () => {
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: createTestDocument({ id: 'test-id' }),
      });
      mockedAsyncStorage.deleteDocument.mockResolvedValue({
        success: true,
      });

      const result = await deleteDocumentById('test-id');

      expect(result.success).toBe(true);
      expect(mockedAsyncStorage.deleteDocument).toHaveBeenCalledWith('test-id');
    });

    it('should return error for non-existent document', async () => {
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await deleteDocumentById('non-existent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DOCUMENT_NOT_FOUND');
    });
  });

  describe('duplicateDocument', () => {
    it('should create copy with new ID and number', async () => {
      const original = createTestDocument({ id: 'original-id', documentNo: 'EST-001' });
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: original,
      });
      mockedNumbering.generateDocumentNumber.mockResolvedValue({
        success: true,
        data: 'EST-002',
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

      const result = await duplicateDocument('original-id', { today: TODAY, isPro: true });

      expect(result.success).toBe(true);
      expect(result.data?.id).not.toBe('original-id');
      expect(result.data?.documentNo).toBe('EST-002');
    });

    it('should reset status to draft', async () => {
      const original = createTestInvoice({
        id: 'original-id',
        status: 'paid',
        paidAt: '2026-01-25',
      });
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: original,
      });
      mockedNumbering.generateDocumentNumber.mockResolvedValue({
        success: true,
        data: 'INV-002',
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

      const result = await duplicateDocument('original-id', { today: TODAY, isPro: true });

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('draft');
    });

    it('should clear paidAt', async () => {
      const original = createTestInvoice({
        id: 'original-id',
        status: 'paid',
        paidAt: '2026-01-25',
      });
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: original,
      });
      mockedNumbering.generateDocumentNumber.mockResolvedValue({
        success: true,
        data: 'INV-002',
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

      const result = await duplicateDocument('original-id', { today: TODAY, isPro: true });

      expect(result.data?.paidAt).toBeNull();
    });

    it('should return error for non-existent document', async () => {
      mockedAsyncStorage.getDocumentById.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await duplicateDocument('non-existent', { today: TODAY, isPro: true });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DOCUMENT_NOT_FOUND');
    });
  });

  describe('duplicateDocument - free tier limits', () => {
    const originalDoc = createTestDocument({ id: 'original-id', documentNo: 'EST-001' });

    beforeEach(() => {
      mockedAsyncStorage.getDocumentById.mockResolvedValue({ success: true, data: originalDoc });
      mockedNumbering.generateDocumentNumber.mockResolvedValue({ success: true, data: 'EST-002' });
      mockedAsyncStorage.getSettings.mockResolvedValue({ success: true, data: DEFAULT_APP_SETTINGS });
      mockedSecureStorage.getSensitiveIssuerInfo.mockResolvedValue({ success: true, data: null });
      mockedAsyncStorage.saveDocument.mockImplementation(async (doc) => ({ success: true, data: doc }));
      mockedSecureStorage.saveIssuerSnapshot.mockResolvedValue({ success: true });
    });

    it('should reject when active document count reaches limit', async () => {
      mockedAsyncStorage.getAllDocuments.mockResolvedValue({
        success: true,
        data: Array(FREE_DOCUMENT_LIMIT).fill(null).map(() => createTestDocument()),
      });
      const result = await duplicateDocument('original-id', { today: TODAY, isPro: false });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FREE_TIER_LIMIT_EXCEEDED');
      expect(mockedAsyncStorage.getDocumentById).not.toHaveBeenCalled();
    });

    it('should reject when document list read fails for free user (fail-closed)', async () => {
      mockedAsyncStorage.getAllDocuments.mockResolvedValue({
        success: false,
        error: { code: 'READ_ERROR' as const, message: 'err' },
      });
      const result = await duplicateDocument('original-id', { today: TODAY, isPro: false });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FREE_TIER_LIMIT_EXCEEDED');
    });

    it('should allow when document list read fails for Pro user (fail-open)', async () => {
      mockedAsyncStorage.getAllDocuments.mockResolvedValue({
        success: false,
        error: { code: 'READ_ERROR' as const, message: 'err' },
      });
      const result = await duplicateDocument('original-id', { today: TODAY, isPro: true });
      expect(result.success).toBe(true);
    });

    it('should treat undefined isPro as free-tier', async () => {
      mockedAsyncStorage.getAllDocuments.mockResolvedValue({
        success: true,
        data: Array(FREE_DOCUMENT_LIMIT).fill(null).map(() => createTestDocument()),
      });
      const result = await duplicateDocument('original-id', { today: TODAY });
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('FREE_TIER_LIMIT_EXCEEDED');
    });
  });
});
