/**
 * Tests for lineItemToUnitPriceInput conversion function
 *
 * Verifies the reverse conversion from LineItemInput → UnitPriceInput.
 */

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('@/storage/asyncStorageService');
jest.mock('@/storage/secureStorageService');

import { lineItemToUnitPriceInput } from '@/domain/unitPrice/unitPriceService';
import type { LineItemInput } from '@/domain/lineItem/lineItemService';

describe('lineItemToUnitPriceInput', () => {
  it('should convert LineItemInput to UnitPriceInput with correct field mapping', () => {
    const lineItemInput: LineItemInput = {
      name: '外壁塗装工事',
      quantityMilli: 5000,
      unit: 'm²',
      unitPrice: 3000,
      taxRate: 10,
    };

    const result = lineItemToUnitPriceInput(lineItemInput);

    expect(result).toEqual({
      name: '外壁塗装工事',
      unit: 'm²',
      defaultPrice: 3000,
      defaultTaxRate: 10,
      category: null,
      notes: null,
      packQty: null,
      packPrice: null,
    });
  });

  it('should handle tax rate 0 (non-taxable)', () => {
    const lineItemInput: LineItemInput = {
      name: '非課税項目',
      quantityMilli: 1000,
      unit: '式',
      unitPrice: 50000,
      taxRate: 0,
    };

    const result = lineItemToUnitPriceInput(lineItemInput);

    expect(result.defaultTaxRate).toBe(0);
  });

  it('should not include quantityMilli in the output', () => {
    const lineItemInput: LineItemInput = {
      name: 'テスト',
      quantityMilli: 3500,
      unit: '本',
      unitPrice: 100,
      taxRate: 10,
    };

    const result = lineItemToUnitPriceInput(lineItemInput);

    expect(result).not.toHaveProperty('quantityMilli');
  });

  it('should set optional fields to null', () => {
    const lineItemInput: LineItemInput = {
      name: 'テスト項目',
      quantityMilli: 1000,
      unit: '式',
      unitPrice: 10000,
      taxRate: 10,
    };

    const result = lineItemToUnitPriceInput(lineItemInput);

    expect(result.category).toBeNull();
    expect(result.notes).toBeNull();
    expect(result.packQty).toBeNull();
    expect(result.packPrice).toBeNull();
  });
});
