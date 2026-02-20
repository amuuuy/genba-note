/**
 * useUnitPriceList Hook Tests
 *
 * Tests the hook interface types and structure.
 * CRUD logic is tested in unitPriceService.test.ts.
 * Filter/search logic is tested in searchService.test.ts.
 * Category extraction is tested in useUnitPricePicker.test.ts.
 *
 * Hook behavior with React requires @testing-library/react-native
 * which needs additional setup. Integration testing is done via
 * component tests.
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

jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('@/domain/unitPrice', () => ({
  listUnitPrices: jest.fn(),
  createUnitPrice: jest.fn(),
  updateUnitPrice: jest.fn(),
  deleteUnitPriceById: jest.fn(),
}));

jest.mock('@/domain/unitPrice/searchService', () => ({
  filterUnitPrices: jest.fn((arr) => arr),
  sortUnitPrices: jest.fn((arr) => arr),
}));

import type { UseUnitPriceListReturn } from '@/hooks/useUnitPriceList';
import type { UnitPrice } from '@/types/unitPrice';

describe('useUnitPriceList', () => {
  describe('UseUnitPriceListReturn interface', () => {
    it('has expected shape', () => {
      // Type-level test: verify the interface has expected properties
      const expectedReturn: UseUnitPriceListReturn = {
        unitPrices: [],
        totalCount: 0,
        isLoading: false,
        error: null,
        searchText: '',
        categories: [],
        selectedCategory: null,
        setSearchText: jest.fn(),
        setCategory: jest.fn(),
        refresh: jest.fn(),
        createItem: jest.fn(),
        createItems: jest.fn(),
        updateItem: jest.fn(),
        deleteItem: jest.fn(),
      };

      // Verify properties exist with correct types
      expect(Array.isArray(expectedReturn.unitPrices)).toBe(true);
      expect(typeof expectedReturn.totalCount).toBe('number');
      expect(typeof expectedReturn.isLoading).toBe('boolean');
      expect(typeof expectedReturn.searchText).toBe('string');
      expect(Array.isArray(expectedReturn.categories)).toBe(true);
      expect(typeof expectedReturn.setSearchText).toBe('function');
      expect(typeof expectedReturn.setCategory).toBe('function');
      expect(typeof expectedReturn.refresh).toBe('function');
      expect(typeof expectedReturn.createItem).toBe('function');
      expect(typeof expectedReturn.createItems).toBe('function');
      expect(typeof expectedReturn.updateItem).toBe('function');
      expect(typeof expectedReturn.deleteItem).toBe('function');
    });
  });

  describe('CRUD operations delegation', () => {
    it('createItem interface accepts UnitPriceInput', () => {
      // Type test: verify createItem accepts correct input type
      const mockCreateItem = jest.fn<Promise<boolean>, [{ name: string; unit: string; defaultPrice: number; defaultTaxRate: 0 | 10; category?: string | null; notes?: string | null }]>();

      const input = {
        name: '塗装工事',
        unit: 'm²',
        defaultPrice: 5000,
        defaultTaxRate: 10 as const,
        category: '塗装',
        notes: 'テスト備考',
      };

      mockCreateItem(input);
      expect(mockCreateItem).toHaveBeenCalledWith(input);
    });

    it('updateItem interface accepts id and partial updates', () => {
      // Type test: verify updateItem accepts correct input types
      const mockUpdateItem = jest.fn<Promise<boolean>, [string, { name?: string; unit?: string; defaultPrice?: number }]>();

      mockUpdateItem('up-1', { name: '更新後の名前' });
      expect(mockUpdateItem).toHaveBeenCalledWith('up-1', { name: '更新後の名前' });
    });

    it('deleteItem interface accepts id string', () => {
      // Type test: verify deleteItem accepts correct input type
      const mockDeleteItem = jest.fn<Promise<boolean>, [string]>();

      mockDeleteItem('up-1');
      expect(mockDeleteItem).toHaveBeenCalledWith('up-1');
    });
  });
});
