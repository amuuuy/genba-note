/**
 * useUnitPricePicker Pure Functions Tests
 *
 * Tests the category extraction logic.
 * Hook behavior requires React, tested via integration tests.
 */

// Mock storage before imports
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  getAllKeys: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/domain/unitPrice', () => ({
  listUnitPrices: jest.fn(),
  unitPriceToLineItemInput: jest.fn(),
}));

import { extractCategories } from '@/hooks/useUnitPricePicker';
import type { UnitPrice } from '@/types/unitPrice';

describe('useUnitPricePicker', () => {
  // Test helper to create a unit price
  function createUnitPrice(overrides: Partial<UnitPrice> = {}): UnitPrice {
    return {
      id: 'up-1',
      name: '塗装工事',
      unit: 'm²',
      defaultPrice: 5000,
      defaultTaxRate: 10,
      category: null,
      notes: null,
      packQty: null,
      packPrice: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    };
  }

  describe('extractCategories', () => {
    it('returns empty array for empty input', () => {
      const categories = extractCategories([]);
      expect(categories).toEqual([]);
    });

    it('returns empty array when no categories', () => {
      const unitPrices = [
        createUnitPrice({ category: null }),
        createUnitPrice({ category: null }),
      ];
      const categories = extractCategories(unitPrices);
      expect(categories).toEqual([]);
    });

    it('extracts unique categories', () => {
      const unitPrices = [
        createUnitPrice({ category: '塗装' }),
        createUnitPrice({ category: '電気' }),
        createUnitPrice({ category: '塗装' }), // duplicate
      ];
      const categories = extractCategories(unitPrices);
      expect(categories).toHaveLength(2);
      expect(categories).toContain('塗装');
      expect(categories).toContain('電気');
    });

    it('sorts categories in Japanese order', () => {
      const unitPrices = [
        createUnitPrice({ category: '塗装' }),
        createUnitPrice({ category: '電気' }),
        createUnitPrice({ category: '設備' }),
      ];
      const categories = extractCategories(unitPrices);
      // Sorted by localeCompare('ja'): 設備 < 電気 < 塗装
      expect(categories[0]).toBe('設備');
      expect(categories[1]).toBe('電気');
      expect(categories[2]).toBe('塗装');
    });

    it('excludes null categories', () => {
      const unitPrices = [
        createUnitPrice({ category: '塗装' }),
        createUnitPrice({ category: null }),
        createUnitPrice({ category: '電気' }),
      ];
      const categories = extractCategories(unitPrices);
      expect(categories).toHaveLength(2);
      expect(categories).not.toContain(null);
    });
  });
});
