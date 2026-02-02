/**
 * Test helpers for unitPrice domain tests
 *
 * Provides factory functions for creating test data.
 * These helpers ensure consistent test data across all test files.
 */

import type { UnitPrice } from '@/types/unitPrice';

/**
 * Create a test UnitPrice with sensible defaults
 * @param overrides - Partial UnitPrice to override defaults
 */
export function createTestUnitPrice(overrides?: Partial<UnitPrice>): UnitPrice {
  const now = Date.now();
  return {
    id: `unit-price-${now}-${Math.random().toString(36).substr(2, 9)}`,
    name: 'テスト工事項目',
    unit: '式',
    defaultPrice: 10000,
    defaultTaxRate: 10,
    category: '一般',
    notes: null,
    packQty: null,
    packPrice: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create multiple test unit prices with unique names
 * @param count - Number of unit prices to create
 * @param baseOverrides - Overrides applied to all items
 */
export function createTestUnitPrices(
  count: number,
  baseOverrides?: Partial<UnitPrice>
): UnitPrice[] {
  return Array.from({ length: count }, (_, i) =>
    createTestUnitPrice({
      id: `unit-price-${i}`,
      name: `テスト工事項目 ${i + 1}`,
      ...baseOverrides,
    })
  );
}

/**
 * Create test unit prices with various categories
 */
export function createTestUnitPricesWithCategories(): UnitPrice[] {
  return [
    createTestUnitPrice({ id: 'up-1', name: '塗装工事', category: '塗装', defaultPrice: 5000 }),
    createTestUnitPrice({ id: 'up-2', name: '電気配線工事', category: '電気', defaultPrice: 8000 }),
    createTestUnitPrice({ id: 'up-3', name: '設備取付工事', category: '設備', defaultPrice: 15000 }),
    createTestUnitPrice({ id: 'up-4', name: '外壁塗装', category: '塗装', defaultPrice: 3000, unit: 'm²' }),
    createTestUnitPrice({ id: 'up-5', name: '作業員派遣', category: null, defaultPrice: 25000, unit: '人工' }),
  ];
}
