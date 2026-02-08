/**
 * statusGroupService tests
 *
 * Tests for pure functions that group documents by status categories
 * for the list view's status-grouped display.
 */

import type { DocumentStatus } from '@/types/document';
import type { DocumentWithTotals } from '@/types/document';
import { createTestDocument, createTestInvoice } from './helpers';
import {
  groupDocumentsByStatus,
  getDocumentsForGroup,
  STATUS_GROUPS,
} from '@/domain/document/statusGroupService';

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

describe('statusGroupService', () => {
  describe('STATUS_GROUPS', () => {
    it('defines exactly 3 groups', () => {
      expect(STATUS_GROUPS).toHaveLength(3);
    });

    it('covers all DocumentStatus values', () => {
      const allStatuses: DocumentStatus[] = [
        'draft',
        'sent',
        'paid',
        'issued',
      ];
      const coveredStatuses = STATUS_GROUPS.flatMap((g) => g.statuses);
      for (const status of allStatuses) {
        expect(coveredStatuses).toContain(status);
      }
    });

    it('has no duplicate statuses across groups', () => {
      const allStatuses = STATUS_GROUPS.flatMap((g) => g.statuses);
      const uniqueStatuses = new Set(allStatuses);
      expect(uniqueStatuses.size).toBe(allStatuses.length);
    });

    it('has correct group IDs in order', () => {
      expect(STATUS_GROUPS.map((g) => g.id)).toEqual([
        'paid',
        'billing',
        'working',
      ]);
    });

    it('maps paid status to paid group', () => {
      const paidGroup = STATUS_GROUPS.find((g) => g.id === 'paid');
      expect(paidGroup?.statuses).toEqual(['paid']);
    });

    it('maps sent and issued statuses to billing group', () => {
      const billingGroup = STATUS_GROUPS.find((g) => g.id === 'billing');
      expect(billingGroup?.statuses).toEqual(['sent', 'issued']);
    });

    it('maps draft status to working group', () => {
      const workingGroup = STATUS_GROUPS.find((g) => g.id === 'working');
      expect(workingGroup?.statuses).toEqual(['draft']);
    });
  });

  describe('groupDocumentsByStatus', () => {
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

    it('groups documents correctly into three categories', () => {
      const result = groupDocumentsByStatus(allDocuments);

      expect(result.paid.map((d) => d.id)).toEqual(['inv-3']);
      expect(result.billing.map((d) => d.id)).toEqual(['est-2', 'inv-2', 'est-3']);
      expect(result.working.map((d) => d.id)).toEqual(['est-1', 'inv-1']);
    });

    it('returns empty arrays when no documents exist', () => {
      const result = groupDocumentsByStatus([]);
      expect(result.paid).toEqual([]);
      expect(result.billing).toEqual([]);
      expect(result.working).toEqual([]);
    });

    it('returns empty arrays for groups with no matching documents', () => {
      const onlyDrafts = [draftEstimate, draftInvoice];
      const result = groupDocumentsByStatus(onlyDrafts);

      expect(result.paid).toEqual([]);
      expect(result.billing).toEqual([]);
      expect(result.working).toHaveLength(2);
    });

    it('preserves document order within groups', () => {
      const docs = [
        asDocWithTotals({ id: 'a', status: 'draft' }),
        asDocWithTotals({ id: 'b', status: 'draft' }),
        asDocWithTotals({ id: 'c', status: 'draft' }),
      ];
      const result = groupDocumentsByStatus(docs);
      expect(result.working.map((d) => d.id)).toEqual(['a', 'b', 'c']);
    });

    it('places issued documents in billing group', () => {
      const issuedDoc = asDocWithTotals({ id: 'issued-1', status: 'issued' });
      const result = groupDocumentsByStatus([issuedDoc]);
      expect(result.billing).toHaveLength(1);
      expect(result.billing[0].id).toBe('issued-1');
    });
  });

  describe('getDocumentsForGroup', () => {
    const docs = [
      asDocWithTotals({ id: 'draft-1', status: 'draft' }),
      asInvoiceWithTotals({ id: 'sent-1', status: 'sent' }),
      asInvoiceWithTotals({ id: 'paid-1', status: 'paid', paidAt: '2026-01-25' }),
      asDocWithTotals({ id: 'issued-1', status: 'issued' }),
    ];

    it('returns only paid documents for paid group', () => {
      const result = getDocumentsForGroup(docs, 'paid');
      expect(result.map((d) => d.id)).toEqual(['paid-1']);
    });

    it('returns sent and issued documents for billing group', () => {
      const result = getDocumentsForGroup(docs, 'billing');
      expect(result.map((d) => d.id)).toEqual(['sent-1', 'issued-1']);
    });

    it('returns draft documents for working group', () => {
      const result = getDocumentsForGroup(docs, 'working');
      expect(result.map((d) => d.id)).toEqual(['draft-1']);
    });

    it('returns empty array when no documents match', () => {
      const onlyDrafts = [asDocWithTotals({ id: 'a', status: 'draft' })];
      const result = getDocumentsForGroup(onlyDrafts, 'paid');
      expect(result).toEqual([]);
    });

    it('returns empty array for empty document list', () => {
      const result = getDocumentsForGroup([], 'working');
      expect(result).toEqual([]);
    });
  });
});
