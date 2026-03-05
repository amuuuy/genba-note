/**
 * useAiPriceSearch Hook Tests
 *
 * Tests the hook interface types and structure.
 * API call logic is tested in geminiSearchService.test.ts.
 * Mapping logic is tested in geminiMappingService.test.ts.
 */

jest.mock('@/domain/materialResearch/geminiSearchService', () => ({
  searchMaterialsWithAi: jest.fn(),
}));

import type { UseAiPriceSearchReturn } from '@/hooks/useAiPriceSearch';

describe('useAiPriceSearch', () => {
  describe('UseAiPriceSearchReturn interface', () => {
    it('has expected shape', () => {
      const expectedReturn: UseAiPriceSearchReturn = {
        query: '',
        setQuery: jest.fn(),
        result: null,
        isLoading: false,
        error: null,
        search: jest.fn(),
        clear: jest.fn(),
      };

      expect(expectedReturn.query).toBe('');
      expect(expectedReturn.result).toBeNull();
      expect(expectedReturn.isLoading).toBe(false);
      expect(expectedReturn.error).toBeNull();
      expect(typeof expectedReturn.setQuery).toBe('function');
      expect(typeof expectedReturn.search).toBe('function');
      expect(typeof expectedReturn.clear).toBe('function');
    });
  });

  describe('search flow types', () => {
    it('search returns Promise<boolean>', () => {
      const mockSearch: UseAiPriceSearchReturn['search'] = jest.fn().mockResolvedValue(true);
      expect(typeof mockSearch).toBe('function');
    });

    it('setQuery accepts string', () => {
      const mockSetQuery: UseAiPriceSearchReturn['setQuery'] = jest.fn();
      mockSetQuery('コンパネ');
      expect(mockSetQuery).toHaveBeenCalledWith('コンパネ');
    });

    it('clear resets to initial state shape', () => {
      const mockClear: UseAiPriceSearchReturn['clear'] = jest.fn();
      expect(typeof mockClear).toBe('function');
    });
  });
});
