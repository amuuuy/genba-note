/**
 * Tests for validationService.ts
 * TDD: Tests are written first, implementation follows
 *
 * This service provides line item specific validation functions.
 * It re-exports existing validation from documentValidation and adds helpers.
 */

import {
  validateQuantityMilli,
  validateUnitPrice,
  validateLineItemCalculation,
  // Standalone lineItem validation
  validateLineItem,
  // Document-context validation
  validateLineItemInDocument,
  validateLineItems,
  validateDocumentTotal,
} from '@/domain/lineItem/validationService';
import { createTestLineItem, createTestLineItems } from './helpers';
import {
  MAX_QUANTITY_MILLI,
  MIN_QUANTITY_MILLI,
  MAX_UNIT_PRICE,
  MIN_UNIT_PRICE,
  MAX_LINE_ITEMS,
} from '@/utils/constants';

describe('validationService', () => {
  describe('validateQuantityMilli', () => {
    it('should return null for valid quantity', () => {
      expect(validateQuantityMilli(1000)).toBeNull();
      expect(validateQuantityMilli(MIN_QUANTITY_MILLI)).toBeNull();
      expect(validateQuantityMilli(MAX_QUANTITY_MILLI)).toBeNull();
    });

    it('should return error for quantity below minimum', () => {
      const error = validateQuantityMilli(0);
      expect(error).not.toBeNull();
      expect(error!.code).toBe('INVALID_QUANTITY');
    });

    it('should return error for quantity above maximum', () => {
      const error = validateQuantityMilli(MAX_QUANTITY_MILLI + 1);
      expect(error).not.toBeNull();
      expect(error!.code).toBe('INVALID_QUANTITY');
    });

    it('should return error for negative quantity', () => {
      const error = validateQuantityMilli(-1);
      expect(error).not.toBeNull();
      expect(error!.code).toBe('INVALID_QUANTITY');
    });
  });

  describe('validateUnitPrice', () => {
    it('should return null for valid price', () => {
      expect(validateUnitPrice(1000)).toBeNull();
      expect(validateUnitPrice(MIN_UNIT_PRICE)).toBeNull();
      expect(validateUnitPrice(MAX_UNIT_PRICE)).toBeNull();
    });

    it('should return error for price below minimum', () => {
      const error = validateUnitPrice(-1);
      expect(error).not.toBeNull();
      expect(error!.code).toBe('INVALID_UNIT_PRICE');
    });

    it('should return error for price above maximum', () => {
      const error = validateUnitPrice(MAX_UNIT_PRICE + 1);
      expect(error).not.toBeNull();
      expect(error!.code).toBe('INVALID_UNIT_PRICE');
    });
  });

  describe('validateLineItemCalculation', () => {
    it('should return null for safe calculation', () => {
      expect(validateLineItemCalculation(1000, 1000)).toBeNull();
      expect(validateLineItemCalculation(1000000, 1000)).toBeNull();
    });

    it('should return error for overflow calculation', () => {
      const error = validateLineItemCalculation(MAX_QUANTITY_MILLI, MAX_UNIT_PRICE);
      expect(error).not.toBeNull();
      expect(error!.code).toBe('CALCULATION_OVERFLOW');
    });
  });

  // === Standalone validation (simple field paths) ===

  describe('validateLineItem (standalone)', () => {
    it('should validate a valid line item', () => {
      const errors = validateLineItem(createTestLineItem());
      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid line item', () => {
      const errors = validateLineItem(createTestLineItem({ name: '', quantityMilli: 0 }));
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should use simple field paths (not document-context)', () => {
      const errors = validateLineItem(createTestLineItem({ name: '' }));
      expect(errors[0].field).toBe('name');
      // Should NOT be like 'lineItems[id].name'
      expect(errors[0].field).not.toContain('lineItems[');
    });
  });

  // === Document-context validation (lineItems[id].* paths) ===

  describe('validateLineItemInDocument (document-context)', () => {
    it('should validate a valid line item', () => {
      const errors = validateLineItemInDocument(createTestLineItem());
      expect(errors).toHaveLength(0);
    });

    it('should return errors with document-context field paths', () => {
      const item = createTestLineItem({ name: '' });
      const errors = validateLineItemInDocument(item);
      expect(errors.length).toBeGreaterThan(0);
      // Should be like 'lineItems[id].name'
      expect(errors[0].field).toContain('lineItems[');
    });
  });

  describe('validateLineItems (re-export)', () => {
    it('should validate valid line items array', () => {
      const errors = validateLineItems(createTestLineItems(3));
      expect(errors).toHaveLength(0);
    });

    it('should return error for empty array', () => {
      const errors = validateLineItems([]);
      expect(errors.some((e) => e.code === 'INVALID_LINE_ITEMS')).toBe(true);
    });

    it('should return error for exceeding MAX_LINE_ITEMS', () => {
      const errors = validateLineItems(createTestLineItems(MAX_LINE_ITEMS + 1));
      expect(errors.some((e) => e.code === 'INVALID_LINE_ITEMS')).toBe(true);
    });
  });

  describe('validateDocumentTotal (re-export)', () => {
    it('should return null for valid total', () => {
      const lineItems = createTestLineItems(3, { unitPrice: 1000 });
      expect(validateDocumentTotal(lineItems)).toBeNull();
    });
  });
});
