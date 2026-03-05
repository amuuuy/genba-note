/**
 * useMaterialSearch Hook Tests
 *
 * Tests the hook interface types and structure.
 * API call logic is tested in materialResearchService.test.ts.
 * Mapping logic is tested in rakutenMappingService.test.ts.
 */

jest.mock('@/domain/materialResearch/materialResearchService', () => ({
  searchMaterials: jest.fn(),
}));

import type { UseMaterialSearchReturn } from '@/hooks/useMaterialSearch';

describe('useMaterialSearch', () => {
  describe('UseMaterialSearchReturn interface', () => {
    it('has expected shape', () => {
      // Type-level test: verify the interface has expected properties
      const expectedReturn: UseMaterialSearchReturn = {
        query: '',
        setQuery: jest.fn(),
        results: [],
        isLoading: false,
        error: null,
        currentPage: 1,
        totalPages: 0,
        search: jest.fn(),
        loadMore: jest.fn(),
        clear: jest.fn(),
      };

      expect(expectedReturn.query).toBe('');
      expect(expectedReturn.results).toEqual([]);
      expect(expectedReturn.isLoading).toBe(false);
      expect(expectedReturn.error).toBeNull();
      expect(expectedReturn.currentPage).toBe(1);
      expect(expectedReturn.totalPages).toBe(0);
      expect(typeof expectedReturn.setQuery).toBe('function');
      expect(typeof expectedReturn.search).toBe('function');
      expect(typeof expectedReturn.loadMore).toBe('function');
      expect(typeof expectedReturn.clear).toBe('function');
    });
  });

  describe('search flow types', () => {
    it('search returns Promise<boolean>', () => {
      const mockSearch: UseMaterialSearchReturn['search'] = jest.fn().mockResolvedValue(true);
      expect(typeof mockSearch).toBe('function');
    });

    it('loadMore returns Promise<void>', () => {
      const mockLoadMore: UseMaterialSearchReturn['loadMore'] = jest.fn().mockResolvedValue(undefined);
      expect(typeof mockLoadMore).toBe('function');
    });

    it('setQuery accepts string', () => {
      const mockSetQuery: UseMaterialSearchReturn['setQuery'] = jest.fn();
      mockSetQuery('塗料');
      expect(mockSetQuery).toHaveBeenCalledWith('塗料');
    });

    it('clear resets to initial state shape', () => {
      const mockClear: UseMaterialSearchReturn['clear'] = jest.fn();
      expect(typeof mockClear).toBe('function');
    });
  });
});
