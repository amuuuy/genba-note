/**
 * kanbanService tests
 *
 * Tests for pure functions that map document statuses to kanban columns
 * and group documents by column.
 */

import type { DocumentStatus } from '@/types/document';
import type { DocumentWithTotals } from '@/types/document';
import { createTestDocument, createTestInvoice } from '../document/helpers';
import {
  getKanbanColumn,
  getDocumentsForColumn,
  KANBAN_COLUMNS,
} from '@/domain/kanban/kanbanService';

/** Helper to create a DocumentWithTotals from a Document */
function asDocWithTotals(
  overrides?: Partial<DocumentWithTotals>
): DocumentWithTotals {
  const doc = createTestDocument(overrides);
  return {
    ...doc,
    lineItemsCalculated: [],
    subtotalYen: 0,
    taxYen: 0,
    totalYen: 0,
    taxBreakdown: [],
    ...overrides,
  } as DocumentWithTotals;
}

function asInvoiceWithTotals(
  overrides?: Partial<DocumentWithTotals>
): DocumentWithTotals {
  const doc = createTestInvoice(overrides);
  return {
    ...doc,
    lineItemsCalculated: [],
    subtotalYen: 0,
    taxYen: 0,
    totalYen: 0,
    taxBreakdown: [],
    ...overrides,
  } as DocumentWithTotals;
}

describe('kanbanService', () => {
  describe('getKanbanColumn', () => {
    it('maps draft to working', () => {
      expect(getKanbanColumn('draft')).toBe('working');
    });

    it('maps sent to sent_waiting', () => {
      expect(getKanbanColumn('sent')).toBe('sent_waiting');
    });

    it('maps paid to completed', () => {
      expect(getKanbanColumn('paid')).toBe('completed');
    });

    it('maps issued to completed', () => {
      expect(getKanbanColumn('issued')).toBe('completed');
    });
  });

  describe('getDocumentsForColumn', () => {
    const draftEstimate = asDocWithTotals({
      id: 'est-1',
      status: 'draft',
      type: 'estimate',
    });
    const sentEstimate = asDocWithTotals({
      id: 'est-2',
      status: 'sent',
      type: 'estimate',
    });
    const draftInvoice = asInvoiceWithTotals({
      id: 'inv-1',
      status: 'draft',
    });
    const sentInvoice = asInvoiceWithTotals({
      id: 'inv-2',
      status: 'sent',
    });
    const paidInvoice = asInvoiceWithTotals({
      id: 'inv-3',
      status: 'paid',
      paidAt: '2026-01-25',
    });
    const issuedEstimate = asDocWithTotals({
      id: 'est-3',
      status: 'issued',
      type: 'estimate',
    });

    const allDocuments = [
      draftEstimate,
      sentEstimate,
      draftInvoice,
      sentInvoice,
      paidInvoice,
      issuedEstimate,
    ];

    it('returns only draft documents for working column', () => {
      const result = getDocumentsForColumn(allDocuments, 'working');
      expect(result).toHaveLength(2);
      expect(result.map((d) => d.id)).toEqual(['est-1', 'inv-1']);
    });

    it('returns only sent documents for sent_waiting column', () => {
      const result = getDocumentsForColumn(allDocuments, 'sent_waiting');
      expect(result).toHaveLength(2);
      expect(result.map((d) => d.id)).toEqual(['est-2', 'inv-2']);
    });

    it('returns paid and issued documents for completed column', () => {
      const result = getDocumentsForColumn(allDocuments, 'completed');
      expect(result).toHaveLength(2);
      expect(result.map((d) => d.id)).toEqual(['inv-3', 'est-3']);
    });

    it('returns empty array when no documents match', () => {
      const onlyDrafts = [draftEstimate, draftInvoice];
      const result = getDocumentsForColumn(onlyDrafts, 'completed');
      expect(result).toEqual([]);
    });

    it('returns empty array for empty document list', () => {
      const result = getDocumentsForColumn([], 'working');
      expect(result).toEqual([]);
    });

    it('preserves document order within columns', () => {
      const docs = [
        asDocWithTotals({ id: 'a', status: 'draft' }),
        asDocWithTotals({ id: 'b', status: 'draft' }),
        asDocWithTotals({ id: 'c', status: 'draft' }),
      ];
      const result = getDocumentsForColumn(docs, 'working');
      expect(result.map((d) => d.id)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('KANBAN_COLUMNS', () => {
    it('defines exactly 3 columns', () => {
      expect(KANBAN_COLUMNS).toHaveLength(3);
    });

    it('covers all DocumentStatus values', () => {
      const allStatuses: DocumentStatus[] = [
        'draft',
        'sent',
        'paid',
        'issued',
      ];
      const coveredStatuses = KANBAN_COLUMNS.flatMap((col) => col.statuses);
      for (const status of allStatuses) {
        expect(coveredStatuses).toContain(status);
      }
    });

    it('has no duplicate statuses across columns', () => {
      const allStatuses = KANBAN_COLUMNS.flatMap((col) => col.statuses);
      const uniqueStatuses = new Set(allStatuses);
      expect(uniqueStatuses.size).toBe(allStatuses.length);
    });

    it('has correct column IDs', () => {
      expect(KANBAN_COLUMNS.map((c) => c.id)).toEqual([
        'working',
        'sent_waiting',
        'completed',
      ]);
    });
  });
});
