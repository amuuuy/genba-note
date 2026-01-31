/**
 * useDocumentFilter Hook Tests
 *
 * Tests filter state management and conversion to DocumentFilter.
 */

import {
  initialFilterState,
  updateSearchText,
  updateTypeFilter,
  updateStatusFilter,
  toDocumentFilter,
  toFilterResult,
  type FilterState,
} from '@/hooks/useDocumentFilter';

describe('useDocumentFilter', () => {
  describe('initialFilterState', () => {
    it('has correct initial values', () => {
      expect(initialFilterState.searchText).toBe('');
      expect(initialFilterState.type).toBe('all');
      expect(initialFilterState.status).toBe('all');
    });
  });

  describe('updateSearchText', () => {
    it('updates search text while preserving other filters', () => {
      const state: FilterState = {
        searchText: '',
        type: 'estimate',
        status: 'draft',
      };

      const newState = updateSearchText(state, '山田');

      expect(newState.searchText).toBe('山田');
      expect(newState.type).toBe('estimate');
      expect(newState.status).toBe('draft');
    });

    it('handles empty string', () => {
      const state: FilterState = {
        searchText: '山田',
        type: 'all',
        status: 'all',
      };

      const newState = updateSearchText(state, '');

      expect(newState.searchText).toBe('');
    });
  });

  describe('updateTypeFilter', () => {
    it('updates type filter', () => {
      const state: FilterState = {
        searchText: 'test',
        type: 'all',
        status: 'draft',
      };

      const newState = updateTypeFilter(state, 'invoice');

      expect(newState.type).toBe('invoice');
      expect(newState.searchText).toBe('test');
      expect(newState.status).toBe('draft');
    });
  });

  describe('updateStatusFilter', () => {
    it('updates status filter', () => {
      const state: FilterState = {
        searchText: 'test',
        type: 'estimate',
        status: 'all',
      };

      const newState = updateStatusFilter(state, 'paid');

      expect(newState.status).toBe('paid');
      expect(newState.searchText).toBe('test');
      expect(newState.type).toBe('estimate');
    });
  });

  describe('toDocumentFilter', () => {
    it('converts "all" type to undefined', () => {
      const state: FilterState = {
        searchText: '',
        type: 'all',
        status: 'all',
      };

      const filter = toDocumentFilter(state);

      expect(filter.type).toBeUndefined();
    });

    it('converts "all" status to undefined', () => {
      const state: FilterState = {
        searchText: '',
        type: 'all',
        status: 'all',
      };

      const filter = toDocumentFilter(state);

      expect(filter.status).toBeUndefined();
    });

    it('converts specific type correctly', () => {
      const state: FilterState = {
        searchText: '',
        type: 'estimate',
        status: 'all',
      };

      const filter = toDocumentFilter(state);

      expect(filter.type).toBe('estimate');
    });

    it('converts specific status correctly', () => {
      const state: FilterState = {
        searchText: '',
        type: 'all',
        status: 'sent',
      };

      const filter = toDocumentFilter(state);

      expect(filter.status).toBe('sent');
    });

    it('converts empty searchText to undefined', () => {
      const state: FilterState = {
        searchText: '',
        type: 'all',
        status: 'all',
      };

      const filter = toDocumentFilter(state);

      expect(filter.searchText).toBeUndefined();
    });

    it('passes non-empty searchText', () => {
      const state: FilterState = {
        searchText: '山田建設',
        type: 'all',
        status: 'all',
      };

      const filter = toDocumentFilter(state);

      expect(filter.searchText).toBe('山田建設');
    });

    it('trims whitespace from searchText', () => {
      const state: FilterState = {
        searchText: '  山田  ',
        type: 'all',
        status: 'all',
      };

      const filter = toDocumentFilter(state);

      expect(filter.searchText).toBe('山田');
    });

    it('converts whitespace-only searchText to undefined', () => {
      const state: FilterState = {
        searchText: '   ',
        type: 'all',
        status: 'all',
      };

      const filter = toDocumentFilter(state);

      expect(filter.searchText).toBeUndefined();
    });

    it('converts full filter state correctly', () => {
      const state: FilterState = {
        searchText: '山田建設',
        type: 'invoice',
        status: 'paid',
      };

      const filter = toDocumentFilter(state);

      expect(filter).toEqual({
        type: 'invoice',
        status: 'paid',
        searchText: '山田建設',
        isFiltered: true,
      });
    });
  });

  describe('isFiltered', () => {
    it('returns false for initial state', () => {
      const { isFiltered } = toDocumentFilter(initialFilterState);
      expect(isFiltered).toBe(false);
    });

    it('returns true when searchText is set', () => {
      const state: FilterState = {
        searchText: 'test',
        type: 'all',
        status: 'all',
      };
      const { isFiltered } = toDocumentFilter(state);
      expect(isFiltered).toBe(true);
    });

    it('returns true when type is not all', () => {
      const state: FilterState = {
        searchText: '',
        type: 'estimate',
        status: 'all',
      };
      const { isFiltered } = toDocumentFilter(state);
      expect(isFiltered).toBe(true);
    });

    it('returns true when status is not all', () => {
      const state: FilterState = {
        searchText: '',
        type: 'all',
        status: 'draft',
      };
      const { isFiltered } = toDocumentFilter(state);
      expect(isFiltered).toBe(true);
    });
  });

  describe('toFilterResult', () => {
    it('separates domain filter from UI metadata', () => {
      const state: FilterState = {
        searchText: '山田建設',
        type: 'invoice',
        status: 'paid',
      };

      const result = toFilterResult(state);

      // Domain filter should not have isFiltered
      expect(result.filter).toEqual({
        type: 'invoice',
        status: 'paid',
        searchText: '山田建設',
      });
      expect((result.filter as Record<string, unknown>).isFiltered).toBeUndefined();

      // UI metadata should be separate
      expect(result.isFiltered).toBe(true);
    });

    it('returns isFiltered false for initial state', () => {
      const result = toFilterResult(initialFilterState);
      expect(result.isFiltered).toBe(false);
    });

    it('returns clean filter object for initial state', () => {
      const result = toFilterResult(initialFilterState);
      expect(result.filter).toEqual({
        type: undefined,
        status: undefined,
        searchText: undefined,
      });
    });
  });
});
