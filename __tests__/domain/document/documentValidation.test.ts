/**
 * Tests for documentValidation.ts
 * TDD: Tests are written first, implementation follows
 */

import type { Document, LineItem, DocumentStatus } from '@/types/document';
import {
  validateClientName,
  validateIssueDate,
  validateValidUntil,
  validateDueDate,
  validatePaidAt,
  validateLineItem,
  validateLineItems,
  validateDocumentTotal,
  validateDocument,
  getEditableFields,
  validateEditAllowed,
  sanitizeDocumentType,
} from '@/domain/document/documentValidation';
import {
  MAX_QUANTITY_MILLI,
  MIN_QUANTITY_MILLI,
  MAX_UNIT_PRICE,
  MIN_UNIT_PRICE,
  MAX_LINE_ITEMS,
  MAX_TOTAL_YEN,
} from '@/utils/constants';

// Helper to create test LineItem
function createTestLineItem(overrides?: Partial<LineItem>): LineItem {
  return {
    id: 'test-line-item-id',
    name: 'Test Item',
    quantityMilli: 1000, // 1.000
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

describe('documentValidation', () => {
  // Fixed date for testing
  const TODAY = '2026-01-30';

  describe('validateClientName', () => {
    it('should return null for valid client name', () => {
      expect(validateClientName('Test Client')).toBeNull();
    });

    it('should return null for client name with special characters', () => {
      expect(validateClientName('株式会社テスト')).toBeNull();
      expect(validateClientName('Test & Co., Ltd.')).toBeNull();
    });

    it('should return error for empty string', () => {
      const error = validateClientName('');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('INVALID_CLIENT_NAME');
    });

    it('should return error for whitespace only', () => {
      const error = validateClientName('   ');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('INVALID_CLIENT_NAME');
    });

    it('should return error for tab and newline only', () => {
      const error = validateClientName('\t\n  ');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('INVALID_CLIENT_NAME');
    });
  });

  describe('validateIssueDate', () => {
    it('should return null for valid date', () => {
      expect(validateIssueDate('2026-01-30')).toBeNull();
    });

    it('should return null for future dates (allowed)', () => {
      expect(validateIssueDate('2030-12-31')).toBeNull();
    });

    it('should return error for invalid format', () => {
      const error = validateIssueDate('2026/01/30');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('INVALID_ISSUE_DATE');
    });

    it('should return error for invalid date (Feb 30)', () => {
      const error = validateIssueDate('2026-02-30');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('INVALID_ISSUE_DATE');
    });

    it('should return error for empty string', () => {
      const error = validateIssueDate('');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('INVALID_ISSUE_DATE');
    });
  });

  describe('validateValidUntil', () => {
    it('should return null when validUntil >= issueDate', () => {
      expect(validateValidUntil('2026-02-28', '2026-01-30')).toBeNull();
      expect(validateValidUntil('2026-01-30', '2026-01-30')).toBeNull(); // same day OK
    });

    it('should return null when validUntil is null (optional)', () => {
      expect(validateValidUntil(null, '2026-01-30')).toBeNull();
    });

    it('should return error when validUntil < issueDate', () => {
      const error = validateValidUntil('2026-01-29', '2026-01-30');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('INVALID_VALID_UNTIL');
    });

    it('should return error for invalid date format', () => {
      const error = validateValidUntil('invalid-date', '2026-01-30');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('INVALID_VALID_UNTIL');
    });
  });

  describe('validateDueDate', () => {
    it('should return null when dueDate >= issueDate', () => {
      expect(validateDueDate('2026-02-28', '2026-01-30')).toBeNull();
      expect(validateDueDate('2026-01-30', '2026-01-30')).toBeNull(); // same day OK
    });

    it('should return null when dueDate is null (optional)', () => {
      expect(validateDueDate(null, '2026-01-30')).toBeNull();
    });

    it('should return error when dueDate < issueDate', () => {
      const error = validateDueDate('2026-01-29', '2026-01-30');
      expect(error).not.toBeNull();
      expect(error?.code).toBe('INVALID_DUE_DATE');
    });

    it('should return error for invalid date format', () => {
      const error = validateDueDate('2026-02-31', '2026-01-30'); // Feb 31 doesn't exist
      expect(error).not.toBeNull();
      expect(error?.code).toBe('INVALID_DUE_DATE');
    });
  });

  describe('validatePaidAt', () => {
    describe('when status is paid', () => {
      it('should return error when paidAt is null (required)', () => {
        const error = validatePaidAt(null, 'paid', '2026-01-15', TODAY);
        expect(error).not.toBeNull();
        expect(error?.code).toBe('PAID_AT_REQUIRED');
      });

      it('should return null when paidAt is valid', () => {
        expect(validatePaidAt('2026-01-25', 'paid', '2026-01-15', TODAY)).toBeNull();
      });

      it('should return null when paidAt equals today', () => {
        expect(validatePaidAt(TODAY, 'paid', '2026-01-15', TODAY)).toBeNull();
      });

      it('should return null when paidAt equals issueDate', () => {
        expect(validatePaidAt('2026-01-15', 'paid', '2026-01-15', TODAY)).toBeNull();
      });

      it('should return error when paidAt is future date', () => {
        const error = validatePaidAt('2026-02-01', 'paid', '2026-01-15', TODAY);
        expect(error).not.toBeNull();
        expect(error?.code).toBe('PAID_AT_FUTURE');
      });

      it('should return error when paidAt < issueDate', () => {
        const error = validatePaidAt('2026-01-14', 'paid', '2026-01-15', TODAY);
        expect(error).not.toBeNull();
        expect(error?.code).toBe('PAID_AT_BEFORE_ISSUE');
      });
    });

    describe('when status is not paid', () => {
      it('should return error when paidAt is set for draft status', () => {
        const error = validatePaidAt('2026-01-25', 'draft', '2026-01-15', TODAY);
        expect(error).not.toBeNull();
        expect(error?.code).toBe('PAID_AT_FORBIDDEN');
      });

      it('should return error when paidAt is set for sent status', () => {
        const error = validatePaidAt('2026-01-25', 'sent', '2026-01-15', TODAY);
        expect(error).not.toBeNull();
        expect(error?.code).toBe('PAID_AT_FORBIDDEN');
      });

      it('should return null when paidAt is null for draft status', () => {
        expect(validatePaidAt(null, 'draft', '2026-01-15', TODAY)).toBeNull();
      });

      it('should return null when paidAt is null for sent status', () => {
        expect(validatePaidAt(null, 'sent', '2026-01-15', TODAY)).toBeNull();
      });
    });
  });

  describe('validateLineItem', () => {
    it('should return empty array for valid line item', () => {
      const errors = validateLineItem(createTestLineItem());
      expect(errors).toHaveLength(0);
    });

    it('should return error for empty name', () => {
      const errors = validateLineItem(createTestLineItem({ name: '' }));
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.code === 'INVALID_LINE_ITEM')).toBe(true);
    });

    it('should return error for whitespace-only name', () => {
      const errors = validateLineItem(createTestLineItem({ name: '   ' }));
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return error for empty unit', () => {
      const errors = validateLineItem(createTestLineItem({ unit: '' }));
      expect(errors.some((e) => e.code === 'INVALID_UNIT')).toBe(true);
    });

    it('should return error for whitespace-only unit', () => {
      const errors = validateLineItem(createTestLineItem({ unit: '   ' }));
      expect(errors.some((e) => e.code === 'INVALID_UNIT')).toBe(true);
    });

    it('should return error for quantityMilli < MIN_QUANTITY_MILLI', () => {
      const errors = validateLineItem(createTestLineItem({ quantityMilli: 0 }));
      expect(errors.some((e) => e.code === 'INVALID_QUANTITY')).toBe(true);
    });

    it('should return error for quantityMilli > MAX_QUANTITY_MILLI', () => {
      const errors = validateLineItem(
        createTestLineItem({ quantityMilli: MAX_QUANTITY_MILLI + 1 })
      );
      expect(errors.some((e) => e.code === 'INVALID_QUANTITY')).toBe(true);
    });

    it('should accept quantityMilli at boundaries', () => {
      expect(
        validateLineItem(createTestLineItem({ quantityMilli: MIN_QUANTITY_MILLI }))
      ).toHaveLength(0);
      expect(
        validateLineItem(createTestLineItem({ quantityMilli: MAX_QUANTITY_MILLI }))
      ).toHaveLength(0);
    });

    it('should return error for unitPrice < MIN_UNIT_PRICE', () => {
      const errors = validateLineItem(createTestLineItem({ unitPrice: -1 }));
      expect(errors.some((e) => e.code === 'INVALID_UNIT_PRICE')).toBe(true);
    });

    it('should return error for unitPrice > MAX_UNIT_PRICE', () => {
      const errors = validateLineItem(
        createTestLineItem({ unitPrice: MAX_UNIT_PRICE + 1 })
      );
      expect(errors.some((e) => e.code === 'INVALID_UNIT_PRICE')).toBe(true);
    });

    it('should accept unitPrice at boundaries', () => {
      expect(
        validateLineItem(createTestLineItem({ unitPrice: MIN_UNIT_PRICE }))
      ).toHaveLength(0);
      expect(
        validateLineItem(createTestLineItem({ unitPrice: MAX_UNIT_PRICE }))
      ).toHaveLength(0);
    });

    it('should return error for invalid taxRate', () => {
      // @ts-expect-error Testing invalid tax rate
      const errors = validateLineItem(createTestLineItem({ taxRate: 8 }));
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept valid taxRates (0 and 10)', () => {
      expect(validateLineItem(createTestLineItem({ taxRate: 0 }))).toHaveLength(0);
      expect(validateLineItem(createTestLineItem({ taxRate: 10 }))).toHaveLength(0);
    });

    it('should return error for calculation overflow', () => {
      // quantityMilli * unitPrice > MAX_SAFE_INTEGER
      const errors = validateLineItem(
        createTestLineItem({
          quantityMilli: MAX_QUANTITY_MILLI,
          unitPrice: MAX_UNIT_PRICE,
        })
      );
      expect(errors.some((e) => e.code === 'CALCULATION_OVERFLOW')).toBe(true);
    });

    it('should return multiple errors for multiple issues', () => {
      const errors = validateLineItem(
        createTestLineItem({
          name: '',
          quantityMilli: 0,
          unitPrice: -1,
        })
      );
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('validateLineItems', () => {
    it('should return error for empty array', () => {
      const errors = validateLineItems([]);
      expect(errors.some((e) => e.code === 'INVALID_LINE_ITEMS')).toBe(true);
    });

    it('should return empty array for valid items', () => {
      const errors = validateLineItems([createTestLineItem()]);
      expect(errors).toHaveLength(0);
    });

    it('should return error for exceeding MAX_LINE_ITEMS', () => {
      const items = Array(MAX_LINE_ITEMS + 1)
        .fill(null)
        .map(() => createTestLineItem());
      const errors = validateLineItems(items);
      expect(errors.some((e) => e.code === 'INVALID_LINE_ITEMS')).toBe(true);
    });

    it('should accept exactly MAX_LINE_ITEMS', () => {
      const items = Array(MAX_LINE_ITEMS)
        .fill(null)
        .map(() => createTestLineItem());
      const errors = validateLineItems(items);
      expect(errors).toHaveLength(0);
    });

    it('should aggregate errors from all items', () => {
      const errors = validateLineItems([
        createTestLineItem({ name: '' }),
        createTestLineItem({ quantityMilli: 0 }),
      ]);
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('validateDocumentTotal', () => {
    it('should return null for total within limit', () => {
      const items = [createTestLineItem({ quantityMilli: 1000, unitPrice: 10000 })];
      expect(validateDocumentTotal(items)).toBeNull();
    });

    it('should return error for total exceeding MAX_TOTAL_YEN', () => {
      // Create items that exceed MAX_TOTAL_YEN
      const items = [
        createTestLineItem({
          quantityMilli: 1000000, // 1000.000
          unitPrice: MAX_TOTAL_YEN / 100, // This will exceed limit
        }),
      ];
      const error = validateDocumentTotal(items);
      expect(error?.code).toBe('INVALID_TOTAL');
    });

    it('should return null for empty items (0 total)', () => {
      expect(validateDocumentTotal([])).toBeNull();
    });
  });

  describe('validateDocument', () => {
    it('should return empty array for valid document', () => {
      const errors = validateDocument(createTestDocument(), TODAY);
      expect(errors).toHaveLength(0);
    });

    it('should aggregate all validation errors', () => {
      const doc = createTestDocument({
        clientName: '',
        issueDate: 'invalid',
        lineItems: [],
      });
      const errors = validateDocument(doc, TODAY);
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should validate estimate-specific fields', () => {
      const doc = createTestDocument({
        type: 'estimate',
        validUntil: '2026-01-29', // before issueDate
        issueDate: '2026-01-30',
      });
      const errors = validateDocument(doc, TODAY);
      expect(errors.some((e) => e.code === 'INVALID_VALID_UNTIL')).toBe(true);
    });

    it('should validate invoice-specific fields', () => {
      const doc = createTestDocument({
        type: 'invoice',
        validUntil: null,
        dueDate: '2026-01-29', // before issueDate
        issueDate: '2026-01-30',
      });
      const errors = validateDocument(doc, TODAY);
      expect(errors.some((e) => e.code === 'INVALID_DUE_DATE')).toBe(true);
    });

    it('should validate paidAt for invoice with paid status', () => {
      const doc = createTestDocument({
        type: 'invoice',
        status: 'paid',
        paidAt: null, // required for paid status
        validUntil: null,
      });
      const errors = validateDocument(doc, TODAY);
      expect(errors.some((e) => e.code === 'PAID_AT_REQUIRED')).toBe(true);
    });

    it('should pass for valid paid invoice', () => {
      const doc = createTestDocument({
        type: 'invoice',
        status: 'paid',
        paidAt: '2026-01-25',
        issueDate: '2026-01-20',
        validUntil: null,
      });
      const errors = validateDocument(doc, TODAY);
      expect(errors).toHaveLength(0);
    });

    it('should return error when estimate has dueDate', () => {
      const doc = createTestDocument({
        type: 'estimate',
        dueDate: '2026-02-28', // estimate should not have dueDate
      });
      const errors = validateDocument(doc, TODAY);
      expect(errors.some((e) => e.code === 'TYPE_FIELD_MISMATCH')).toBe(true);
      expect(errors.some((e) => e.field === 'dueDate')).toBe(true);
    });

    it('should return error when estimate has paidAt', () => {
      const doc = createTestDocument({
        type: 'estimate',
        paidAt: '2026-01-25', // estimate should not have paidAt
      });
      const errors = validateDocument(doc, TODAY);
      expect(errors.some((e) => e.code === 'TYPE_FIELD_MISMATCH')).toBe(true);
      expect(errors.some((e) => e.field === 'paidAt')).toBe(true);
    });

    it('should return error when estimate has paid status', () => {
      const doc = createTestDocument({
        type: 'estimate',
        status: 'paid', // estimate cannot have paid status
      });
      const errors = validateDocument(doc, TODAY);
      expect(errors.some((e) => e.code === 'TYPE_FIELD_MISMATCH')).toBe(true);
      expect(errors.some((e) => e.field === 'status')).toBe(true);
    });

    it('should return error when invoice has validUntil', () => {
      const doc = createTestDocument({
        type: 'invoice',
        validUntil: '2026-02-28', // invoice should not have validUntil
        dueDate: null,
      });
      const errors = validateDocument(doc, TODAY);
      expect(errors.some((e) => e.code === 'TYPE_FIELD_MISMATCH')).toBe(true);
      expect(errors.some((e) => e.field === 'validUntil')).toBe(true);
    });
  });

  describe('getEditableFields', () => {
    it('should return all fields for draft status', () => {
      const fields = getEditableFields('draft');
      expect(fields.has('clientName')).toBe(true);
      expect(fields.has('lineItems')).toBe(true);
      expect(fields.has('issueDate')).toBe(true);
      expect(fields.has('notes')).toBe(true);
    });

    it('should return all fields for sent status', () => {
      const fields = getEditableFields('sent');
      expect(fields.has('clientName')).toBe(true);
      expect(fields.has('lineItems')).toBe(true);
      expect(fields.has('issueDate')).toBe(true);
      expect(fields.has('notes')).toBe(true);
    });

    it('should include customerId for draft status', () => {
      const fields = getEditableFields('draft');
      expect(fields.has('customerId')).toBe(true);
    });

    it('should include carriedForwardAmount for draft status', () => {
      const fields = getEditableFields('draft');
      expect(fields.has('carriedForwardAmount')).toBe(true);
    });

    it('should include customerId for sent status', () => {
      const fields = getEditableFields('sent');
      expect(fields.has('customerId')).toBe(true);
    });

    it('should include carriedForwardAmount for sent status', () => {
      const fields = getEditableFields('sent');
      expect(fields.has('carriedForwardAmount')).toBe(true);
    });

    it('should return only paidAt and status for paid status', () => {
      const fields = getEditableFields('paid');
      expect(fields.has('paidAt')).toBe(true);
      expect(fields.has('status')).toBe(true);
      expect(fields.has('clientName')).toBe(false);
      expect(fields.has('lineItems')).toBe(false);
      expect(fields.has('issueDate')).toBe(false);
    });
  });

  describe('validateEditAllowed', () => {
    it('should return null when editing allowed fields in paid status', () => {
      const original = createTestDocument({
        type: 'invoice',
        status: 'paid',
        paidAt: '2026-01-25',
        validUntil: null,
      });
      const updated = { ...original, paidAt: '2026-01-26' };
      expect(validateEditAllowed(original, updated)).toBeNull();
    });

    it('should return error when editing forbidden fields in paid status', () => {
      const original = createTestDocument({
        type: 'invoice',
        status: 'paid',
        paidAt: '2026-01-25',
        validUntil: null,
      });
      const updated = { ...original, clientName: 'New Client' };
      const error = validateEditAllowed(original, updated);
      expect(error).not.toBeNull();
      expect(error?.code).toBe('EDIT_NOT_ALLOWED');
    });

    it('should return null for any edit in draft status', () => {
      const original = createTestDocument({ status: 'draft' });
      const updated = {
        ...original,
        clientName: 'New Client',
        lineItems: [createTestLineItem({ name: 'New Item' })],
      };
      expect(validateEditAllowed(original, updated)).toBeNull();
    });

    it('should return null for any edit in sent status', () => {
      const original = createTestDocument({ status: 'sent' });
      const updated = {
        ...original,
        clientName: 'New Client',
        issueDate: '2026-02-01',
      };
      expect(validateEditAllowed(original, updated)).toBeNull();
    });

    it('should return error when editing customerId in paid status', () => {
      const original = createTestDocument({
        type: 'invoice',
        status: 'paid',
        paidAt: '2026-01-25',
        validUntil: null,
        customerId: 'cust-1',
      });
      const updated = { ...original, customerId: 'cust-2' };
      const error = validateEditAllowed(original, updated);
      expect(error).not.toBeNull();
      expect(error?.code).toBe('EDIT_NOT_ALLOWED');
    });

    it('should return error when editing carriedForwardAmount in paid status', () => {
      const original = createTestDocument({
        type: 'invoice',
        status: 'paid',
        paidAt: '2026-01-25',
        validUntil: null,
        carriedForwardAmount: 1000,
      });
      const updated = { ...original, carriedForwardAmount: 2000 };
      const error = validateEditAllowed(original, updated);
      expect(error).not.toBeNull();
      expect(error?.code).toBe('EDIT_NOT_ALLOWED');
    });

    it('should detect changes in nested lineItems for paid status', () => {
      const original = createTestDocument({
        type: 'invoice',
        status: 'paid',
        paidAt: '2026-01-25',
        validUntil: null,
      });
      const updated = {
        ...original,
        lineItems: [createTestLineItem({ name: 'Changed Item' })],
      };
      const error = validateEditAllowed(original, updated);
      expect(error).not.toBeNull();
    });
  });

  describe('sanitizeDocumentType', () => {
    it('returns estimate for type=estimate', () => {
      expect(sanitizeDocumentType('estimate')).toBe('estimate');
    });

    it('returns invoice for type=invoice', () => {
      expect(sanitizeDocumentType('invoice')).toBe('invoice');
    });

    it('falls back to estimate for undefined', () => {
      expect(sanitizeDocumentType(undefined)).toBe('estimate');
    });

    it('falls back to estimate for invalid string', () => {
      expect(sanitizeDocumentType('bogus')).toBe('estimate');
    });
  });
});
