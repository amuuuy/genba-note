/**
 * useDocumentList Hook Tests
 *
 * Tests the pure functions for document list operations.
 * The hook itself requires React, so we test the logic separately.
 */

// Mock expo-router before any imports
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));

import {
  enrichDocumentsWithTotals,
  createDeleteHandler,
  type DocumentListState,
} from '@/hooks/useDocumentList';
import type { Document, DocumentWithTotals } from '@/types';
import { enrichDocumentWithTotals } from '@/domain/lineItem';

// Mock the domain layer
jest.mock('@/domain/document', () => ({
  listDocuments: jest.fn(),
  deleteDocumentById: jest.fn(),
}));

jest.mock('@/domain/lineItem', () => ({
  enrichDocumentWithTotals: jest.fn((doc) => ({
    ...doc,
    subtotalYen: 10000,
    taxYen: 1000,
    totalYen: 11000,
    lineItemsCalculated: [],
    taxBreakdown: [],
  })),
}));

describe('useDocumentList', () => {
  // Test helper to create a mock document
  function createMockDocument(overrides: Partial<Document> = {}): Document {
    return {
      id: 'test-id-1',
      documentNo: 'EST-001',
      type: 'estimate',
      status: 'draft',
      clientName: 'テスト株式会社',
      clientAddress: null,
      customerId: null,
      subject: null,
      issueDate: '2026-01-31',
      validUntil: null,
      dueDate: null,
      paidAt: null,
      lineItems: [
        {
          id: 'line-1',
          name: '工事A',
          quantityMilli: 1000,
          unit: '式',
          unitPrice: 10000,
          taxRate: 10,
        },
      ],
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

  describe('enrichDocumentsWithTotals', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('enriches all documents with totals', () => {
      const docs: Document[] = [
        createMockDocument({ id: '1', documentNo: 'EST-001' }),
        createMockDocument({ id: '2', documentNo: 'EST-002' }),
      ];

      const enriched = enrichDocumentsWithTotals(docs);

      expect(enriched).toHaveLength(2);
      expect(enrichDocumentWithTotals).toHaveBeenCalledTimes(2);
    });

    it('returns empty array for empty input', () => {
      const enriched = enrichDocumentsWithTotals([]);

      expect(enriched).toEqual([]);
      expect(enrichDocumentWithTotals).not.toHaveBeenCalled();
    });

    it('preserves document properties after enrichment', () => {
      const docs: Document[] = [
        createMockDocument({ id: '1', clientName: '山田建設' }),
      ];

      const enriched = enrichDocumentsWithTotals(docs);

      expect(enriched[0].id).toBe('1');
      expect(enriched[0].clientName).toBe('山田建設');
    });
  });

  describe('createDeleteHandler', () => {
    it('removes document from list when delete succeeds', () => {
      const initialDocuments: DocumentWithTotals[] = [
        { ...createMockDocument({ id: '1' }), subtotalYen: 10000, taxYen: 1000, totalYen: 11000, lineItemsCalculated: [], taxBreakdown: [] },
        { ...createMockDocument({ id: '2' }), subtotalYen: 10000, taxYen: 1000, totalYen: 11000, lineItemsCalculated: [], taxBreakdown: [] },
      ];

      const handler = createDeleteHandler(
        initialDocuments,
        (newDocs) => newDocs
      );

      const result = handler('1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('returns empty array when deleting last document', () => {
      const initialDocuments: DocumentWithTotals[] = [
        { ...createMockDocument({ id: '1' }), subtotalYen: 10000, taxYen: 1000, totalYen: 11000, lineItemsCalculated: [], taxBreakdown: [] },
      ];

      const handler = createDeleteHandler(
        initialDocuments,
        (newDocs) => newDocs
      );

      const result = handler('1');

      expect(result).toEqual([]);
    });

    it('returns unchanged list when document not found', () => {
      const initialDocuments: DocumentWithTotals[] = [
        { ...createMockDocument({ id: '1' }), subtotalYen: 10000, taxYen: 1000, totalYen: 11000, lineItemsCalculated: [], taxBreakdown: [] },
      ];

      const handler = createDeleteHandler(
        initialDocuments,
        (newDocs) => newDocs
      );

      const result = handler('non-existent');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('DocumentListState', () => {
    it('has correct initial state shape', () => {
      const initialState: DocumentListState = {
        documents: [],
        isLoading: true,
        error: null,
      };

      expect(initialState.documents).toEqual([]);
      expect(initialState.isLoading).toBe(true);
      expect(initialState.error).toBeNull();
    });
  });
});
