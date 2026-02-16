/**
 * Tests for statusTransitionService.ts
 * TDD: Tests are written first, implementation follows
 */

import type { Document, LineItem } from '@/types/document';
import {
  canTransition,
  getAllowedTransitions,
  executeTransition,
  getTransitionRequirements,
} from '@/domain/document/statusTransitionService';

// Helper to create test LineItem
function createTestLineItem(overrides?: Partial<LineItem>): LineItem {
  return {
    id: 'test-line-item-id',
    name: 'Test Item',
    quantityMilli: 1000,
    unit: '式',
    unitPrice: 10000,
    taxRate: 10,
    ...overrides,
  };
}

// Helper to create test Document
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
    lineItems: [createTestLineItem()],
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

// Helper to create invoice
function createTestInvoice(overrides?: Partial<Document>): Document {
  return createTestDocument({
    type: 'invoice',
    documentNo: 'INV-001',
    validUntil: null,
    dueDate: '2026-02-28',
    ...overrides,
  });
}

describe('statusTransitionService', () => {
  describe('canTransition', () => {
    describe('estimate transitions', () => {
      it('should allow draft -> sent', () => {
        expect(canTransition('estimate', 'draft', 'sent')).toBe(true);
      });

      it('should allow sent -> draft', () => {
        expect(canTransition('estimate', 'sent', 'draft')).toBe(true);
      });

      it('should NOT allow draft -> paid', () => {
        expect(canTransition('estimate', 'draft', 'paid')).toBe(false);
      });

      it('should allow sent -> issued', () => {
        expect(canTransition('estimate', 'sent', 'issued')).toBe(true);
      });

      it('should NOT allow sent -> paid', () => {
        expect(canTransition('estimate', 'sent', 'paid')).toBe(false);
      });

      it('should NOT allow any transition from paid (estimate cannot be paid)', () => {
        expect(canTransition('estimate', 'paid', 'draft')).toBe(false);
        expect(canTransition('estimate', 'paid', 'sent')).toBe(false);
      });

      it('should NOT allow same status transition', () => {
        expect(canTransition('estimate', 'draft', 'draft')).toBe(false);
        expect(canTransition('estimate', 'sent', 'sent')).toBe(false);
      });

      it('should allow draft -> issued', () => {
        expect(canTransition('estimate', 'draft', 'issued')).toBe(true);
      });

      it('should allow issued -> draft', () => {
        expect(canTransition('estimate', 'issued', 'draft')).toBe(true);
      });

      it('should NOT allow issued -> issued', () => {
        expect(canTransition('estimate', 'issued', 'issued')).toBe(false);
      });

      it('should allow issued -> sent', () => {
        expect(canTransition('estimate', 'issued', 'sent')).toBe(true);
      });
    });

    describe('invoice transitions', () => {
      it('should allow draft -> sent', () => {
        expect(canTransition('invoice', 'draft', 'sent')).toBe(true);
      });

      it('should allow sent -> draft', () => {
        expect(canTransition('invoice', 'sent', 'draft')).toBe(true);
      });

      it('should allow sent -> paid', () => {
        expect(canTransition('invoice', 'sent', 'paid')).toBe(true);
      });

      it('should allow paid -> sent', () => {
        expect(canTransition('invoice', 'paid', 'sent')).toBe(true);
      });

      it('should NOT allow paid -> draft (must go through sent)', () => {
        expect(canTransition('invoice', 'paid', 'draft')).toBe(false);
      });

      it('should NOT allow draft -> paid (must go through sent)', () => {
        expect(canTransition('invoice', 'draft', 'paid')).toBe(false);
      });

      it('should NOT allow same status transition', () => {
        expect(canTransition('invoice', 'draft', 'draft')).toBe(false);
        expect(canTransition('invoice', 'sent', 'sent')).toBe(false);
        expect(canTransition('invoice', 'paid', 'paid')).toBe(false);
      });

      it('should allow draft -> issued', () => {
        expect(canTransition('invoice', 'draft', 'issued')).toBe(true);
      });

      it('should allow issued -> draft', () => {
        expect(canTransition('invoice', 'issued', 'draft')).toBe(true);
      });

      it('should NOT allow issued -> issued', () => {
        expect(canTransition('invoice', 'issued', 'issued')).toBe(false);
      });

      it('should allow issued -> sent', () => {
        expect(canTransition('invoice', 'issued', 'sent')).toBe(true);
      });
    });
  });

  describe('getAllowedTransitions', () => {
    it('should return [sent, issued] for estimate draft', () => {
      const allowed = getAllowedTransitions('estimate', 'draft');
      expect(allowed).toContain('sent');
      expect(allowed).toContain('issued');
      expect(allowed).toHaveLength(2);
    });

    it('should return [draft, issued] for estimate sent', () => {
      const allowed = getAllowedTransitions('estimate', 'sent');
      expect(allowed).toContain('draft');
      expect(allowed).toContain('issued');
      expect(allowed).toHaveLength(2);
    });

    it('should return [] for estimate paid (never happens)', () => {
      const allowed = getAllowedTransitions('estimate', 'paid');
      expect(allowed).toEqual([]);
    });

    it('should return [draft, sent] for estimate issued', () => {
      const allowed = getAllowedTransitions('estimate', 'issued');
      expect(allowed).toContain('draft');
      expect(allowed).toContain('sent');
      expect(allowed).toHaveLength(2);
    });

    it('should return [sent, issued] for invoice draft', () => {
      const allowed = getAllowedTransitions('invoice', 'draft');
      expect(allowed).toContain('sent');
      expect(allowed).toContain('issued');
      expect(allowed).toHaveLength(2);
    });

    it('should return [draft, paid] for invoice sent', () => {
      const allowed = getAllowedTransitions('invoice', 'sent');
      expect(allowed).toContain('draft');
      expect(allowed).toContain('paid');
      expect(allowed).toHaveLength(2);
    });

    it('should return [sent] for invoice paid (can only go back to sent)', () => {
      const allowed = getAllowedTransitions('invoice', 'paid');
      expect(allowed).toEqual(['sent']);
    });

    it('should return [draft, sent] for invoice issued', () => {
      const allowed = getAllowedTransitions('invoice', 'issued');
      expect(allowed).toContain('draft');
      expect(allowed).toContain('sent');
      expect(allowed).toHaveLength(2);
    });
  });

  describe('executeTransition', () => {
    it('should return updated document for valid transition', () => {
      const doc = createTestInvoice({ status: 'draft' });
      const result = executeTransition(doc, 'sent');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('sent');
    });

    it('should set paidAt when transitioning to paid', () => {
      const doc = createTestInvoice({ status: 'sent' });
      const result = executeTransition(doc, 'paid', '2026-01-25');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('paid');
      expect(result.data?.paidAt).toBe('2026-01-25');
    });

    it('should clear paidAt when transitioning from paid to sent', () => {
      const doc = createTestInvoice({ status: 'paid', paidAt: '2026-01-25' });
      const result = executeTransition(doc, 'sent');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('sent');
      expect(result.data?.paidAt).toBeNull();
    });

    it('should return error for paid -> draft (must go through sent)', () => {
      const doc = createTestInvoice({ status: 'paid', paidAt: '2026-01-25' });
      const result = executeTransition(doc, 'draft');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_TRANSITION');
    });

    it('should return error for invalid transition', () => {
      const doc = createTestInvoice({ status: 'draft' });
      const result = executeTransition(doc, 'paid'); // draft -> paid is forbidden

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DIRECT_DRAFT_TO_PAID');
    });

    it('should transition estimate from sent to issued', () => {
      const doc = createTestDocument({ type: 'estimate', status: 'sent' });
      const result = executeTransition(doc, 'issued');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('issued');
    });

    it('should return error for estimate to paid', () => {
      const doc = createTestDocument({ type: 'estimate', status: 'sent' });
      const result = executeTransition(doc, 'paid');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ESTIMATE_CANNOT_BE_PAID');
    });

    it('should return error when paidAt is missing for paid transition', () => {
      const doc = createTestInvoice({ status: 'sent' });
      const result = executeTransition(doc, 'paid'); // No paidAt provided

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_TRANSITION');
    });

    it('should transition estimate from issued to sent', () => {
      const doc = createTestDocument({ type: 'estimate', status: 'issued' });
      const result = executeTransition(doc, 'sent');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('sent');
      expect(result.data?.paidAt).toBeNull();
    });

    it('should transition invoice from issued to sent', () => {
      const doc = createTestInvoice({ status: 'issued' });
      const result = executeTransition(doc, 'sent');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('sent');
      expect(result.data?.paidAt).toBeNull();
    });

    it('should preserve other fields during transition', () => {
      const doc = createTestInvoice({
        status: 'draft',
        clientName: 'Important Client',
        notes: 'Some notes',
      });
      const result = executeTransition(doc, 'sent');

      expect(result.success).toBe(true);
      expect(result.data?.clientName).toBe('Important Client');
      expect(result.data?.notes).toBe('Some notes');
    });
  });

  describe('getTransitionRequirements', () => {
    it('should return { requiresPaidAt: true, clearsPaidAt: false } for sent -> paid', () => {
      const reqs = getTransitionRequirements('invoice', 'sent', 'paid');
      expect(reqs).not.toBeNull();
      expect(reqs?.requiresPaidAt).toBe(true);
      expect(reqs?.clearsPaidAt).toBe(false);
    });

    it('should return { requiresPaidAt: false, clearsPaidAt: true } for paid -> sent', () => {
      const reqs = getTransitionRequirements('invoice', 'paid', 'sent');
      expect(reqs).not.toBeNull();
      expect(reqs?.requiresPaidAt).toBe(false);
      expect(reqs?.clearsPaidAt).toBe(true);
    });

    it('should return null for paid -> draft (invalid transition)', () => {
      const reqs = getTransitionRequirements('invoice', 'paid', 'draft');
      expect(reqs).toBeNull();
    });

    it('should return { requiresPaidAt: false, clearsPaidAt: false } for draft -> sent', () => {
      const reqs = getTransitionRequirements('invoice', 'draft', 'sent');
      expect(reqs).not.toBeNull();
      expect(reqs?.requiresPaidAt).toBe(false);
      expect(reqs?.clearsPaidAt).toBe(false);
    });

    it('should return { requiresPaidAt: false, clearsPaidAt: false } for estimate sent -> issued', () => {
      const reqs = getTransitionRequirements('estimate', 'sent', 'issued');
      expect(reqs).not.toBeNull();
      expect(reqs?.requiresPaidAt).toBe(false);
      expect(reqs?.clearsPaidAt).toBe(false);
    });

    it('should return { requiresPaidAt: false, clearsPaidAt: false } for issued -> sent', () => {
      const reqs = getTransitionRequirements('invoice', 'issued', 'sent');
      expect(reqs).not.toBeNull();
      expect(reqs?.requiresPaidAt).toBe(false);
      expect(reqs?.clearsPaidAt).toBe(false);
    });

    it('should return null for invalid transitions', () => {
      expect(getTransitionRequirements('invoice', 'draft', 'paid')).toBeNull();
      expect(getTransitionRequirements('estimate', 'sent', 'paid')).toBeNull();
    });

    it('should return null for same status transition', () => {
      expect(getTransitionRequirements('invoice', 'draft', 'draft')).toBeNull();
    });
  });
});
