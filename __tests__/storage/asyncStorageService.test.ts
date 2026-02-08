/**
 * Tests for asyncStorageService
 *
 * TDD approach: Write tests first, then implement to make them pass
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAllDocuments,
  getDocumentById,
  saveDocument,
  deleteDocument,
  filterDocuments,
  getAllUnitPrices,
  getUnitPriceById,
  saveUnitPrice,
  deleteUnitPrice,
  searchUnitPrices,
  getSettings,
  saveSettings,
  updateSettings,
  getSchemaVersion,
  setSchemaVersion,
  setReadOnlyMode,
  getReadOnlyMode,
} from '@/storage/asyncStorageService';
import { deleteIssuerSnapshot } from '@/storage/secureStorageService';
import { Document, DocumentStatus, DocumentType } from '@/types/document';
import { UnitPrice } from '@/types/unitPrice';
import { AppSettings, DEFAULT_APP_SETTINGS } from '@/types/settings';
import { STORAGE_KEYS } from '@/utils/constants';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock secureStorageService
jest.mock('@/storage/secureStorageService', () => ({
  deleteIssuerSnapshot: jest.fn(),
}));

const mockedAsyncStorage = jest.mocked(AsyncStorage);
const mockedDeleteIssuerSnapshot = jest.mocked(deleteIssuerSnapshot);

// Test helpers
function createTestDocument(overrides?: Partial<Document>): Document {
  return {
    id: 'test-doc-id',
    documentNo: 'EST-001',
    type: 'estimate',
    status: 'draft',
    clientName: 'Test Client',
    clientAddress: null,
    customerId: null,
    subject: 'Test Project',
    issueDate: '2026-01-30',
    validUntil: '2026-02-28',
    dueDate: null,
    paidAt: null,
    lineItems: [],
    notes: null,
    carriedForwardAmount: null,
    issuerSnapshot: {
      companyName: null,
      representativeName: null,
      address: null,
      phone: null,
      fax: null,
      sealImageBase64: null,
      contactPerson: null,
      email: null,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function createTestUnitPrice(overrides?: Partial<UnitPrice>): UnitPrice {
  return {
    id: 'test-unit-price-id',
    name: '外壁塗装',
    unit: 'm²',
    defaultPrice: 3000,
    defaultTaxRate: 10,
    category: '塗装',
    notes: null,
    packQty: null,
    packPrice: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('asyncStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setReadOnlyMode(false);
  });

  // === Document CRUD Tests ===
  describe('Document operations', () => {
    it('should save and retrieve a document', async () => {
      const doc = createTestDocument();
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([])); // For save
      mockedAsyncStorage.setItem.mockResolvedValue();
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([doc])); // For get

      const saveResult = await saveDocument(doc);
      expect(saveResult.success).toBe(true);

      const getResult = await getDocumentById(doc.id);
      expect(getResult.success).toBe(true);
      expect(getResult.data?.id).toBe(doc.id);
    });

    it('should return null for non-existent document', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await getDocumentById('non-existent-id');
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should update existing document', async () => {
      const doc = createTestDocument();
      const updatedDoc = { ...doc, clientName: 'Updated Client' };

      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([doc]));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await saveDocument(updatedDoc);
      expect(result.success).toBe(true);
      expect(result.data?.clientName).toBe('Updated Client');
    });

    it('should delete document and its sensitive snapshot', async () => {
      const doc = createTestDocument();
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([doc]));
      mockedAsyncStorage.setItem.mockResolvedValue();
      mockedDeleteIssuerSnapshot.mockResolvedValue({ success: true });

      const result = await deleteDocument(doc.id);
      expect(result.success).toBe(true);
      expect(mockedDeleteIssuerSnapshot).toHaveBeenCalledWith(doc.id);
    });

    it('should NOT delete document when deleteIssuerSnapshot fails', async () => {
      const doc = createTestDocument();
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([doc]));
      mockedDeleteIssuerSnapshot.mockResolvedValue({
        success: false,
        error: { code: 'DELETE_ERROR', message: 'SecureStore failure' },
      });

      const result = await deleteDocument(doc.id);

      expect(result.success).toBe(false);
      // AsyncStorage.setItem should NOT have been called (document not deleted)
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should delete snapshot before document (snapshot succeeds, AsyncStorage write fails)', async () => {
      const doc = createTestDocument();
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([doc]));
      mockedAsyncStorage.setItem.mockRejectedValue(new Error('AsyncStorage write failed'));
      mockedDeleteIssuerSnapshot.mockResolvedValue({ success: true });

      const result = await deleteDocument(doc.id);

      // Snapshot was deleted but document write failed — partial state is acceptable
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WRITE_ERROR');
      expect(mockedDeleteIssuerSnapshot).toHaveBeenCalledWith(doc.id);
    });

    it('should return all documents', async () => {
      const docs = [
        createTestDocument({ id: 'doc-1' }),
        createTestDocument({ id: 'doc-2' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(docs));

      const result = await getAllDocuments();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should return empty array when no documents exist', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const result = await getAllDocuments();
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle read errors gracefully', async () => {
      mockedAsyncStorage.getItem.mockRejectedValue(new Error('Read failed'));

      const result = await getAllDocuments();
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READ_ERROR');
    });

    it('should handle write errors gracefully', async () => {
      const doc = createTestDocument();
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedAsyncStorage.setItem.mockRejectedValue(new Error('Write failed'));

      const result = await saveDocument(doc);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('WRITE_ERROR');
    });
  });

  // === Document Filter Tests ===
  describe('Document filtering', () => {
    const docs = [
      createTestDocument({ id: 'est-1', type: 'estimate', status: 'draft', issueDate: '2026-01-15' }),
      createTestDocument({ id: 'est-2', type: 'estimate', status: 'sent', issueDate: '2026-01-20' }),
      createTestDocument({ id: 'inv-1', type: 'invoice', status: 'sent', issueDate: '2026-01-25' }),
      createTestDocument({ id: 'inv-2', type: 'invoice', status: 'paid', paidAt: '2026-01-28', issueDate: '2026-01-28' }),
    ];

    beforeEach(() => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(docs));
    });

    it('should filter documents by type', async () => {
      const result = await filterDocuments({ type: 'estimate' });
      expect(result.success).toBe(true);
      expect(result.data?.every((d) => d.type === 'estimate')).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should filter documents by single status', async () => {
      const result = await filterDocuments({ status: 'sent' });
      expect(result.success).toBe(true);
      expect(result.data?.every((d) => d.status === 'sent')).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should filter documents by status array', async () => {
      const result = await filterDocuments({ status: ['sent', 'paid'] });
      expect(result.success).toBe(true);
      expect(result.data?.every((d) => ['sent', 'paid'].includes(d.status))).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    it('should filter documents by date range', async () => {
      const result = await filterDocuments({
        issueDateFrom: '2026-01-20',
        issueDateTo: '2026-01-25',
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should filter documents by search text (clientName)', async () => {
      const docsWithNames = [
        createTestDocument({ id: '1', clientName: 'ABC Company' }),
        createTestDocument({ id: '2', clientName: 'XYZ Corporation' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(docsWithNames));

      const result = await filterDocuments({ searchText: 'ABC' });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].clientName).toBe('ABC Company');
    });

    it('should combine multiple filters', async () => {
      const result = await filterDocuments({
        type: 'invoice',
        status: 'sent',
      });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].id).toBe('inv-1');
    });
  });

  // === Document Sort Tests ===
  describe('Document sorting', () => {
    const docs = [
      createTestDocument({ id: 'doc-1', issueDate: '2026-01-20', createdAt: 1000 }),
      createTestDocument({ id: 'doc-2', issueDate: '2026-01-15', createdAt: 2000 }),
      createTestDocument({ id: 'doc-3', issueDate: '2026-01-25', createdAt: 3000 }),
    ];

    beforeEach(() => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(docs));
    });

    it('should sort documents by issueDate ascending', async () => {
      const result = await filterDocuments(undefined, { field: 'issueDate', direction: 'asc' });
      expect(result.success).toBe(true);
      expect(result.data?.map((d) => d.issueDate)).toEqual([
        '2026-01-15',
        '2026-01-20',
        '2026-01-25',
      ]);
    });

    it('should sort documents by issueDate descending', async () => {
      const result = await filterDocuments(undefined, { field: 'issueDate', direction: 'desc' });
      expect(result.success).toBe(true);
      expect(result.data?.map((d) => d.issueDate)).toEqual([
        '2026-01-25',
        '2026-01-20',
        '2026-01-15',
      ]);
    });

    it('should sort documents by createdAt descending', async () => {
      const result = await filterDocuments(undefined, { field: 'createdAt', direction: 'desc' });
      expect(result.success).toBe(true);
      expect(result.data?.map((d) => d.createdAt)).toEqual([3000, 2000, 1000]);
    });
  });

  // === Read-Only Mode Tests ===
  describe('Read-only mode', () => {
    it('should block save operations in read-only mode', async () => {
      setReadOnlyMode(true);
      const doc = createTestDocument();

      const result = await saveDocument(doc);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
    });

    it('should block delete operations in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await deleteDocument('test-id');
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
    });

    it('should allow read operations in read-only mode', async () => {
      const docs = [createTestDocument()];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(docs));

      setReadOnlyMode(true);

      const result = await getAllDocuments();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should report read-only mode status', () => {
      expect(getReadOnlyMode()).toBe(false);
      setReadOnlyMode(true);
      expect(getReadOnlyMode()).toBe(true);
      setReadOnlyMode(false);
      expect(getReadOnlyMode()).toBe(false);
    });
  });

  // === Unit Price Tests ===
  describe('Unit price operations', () => {
    it('should save and retrieve unit price', async () => {
      const unitPrice = createTestUnitPrice();
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([]));
      mockedAsyncStorage.setItem.mockResolvedValue();
      mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([unitPrice]));

      const saveResult = await saveUnitPrice(unitPrice);
      expect(saveResult.success).toBe(true);

      const getResult = await getUnitPriceById(unitPrice.id);
      expect(getResult.success).toBe(true);
      expect(getResult.data?.id).toBe(unitPrice.id);
    });

    it('should delete unit price', async () => {
      const unitPrice = createTestUnitPrice();
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([unitPrice]));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await deleteUnitPrice(unitPrice.id);
      expect(result.success).toBe(true);
    });

    it('should return all unit prices', async () => {
      const prices = [
        createTestUnitPrice({ id: 'up-1' }),
        createTestUnitPrice({ id: 'up-2' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(prices));

      const result = await getAllUnitPrices();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should search by name (partial match)', async () => {
      const prices = [
        createTestUnitPrice({ id: 'up-1', name: '外壁塗装', category: '建築' }),
        createTestUnitPrice({ id: 'up-2', name: '内壁塗装', category: '建築' }),
        createTestUnitPrice({ id: 'up-3', name: '電気工事', category: '電気' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(prices));

      const result = await searchUnitPrices({ searchText: '塗装' });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should search by category', async () => {
      const prices = [
        createTestUnitPrice({ id: 'up-1', category: '塗装' }),
        createTestUnitPrice({ id: 'up-2', category: '電気' }),
        createTestUnitPrice({ id: 'up-3', category: '塗装' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(prices));

      const result = await searchUnitPrices({ category: '塗装' });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should block save in read-only mode', async () => {
      setReadOnlyMode(true);
      const unitPrice = createTestUnitPrice();

      const result = await saveUnitPrice(unitPrice);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
    });
  });

  // === Settings Tests ===
  describe('Settings operations', () => {
    it('should return default settings on first read', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const result = await getSettings();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(DEFAULT_APP_SETTINGS);
    });

    it('should save and retrieve settings', async () => {
      const settings: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        issuer: {
          ...DEFAULT_APP_SETTINGS.issuer,
          companyName: 'Test Company',
        },
      };

      mockedAsyncStorage.setItem.mockResolvedValue();
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(settings));

      const saveResult = await saveSettings(settings);
      expect(saveResult.success).toBe(true);

      const getResult = await getSettings();
      expect(getResult.success).toBe(true);
      expect(getResult.data?.issuer.companyName).toBe('Test Company');
    });

    it('should merge partial updates', async () => {
      const existingSettings: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        issuer: {
          ...DEFAULT_APP_SETTINGS.issuer,
          companyName: 'Existing Company',
        },
      };

      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingSettings));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await updateSettings({
        issuer: {
          ...existingSettings.issuer,
          phone: '03-1234-5678',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.issuer.companyName).toBe('Existing Company');
      expect(result.data?.issuer.phone).toBe('03-1234-5678');
    });

    it('should block save in read-only mode', async () => {
      setReadOnlyMode(true);
      const settings = DEFAULT_APP_SETTINGS;

      const result = await saveSettings(settings);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
    });
  });

  describe('mergeSettingsWithDefaults - enum validation', () => {
    it('should fallback to default for invalid sealSize', async () => {
      const corruptSettings = {
        ...DEFAULT_APP_SETTINGS,
        sealSize: 'INVALID_SIZE',
      };
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(corruptSettings));

      const result = await getSettings();
      expect(result.success).toBe(true);
      expect(result.data?.sealSize).toBe('MEDIUM');
    });

    it('should fallback to default for invalid backgroundDesign', async () => {
      const corruptSettings = {
        ...DEFAULT_APP_SETTINGS,
        backgroundDesign: 'ZIGZAG',
      };
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(corruptSettings));

      const result = await getSettings();
      expect(result.success).toBe(true);
      expect(result.data?.backgroundDesign).toBe('NONE');
    });

    it('should fallback to default for invalid defaultEstimateTemplateId', async () => {
      const corruptSettings = {
        ...DEFAULT_APP_SETTINGS,
        defaultEstimateTemplateId: 'UNKNOWN_TEMPLATE',
      };
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(corruptSettings));

      const result = await getSettings();
      expect(result.success).toBe(true);
      expect(result.data?.defaultEstimateTemplateId).toBe('FORMAL_STANDARD');
    });

    it('should derive defaultInvoiceTemplateId from invoiceTemplateType when missing', async () => {
      const settingsWithoutNewField = {
        ...DEFAULT_APP_SETTINGS,
        invoiceTemplateType: 'SIMPLE',
      };
      delete (settingsWithoutNewField as Record<string, unknown>).defaultInvoiceTemplateId;
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(settingsWithoutNewField));

      const result = await getSettings();
      expect(result.success).toBe(true);
      expect(result.data?.defaultInvoiceTemplateId).toBe('SIMPLE');
    });
  });

  describe('updateSettings - invoiceTemplateType sync', () => {
    it('should sync defaultInvoiceTemplateId when invoiceTemplateType is updated alone', async () => {
      const existingSettings: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        invoiceTemplateType: 'ACCOUNTING',
        defaultInvoiceTemplateId: 'ACCOUNTING',
      };
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingSettings));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await updateSettings({ invoiceTemplateType: 'SIMPLE' });

      expect(result.success).toBe(true);
      expect(result.data?.invoiceTemplateType).toBe('SIMPLE');
      expect(result.data?.defaultInvoiceTemplateId).toBe('SIMPLE');
    });

    it('should sync invoiceTemplateType when defaultInvoiceTemplateId is updated alone', async () => {
      const existingSettings: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        invoiceTemplateType: 'ACCOUNTING',
        defaultInvoiceTemplateId: 'ACCOUNTING',
      };
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingSettings));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await updateSettings({ defaultInvoiceTemplateId: 'SIMPLE' });

      expect(result.success).toBe(true);
      expect(result.data?.defaultInvoiceTemplateId).toBe('SIMPLE');
      expect(result.data?.invoiceTemplateType).toBe('SIMPLE');
    });

    it('should not sync when defaultInvoiceTemplateId is set to non-legacy value', async () => {
      const existingSettings: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        invoiceTemplateType: 'ACCOUNTING',
        defaultInvoiceTemplateId: 'ACCOUNTING',
      };
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingSettings));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await updateSettings({ defaultInvoiceTemplateId: 'MODERN' });

      expect(result.success).toBe(true);
      expect(result.data?.defaultInvoiceTemplateId).toBe('MODERN');
      // invoiceTemplateType stays unchanged since MODERN is not a legacy value
      expect(result.data?.invoiceTemplateType).toBe('ACCOUNTING');
    });
  });

  // === Schema Version Tests ===
  describe('Schema version operations', () => {
    it('should return 0 when no version exists', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const result = await getSchemaVersion();
      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });

    it('should save and retrieve schema version', async () => {
      mockedAsyncStorage.setItem.mockResolvedValue();
      mockedAsyncStorage.getItem.mockResolvedValue('1');

      const setResult = await setSchemaVersion(1);
      expect(setResult.success).toBe(true);

      const getResult = await getSchemaVersion();
      expect(getResult.success).toBe(true);
      expect(getResult.data).toBe(1);
    });

    it('should allow schema version update even in read-only mode', async () => {
      // Schema version updates are allowed in read-only mode
      // to support migration retry functionality
      setReadOnlyMode(true);
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await setSchemaVersion(1);
      expect(result.success).toBe(true);
    });
  });

  // === Error Handling Tests ===
  describe('Error handling', () => {
    it('should handle JSON parse errors gracefully', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue('invalid json');

      const result = await getAllDocuments();
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
    });
  });
});
