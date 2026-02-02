/**
 * Tests for UnitPrice validation service
 *
 * TDD: These tests are written first, then implementation follows.
 */

import {
  validateName,
  validateUnit,
  validateDefaultPrice,
  validateDefaultTaxRate,
  validatePackQty,
  validatePackPrice,
  validatePackConsistency,
  validateUnitPrice,
  normalizeOptionalString,
} from '@/domain/unitPrice/validationService';
import { createTestUnitPrice } from './helpers';
import { MAX_UNIT_PRICE, MIN_UNIT_PRICE } from '@/utils/constants';

describe('validationService', () => {
  describe('validateName', () => {
    it('should return null for valid name', () => {
      const result = validateName('塗装工事');
      expect(result).toBeNull();
    });

    it('should return error for empty name', () => {
      const result = validateName('');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_NAME');
      expect(result?.field).toBe('name');
    });

    it('should return error for whitespace only name', () => {
      const result = validateName('   ');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_NAME');
    });

    it('should accept name with leading/trailing spaces (trimmed internally)', () => {
      const result = validateName('  塗装工事  ');
      expect(result).toBeNull();
    });
  });

  describe('validateUnit', () => {
    it('should return null for valid unit', () => {
      const result = validateUnit('式');
      expect(result).toBeNull();
    });

    it('should return null for various valid units', () => {
      expect(validateUnit('m')).toBeNull();
      expect(validateUnit('m²')).toBeNull();
      expect(validateUnit('人工')).toBeNull();
      expect(validateUnit('個')).toBeNull();
    });

    it('should return error for empty unit', () => {
      const result = validateUnit('');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_UNIT');
      expect(result?.field).toBe('unit');
    });

    it('should return error for whitespace only unit', () => {
      const result = validateUnit('   ');
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_UNIT');
    });
  });

  describe('validateDefaultPrice', () => {
    it('should return null for valid price (0)', () => {
      const result = validateDefaultPrice(0);
      expect(result).toBeNull();
    });

    it('should return null for valid price (positive)', () => {
      const result = validateDefaultPrice(10000);
      expect(result).toBeNull();
    });

    it('should return null for valid price (MAX_UNIT_PRICE)', () => {
      const result = validateDefaultPrice(MAX_UNIT_PRICE);
      expect(result).toBeNull();
    });

    it('should return error for negative price', () => {
      const result = validateDefaultPrice(-1);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_DEFAULT_PRICE');
      expect(result?.field).toBe('defaultPrice');
    });

    it('should return error for price above MAX_UNIT_PRICE', () => {
      const result = validateDefaultPrice(MAX_UNIT_PRICE + 1);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_DEFAULT_PRICE');
      expect(result?.details).toMatchObject({
        value: MAX_UNIT_PRICE + 1,
        min: MIN_UNIT_PRICE,
        max: MAX_UNIT_PRICE,
      });
    });

    it('should return error for non-integer price', () => {
      const result = validateDefaultPrice(100.5);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_DEFAULT_PRICE');
    });
  });

  describe('validateDefaultTaxRate', () => {
    it('should return null for tax rate 0', () => {
      const result = validateDefaultTaxRate(0);
      expect(result).toBeNull();
    });

    it('should return null for tax rate 10', () => {
      const result = validateDefaultTaxRate(10);
      expect(result).toBeNull();
    });

    it('should return error for invalid tax rate (5)', () => {
      const result = validateDefaultTaxRate(5);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_DEFAULT_TAX_RATE');
      expect(result?.field).toBe('defaultTaxRate');
    });

    it('should return error for negative tax rate', () => {
      const result = validateDefaultTaxRate(-1);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_DEFAULT_TAX_RATE');
    });

    it('should return error for tax rate above 10', () => {
      const result = validateDefaultTaxRate(15);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_DEFAULT_TAX_RATE');
    });
  });

  describe('validateUnitPrice', () => {
    it('should return empty array for valid UnitPrice', () => {
      const unitPrice = createTestUnitPrice();
      const errors = validateUnitPrice(unitPrice);
      expect(errors).toEqual([]);
    });

    it('should return multiple errors for multiple issues', () => {
      const unitPrice = createTestUnitPrice({
        name: '',
        unit: '',
        defaultPrice: -100,
        defaultTaxRate: 5 as 0 | 10,
      });
      const errors = validateUnitPrice(unitPrice);
      expect(errors.length).toBe(4);
      expect(errors.map((e) => e.code)).toContain('INVALID_NAME');
      expect(errors.map((e) => e.code)).toContain('INVALID_UNIT');
      expect(errors.map((e) => e.code)).toContain('INVALID_DEFAULT_PRICE');
      expect(errors.map((e) => e.code)).toContain('INVALID_DEFAULT_TAX_RATE');
    });

    it('should return single error for single issue', () => {
      const unitPrice = createTestUnitPrice({ name: '' });
      const errors = validateUnitPrice(unitPrice);
      expect(errors.length).toBe(1);
      expect(errors[0].code).toBe('INVALID_NAME');
    });
  });

  describe('normalizeOptionalString', () => {
    it('should return null for empty string', () => {
      const result = normalizeOptionalString('');
      expect(result).toBeNull();
    });

    it('should return null for whitespace only string', () => {
      const result = normalizeOptionalString('   ');
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = normalizeOptionalString(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = normalizeOptionalString(undefined);
      expect(result).toBeNull();
    });

    it('should return trimmed string for valid input', () => {
      const result = normalizeOptionalString('  塗装  ');
      expect(result).toBe('塗装');
    });

    it('should preserve valid string without spaces', () => {
      const result = normalizeOptionalString('設備工事');
      expect(result).toBe('設備工事');
    });
  });

  describe('validatePackQty', () => {
    it('should return null for null value (optional field)', () => {
      const result = validatePackQty(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined value (optional field)', () => {
      const result = validatePackQty(undefined);
      expect(result).toBeNull();
    });

    it('should return null for valid positive integer (1)', () => {
      const result = validatePackQty(1);
      expect(result).toBeNull();
    });

    it('should return null for valid positive integer (10)', () => {
      const result = validatePackQty(10);
      expect(result).toBeNull();
    });

    it('should return null for valid positive integer (100)', () => {
      const result = validatePackQty(100);
      expect(result).toBeNull();
    });

    it('should return error for zero', () => {
      const result = validatePackQty(0);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_PACK_QTY');
      expect(result?.field).toBe('packQty');
    });

    it('should return error for negative value', () => {
      const result = validatePackQty(-1);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_PACK_QTY');
    });

    it('should return error for non-integer (decimal)', () => {
      const result = validatePackQty(1.5);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_PACK_QTY');
    });
  });

  describe('validatePackPrice', () => {
    it('should return null for null value (optional field)', () => {
      const result = validatePackPrice(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined value (optional field)', () => {
      const result = validatePackPrice(undefined);
      expect(result).toBeNull();
    });

    it('should return null for valid integer (0)', () => {
      const result = validatePackPrice(0);
      expect(result).toBeNull();
    });

    it('should return null for valid integer (3000)', () => {
      const result = validatePackPrice(3000);
      expect(result).toBeNull();
    });

    it('should return null for valid integer (MAX_UNIT_PRICE)', () => {
      const result = validatePackPrice(MAX_UNIT_PRICE);
      expect(result).toBeNull();
    });

    it('should return error for negative value', () => {
      const result = validatePackPrice(-1);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_PACK_PRICE');
      expect(result?.field).toBe('packPrice');
    });

    it('should return error for value exceeding MAX_UNIT_PRICE', () => {
      const result = validatePackPrice(MAX_UNIT_PRICE + 1);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_PACK_PRICE');
    });

    it('should return error for non-integer (decimal)', () => {
      const result = validatePackPrice(100.5);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_PACK_PRICE');
    });
  });

  describe('validatePackConsistency', () => {
    it('should return null when both packQty and packPrice are null', () => {
      const result = validatePackConsistency(null, null);
      expect(result).toBeNull();
    });

    it('should return null when both packQty and packPrice are undefined', () => {
      const result = validatePackConsistency(undefined, undefined);
      expect(result).toBeNull();
    });

    it('should return null when both packQty and packPrice are set', () => {
      const result = validatePackConsistency(10, 3000);
      expect(result).toBeNull();
    });

    it('should return error when only packQty is set', () => {
      const result = validatePackConsistency(10, null);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_PACK_CONSISTENCY');
    });

    it('should return error when only packPrice is set', () => {
      const result = validatePackConsistency(null, 3000);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_PACK_CONSISTENCY');
    });

    it('should return error when packQty is set and packPrice is undefined', () => {
      const result = validatePackConsistency(10, undefined);
      expect(result).not.toBeNull();
      expect(result?.code).toBe('INVALID_PACK_CONSISTENCY');
    });
  });
});
