/**
 * Tests for UnitPrice search service
 *
 * TDD: These tests are written first, then implementation follows.
 */

import {
  matchesSearchText,
  matchesCategory,
  filterUnitPrices,
  getUniqueCategories,
  sortUnitPrices,
} from '@/domain/unitPrice/searchService';
import {
  createTestUnitPrice,
  createTestUnitPrices,
  createTestUnitPricesWithCategories,
} from './helpers';

describe('searchService', () => {
  describe('matchesSearchText', () => {
    it('should match when name contains search text', () => {
      const unitPrice = createTestUnitPrice({ name: '塗装工事' });
      expect(matchesSearchText(unitPrice, '塗装')).toBe(true);
    });

    it('should match when category contains search text', () => {
      const unitPrice = createTestUnitPrice({
        name: '工事A',
        category: '電気工事',
      });
      expect(matchesSearchText(unitPrice, '電気')).toBe(true);
    });

    it('should match when notes contains search text', () => {
      const unitPrice = createTestUnitPrice({
        name: '工事A',
        notes: '特殊な作業が必要',
      });
      expect(matchesSearchText(unitPrice, '特殊')).toBe(true);
    });

    it('should be case-insensitive for ASCII characters', () => {
      const unitPrice = createTestUnitPrice({ name: 'Paint Work' });
      expect(matchesSearchText(unitPrice, 'paint')).toBe(true);
      expect(matchesSearchText(unitPrice, 'PAINT')).toBe(true);
    });

    it('should return false when no match', () => {
      const unitPrice = createTestUnitPrice({
        name: '塗装工事',
        category: '塗装',
        notes: '外壁',
      });
      expect(matchesSearchText(unitPrice, '電気')).toBe(false);
    });

    it('should handle null category and notes', () => {
      const unitPrice = createTestUnitPrice({
        name: '塗装工事',
        category: null,
        notes: null,
      });
      expect(matchesSearchText(unitPrice, '塗装')).toBe(true);
      expect(matchesSearchText(unitPrice, '電気')).toBe(false);
    });

    it('should match partial text', () => {
      const unitPrice = createTestUnitPrice({ name: '外壁塗装工事' });
      expect(matchesSearchText(unitPrice, '塗装')).toBe(true);
      expect(matchesSearchText(unitPrice, '外壁')).toBe(true);
      expect(matchesSearchText(unitPrice, '工事')).toBe(true);
    });
  });

  describe('matchesCategory', () => {
    it('should match exact category', () => {
      const unitPrice = createTestUnitPrice({ category: '塗装' });
      expect(matchesCategory(unitPrice, '塗装')).toBe(true);
    });

    it('should return false for different category', () => {
      const unitPrice = createTestUnitPrice({ category: '塗装' });
      expect(matchesCategory(unitPrice, '電気')).toBe(false);
    });

    it('should return false for null category', () => {
      const unitPrice = createTestUnitPrice({ category: null });
      expect(matchesCategory(unitPrice, '塗装')).toBe(false);
    });

    it('should be case-sensitive', () => {
      const unitPrice = createTestUnitPrice({ category: 'Paint' });
      expect(matchesCategory(unitPrice, 'Paint')).toBe(true);
      expect(matchesCategory(unitPrice, 'paint')).toBe(false);
    });
  });

  describe('filterUnitPrices', () => {
    it('should return all when no filter provided', () => {
      const unitPrices = createTestUnitPrices(5);
      const result = filterUnitPrices(unitPrices);
      expect(result.length).toBe(5);
    });

    it('should return all when filter is undefined', () => {
      const unitPrices = createTestUnitPrices(3);
      const result = filterUnitPrices(unitPrices, undefined);
      expect(result.length).toBe(3);
    });

    it('should return all when filter is empty object', () => {
      const unitPrices = createTestUnitPrices(3);
      const result = filterUnitPrices(unitPrices, {});
      expect(result.length).toBe(3);
    });

    it('should filter by searchText', () => {
      const unitPrices = createTestUnitPricesWithCategories();
      const result = filterUnitPrices(unitPrices, { searchText: '塗装' });
      expect(result.length).toBe(2); // '塗装工事' and '外壁塗装'
    });

    it('should filter by category', () => {
      const unitPrices = createTestUnitPricesWithCategories();
      const result = filterUnitPrices(unitPrices, { category: '塗装' });
      expect(result.length).toBe(2);
    });

    it('should combine searchText and category filters (AND logic)', () => {
      const unitPrices = createTestUnitPricesWithCategories();
      const result = filterUnitPrices(unitPrices, {
        searchText: '外壁',
        category: '塗装',
      });
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('外壁塗装');
    });

    it('should return empty array when no matches', () => {
      const unitPrices = createTestUnitPricesWithCategories();
      const result = filterUnitPrices(unitPrices, { searchText: 'ありえない' });
      expect(result.length).toBe(0);
    });

    it('should not mutate original array', () => {
      const unitPrices = createTestUnitPrices(3);
      const original = [...unitPrices];
      filterUnitPrices(unitPrices, { searchText: 'test' });
      expect(unitPrices).toEqual(original);
    });
  });

  describe('getUniqueCategories', () => {
    it('should return unique categories', () => {
      const unitPrices = createTestUnitPricesWithCategories();
      const categories = getUniqueCategories(unitPrices);
      expect(categories).toContain('塗装');
      expect(categories).toContain('電気');
      expect(categories).toContain('設備');
      expect(categories.length).toBe(3);
    });

    it('should exclude null categories', () => {
      const unitPrices = [
        createTestUnitPrice({ category: '塗装' }),
        createTestUnitPrice({ category: null }),
        createTestUnitPrice({ category: '電気' }),
      ];
      const categories = getUniqueCategories(unitPrices);
      expect(categories).not.toContain(null);
      expect(categories.length).toBe(2);
    });

    it('should return empty array for empty input', () => {
      const categories = getUniqueCategories([]);
      expect(categories).toEqual([]);
    });

    it('should return empty array when all categories are null', () => {
      const unitPrices = [
        createTestUnitPrice({ category: null }),
        createTestUnitPrice({ category: null }),
      ];
      const categories = getUniqueCategories(unitPrices);
      expect(categories).toEqual([]);
    });

    it('should return sorted categories', () => {
      const unitPrices = [
        createTestUnitPrice({ category: 'C' }),
        createTestUnitPrice({ category: 'A' }),
        createTestUnitPrice({ category: 'B' }),
      ];
      const categories = getUniqueCategories(unitPrices);
      expect(categories).toEqual(['A', 'B', 'C']); // sorted alphabetically
    });
  });

  describe('sortUnitPrices', () => {
    it('should sort by name ascending', () => {
      const unitPrices = [
        createTestUnitPrice({ id: '1', name: 'C工事' }),
        createTestUnitPrice({ id: '2', name: 'A工事' }),
        createTestUnitPrice({ id: '3', name: 'B工事' }),
      ];
      const sorted = sortUnitPrices(unitPrices, 'name', 'asc');
      expect(sorted[0].name).toBe('A工事');
      expect(sorted[1].name).toBe('B工事');
      expect(sorted[2].name).toBe('C工事');
    });

    it('should sort by name descending', () => {
      const unitPrices = [
        createTestUnitPrice({ id: '1', name: 'A工事' }),
        createTestUnitPrice({ id: '2', name: 'C工事' }),
        createTestUnitPrice({ id: '3', name: 'B工事' }),
      ];
      const sorted = sortUnitPrices(unitPrices, 'name', 'desc');
      expect(sorted[0].name).toBe('C工事');
      expect(sorted[1].name).toBe('B工事');
      expect(sorted[2].name).toBe('A工事');
    });

    it('should sort by defaultPrice ascending', () => {
      const unitPrices = [
        createTestUnitPrice({ id: '1', defaultPrice: 30000 }),
        createTestUnitPrice({ id: '2', defaultPrice: 10000 }),
        createTestUnitPrice({ id: '3', defaultPrice: 20000 }),
      ];
      const sorted = sortUnitPrices(unitPrices, 'defaultPrice', 'asc');
      expect(sorted[0].defaultPrice).toBe(10000);
      expect(sorted[1].defaultPrice).toBe(20000);
      expect(sorted[2].defaultPrice).toBe(30000);
    });

    it('should sort by createdAt descending (newest first)', () => {
      const now = Date.now();
      const unitPrices = [
        createTestUnitPrice({ id: '1', createdAt: now - 2000 }),
        createTestUnitPrice({ id: '2', createdAt: now }),
        createTestUnitPrice({ id: '3', createdAt: now - 1000 }),
      ];
      const sorted = sortUnitPrices(unitPrices, 'createdAt', 'desc');
      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('1');
    });

    it('should sort by category with null values at the end', () => {
      const unitPrices = [
        createTestUnitPrice({ id: '1', category: null }),
        createTestUnitPrice({ id: '2', category: 'A' }),
        createTestUnitPrice({ id: '3', category: 'B' }),
      ];
      const sorted = sortUnitPrices(unitPrices, 'category', 'asc');
      expect(sorted[0].category).toBe('A');
      expect(sorted[1].category).toBe('B');
      expect(sorted[2].category).toBeNull();
    });

    it('should not mutate original array', () => {
      const unitPrices = [
        createTestUnitPrice({ id: '1', name: 'C工事' }),
        createTestUnitPrice({ id: '2', name: 'A工事' }),
      ];
      const original = [...unitPrices];
      sortUnitPrices(unitPrices, 'name', 'asc');
      expect(unitPrices).toEqual(original);
    });
  });
});
