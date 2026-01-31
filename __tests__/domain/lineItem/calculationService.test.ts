/**
 * Tests for calculationService.ts
 * TDD: Tests are written first, implementation follows
 *
 * Calculation rules from SPEC 2.4.3:
 * - Line subtotal = Math.floor(quantityMilli * unitPrice / 1000)
 * - Line tax = Math.floor(subtotal * taxRate / 100)
 * - Tax-included total = subtotal + tax
 */

import type { LineItem } from '@/types/document';
import {
  toQuantityMilli,
  fromQuantityMilli,
  calcLineSubtotal,
  calcLineTax,
  calculateLineItem,
  calculateLineItems,
  calculateDocumentTotals,
  enrichDocumentWithTotals,
  validateCalculation,
} from '@/domain/lineItem/calculationService';
import {
  createTestLineItem,
  createTestLineItems,
  createTestDocumentWithLineItems,
} from './helpers';
import {
  MAX_QUANTITY_MILLI,
  MAX_UNIT_PRICE,
} from '@/utils/constants';

describe('calculationService', () => {
  describe('toQuantityMilli', () => {
    it('should convert decimal to milli-units', () => {
      expect(toQuantityMilli(2.5)).toBe(2500);
      expect(toQuantityMilli(1)).toBe(1000);
      expect(toQuantityMilli(0.001)).toBe(1);
      expect(toQuantityMilli(99999.999)).toBe(99999999);
    });

    it('should handle zero', () => {
      expect(toQuantityMilli(0)).toBe(0);
    });

    it('should round to nearest milli for values with more than 3 decimal places', () => {
      expect(toQuantityMilli(0.0005)).toBe(1); // rounds up 0.5
      expect(toQuantityMilli(0.0004)).toBe(0); // rounds down 0.4
      expect(toQuantityMilli(1.2345)).toBe(1235); // rounds 1234.5 -> 1235
    });

    it('should handle large values within valid range', () => {
      expect(toQuantityMilli(50000)).toBe(50000000);
    });
  });

  describe('fromQuantityMilli', () => {
    it('should convert milli-units to decimal', () => {
      expect(fromQuantityMilli(2500)).toBe(2.5);
      expect(fromQuantityMilli(1000)).toBe(1);
      expect(fromQuantityMilli(1)).toBe(0.001);
      expect(fromQuantityMilli(99999999)).toBe(99999.999);
    });

    it('should handle zero', () => {
      expect(fromQuantityMilli(0)).toBe(0);
    });

    it('should preserve precision for round-trip conversion', () => {
      const original = 12.345;
      const milli = toQuantityMilli(original);
      expect(fromQuantityMilli(milli)).toBe(original);
    });
  });

  describe('calcLineSubtotal', () => {
    it('should calculate subtotal correctly', () => {
      // 2.5個 × 100円 = 250円
      expect(calcLineSubtotal(2500, 100)).toBe(250);
      // 1個 × 10000円 = 10000円
      expect(calcLineSubtotal(1000, 10000)).toBe(10000);
    });

    it('should floor the result (SPEC 2.4.3)', () => {
      // 2.333個 × 100円 = 233.3円 → 233円
      expect(calcLineSubtotal(2333, 100)).toBe(233);
      // 3.333 × 1 = 3.333 → 3
      expect(calcLineSubtotal(3333, 1)).toBe(3);
    });

    it('should handle zero values', () => {
      expect(calcLineSubtotal(0, 100)).toBe(0);
      expect(calcLineSubtotal(1000, 0)).toBe(0);
      expect(calcLineSubtotal(0, 0)).toBe(0);
    });

    it('should handle minimum quantity (0.001)', () => {
      // 0.001 × 1000 = 1円
      expect(calcLineSubtotal(1, 1000)).toBe(1);
      // 0.001 × 999 = 0.999 → 0円
      expect(calcLineSubtotal(1, 999)).toBe(0);
    });

    it('should handle large values correctly', () => {
      // 1000 × 1000000 = 1000000000 (1 billion)
      expect(calcLineSubtotal(1000000, 1000000)).toBe(1000000000);
    });
  });

  describe('calcLineTax', () => {
    it('should calculate tax correctly for 10% rate', () => {
      // 100円 × 10% = 10円
      expect(calcLineTax(100, 10)).toBe(10);
      // 1000円 × 10% = 100円
      expect(calcLineTax(1000, 10)).toBe(100);
    });

    it('should return 0 for 0% rate', () => {
      expect(calcLineTax(100, 0)).toBe(0);
      expect(calcLineTax(10000, 0)).toBe(0);
    });

    it('should floor the result (SPEC 2.4.3)', () => {
      // 99円 × 10% = 9.9円 → 9円
      expect(calcLineTax(99, 10)).toBe(9);
      // 1円 × 10% = 0.1円 → 0円
      expect(calcLineTax(1, 10)).toBe(0);
      // 15円 × 10% = 1.5円 → 1円
      expect(calcLineTax(15, 10)).toBe(1);
    });

    it('should handle zero subtotal', () => {
      expect(calcLineTax(0, 10)).toBe(0);
      expect(calcLineTax(0, 0)).toBe(0);
    });
  });

  describe('calculateLineItem', () => {
    it('should return LineItemCalculated with computed values', () => {
      const lineItem = createTestLineItem({
        quantityMilli: 2500, // 2.5
        unitPrice: 1000,
        taxRate: 10,
      });
      const result = calculateLineItem(lineItem);

      // Subtotal: 2.5 × 1000 = 2500
      expect(result.subtotal).toBe(2500);
      // Tax: 2500 × 10% = 250
      expect(result.tax).toBe(250);
      // Original fields preserved
      expect(result.id).toBe(lineItem.id);
      expect(result.name).toBe(lineItem.name);
      expect(result.quantityMilli).toBe(2500);
      expect(result.unitPrice).toBe(1000);
      expect(result.taxRate).toBe(10);
    });

    it('should handle 0% tax rate', () => {
      const lineItem = createTestLineItem({
        quantityMilli: 1000,
        unitPrice: 500,
        taxRate: 0,
      });
      const result = calculateLineItem(lineItem);

      expect(result.subtotal).toBe(500);
      expect(result.tax).toBe(0);
    });

    it('should floor subtotal before calculating tax', () => {
      const lineItem = createTestLineItem({
        quantityMilli: 2333, // 2.333
        unitPrice: 100,
        taxRate: 10,
      });
      const result = calculateLineItem(lineItem);

      // Subtotal: floor(2.333 × 100) = floor(233.3) = 233
      expect(result.subtotal).toBe(233);
      // Tax: floor(233 × 10%) = floor(23.3) = 23
      expect(result.tax).toBe(23);
    });
  });

  describe('calculateLineItems', () => {
    it('should calculate all line items', () => {
      const lineItems = [
        createTestLineItem({ id: 'a', quantityMilli: 1000, unitPrice: 100, taxRate: 10 }),
        createTestLineItem({ id: 'b', quantityMilli: 2000, unitPrice: 200, taxRate: 0 }),
      ];
      const results = calculateLineItems(lineItems);

      expect(results).toHaveLength(2);
      expect(results[0].subtotal).toBe(100); // 1 × 100
      expect(results[0].tax).toBe(10); // 100 × 10%
      expect(results[1].subtotal).toBe(400); // 2 × 200
      expect(results[1].tax).toBe(0); // 0%
    });

    it('should return empty array for empty input', () => {
      expect(calculateLineItems([])).toEqual([]);
    });
  });

  describe('calculateDocumentTotals', () => {
    it('should calculate totals correctly', () => {
      const lineItems: LineItem[] = [
        createTestLineItem({ quantityMilli: 1000, unitPrice: 1000, taxRate: 10 }),
        createTestLineItem({ quantityMilli: 2000, unitPrice: 500, taxRate: 0 }),
      ];
      const result = calculateDocumentTotals(lineItems);

      // Line A: subtotal=1000, tax=100
      // Line B: subtotal=1000, tax=0
      expect(result.subtotalYen).toBe(2000);
      expect(result.taxYen).toBe(100);
      expect(result.totalYen).toBe(2100);
    });

    it('should provide tax breakdown by rate', () => {
      const lineItems: LineItem[] = [
        createTestLineItem({ quantityMilli: 1000, unitPrice: 1000, taxRate: 10 }),
        createTestLineItem({ quantityMilli: 1000, unitPrice: 2000, taxRate: 10 }),
        createTestLineItem({ quantityMilli: 1000, unitPrice: 500, taxRate: 0 }),
      ];
      const result = calculateDocumentTotals(lineItems);

      expect(result.taxBreakdown).toHaveLength(2);

      // 10% rate breakdown
      const rate10 = result.taxBreakdown.find((b) => b.rate === 10);
      expect(rate10).toBeDefined();
      expect(rate10!.subtotal).toBe(3000); // 1000 + 2000
      expect(rate10!.tax).toBe(300); // 100 + 200

      // 0% rate breakdown
      const rate0 = result.taxBreakdown.find((b) => b.rate === 0);
      expect(rate0).toBeDefined();
      expect(rate0!.subtotal).toBe(500);
      expect(rate0!.tax).toBe(0);
    });

    it('should handle empty line items', () => {
      const result = calculateDocumentTotals([]);

      expect(result.subtotalYen).toBe(0);
      expect(result.taxYen).toBe(0);
      expect(result.totalYen).toBe(0);
      expect(result.taxBreakdown).toEqual([]);
    });

    it('should handle all 0% tax rate items', () => {
      const lineItems = createTestLineItems(3, { taxRate: 0, unitPrice: 100 });
      const result = calculateDocumentTotals(lineItems);

      expect(result.taxYen).toBe(0);
      expect(result.totalYen).toBe(result.subtotalYen);
      expect(result.taxBreakdown).toHaveLength(1);
      expect(result.taxBreakdown[0].rate).toBe(0);
    });

    it('should satisfy invariant: totalYen = subtotalYen + taxYen', () => {
      const lineItems = [
        createTestLineItem({ quantityMilli: 1234, unitPrice: 567, taxRate: 10 }),
        createTestLineItem({ quantityMilli: 8901, unitPrice: 234, taxRate: 0 }),
        createTestLineItem({ quantityMilli: 5678, unitPrice: 901, taxRate: 10 }),
      ];
      const result = calculateDocumentTotals(lineItems);

      expect(result.totalYen).toBe(result.subtotalYen + result.taxYen);
    });
  });

  describe('enrichDocumentWithTotals', () => {
    it('should return DocumentWithTotals', () => {
      const lineItems = [
        createTestLineItem({ quantityMilli: 1000, unitPrice: 10000, taxRate: 10 }),
      ];
      const document = createTestDocumentWithLineItems(lineItems);
      const result = enrichDocumentWithTotals(document);

      // Original document fields preserved
      expect(result.id).toBe(document.id);
      expect(result.documentNo).toBe(document.documentNo);
      expect(result.clientName).toBe(document.clientName);

      // Calculated totals
      expect(result.subtotalYen).toBe(10000);
      expect(result.taxYen).toBe(1000);
      expect(result.totalYen).toBe(11000);

      // LineItemCalculated array
      expect(result.lineItemsCalculated).toHaveLength(1);
      expect(result.lineItemsCalculated[0].subtotal).toBe(10000);
      expect(result.lineItemsCalculated[0].tax).toBe(1000);

      // Tax breakdown
      expect(result.taxBreakdown).toHaveLength(1);
      expect(result.taxBreakdown[0].rate).toBe(10);
    });
  });

  describe('validateCalculation', () => {
    it('should not throw for safe values', () => {
      expect(() => validateCalculation(1000, 1000)).not.toThrow();
      expect(() => validateCalculation(1000000, 1000)).not.toThrow();
      expect(() => validateCalculation(1000, 1000000)).not.toThrow();
    });

    it('should throw for overflow values', () => {
      // MAX_QUANTITY_MILLI * MAX_UNIT_PRICE > MAX_SAFE_INTEGER
      expect(() =>
        validateCalculation(MAX_QUANTITY_MILLI, MAX_UNIT_PRICE)
      ).toThrow();
    });

    it('should throw with descriptive error message', () => {
      expect(() =>
        validateCalculation(MAX_QUANTITY_MILLI, MAX_UNIT_PRICE)
      ).toThrow(/overflow|exceeds|safe/i);
    });

    it('should not throw at safe boundary', () => {
      // Find a value just under the overflow threshold
      // MAX_SAFE_INTEGER = 9007199254740991
      // If quantityMilli = 90071992, unitPrice = 100 → 9007199200 (safe)
      expect(() => validateCalculation(90071992, 100)).not.toThrow();
    });
  });
});
