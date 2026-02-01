/**
 * useDocumentFilter Hook
 *
 * Manages document filter state and converts to DocumentFilter for API.
 */

import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import type { DocumentType, DocumentStatus, DocumentFilter } from '../types';

/**
 * Filter state with "all" option for both type and status
 */
export interface FilterState {
  searchText: string;
  type: DocumentType | 'all';
  status: DocumentStatus | 'all';
}

/**
 * Filter result with separated domain filter and UI metadata
 */
export interface FilterResult {
  /** Domain filter for API calls (no UI metadata) */
  filter: DocumentFilter;
  /** Whether any filter is active (UI metadata) */
  isFiltered: boolean;
}

/**
 * @deprecated Use FilterResult instead. Kept for backward compatibility.
 */
export interface DocumentFilterWithMeta extends DocumentFilter {
  isFiltered: boolean;
}

/**
 * Initial filter state (no filters applied)
 */
export const initialFilterState: FilterState = {
  searchText: '',
  type: 'all',
  status: 'all',
};

/**
 * Update search text in filter state
 */
export function updateSearchText(state: FilterState, text: string): FilterState {
  return { ...state, searchText: text };
}

/**
 * Update type filter in filter state
 */
export function updateTypeFilter(
  state: FilterState,
  type: DocumentType | 'all'
): FilterState {
  return { ...state, type };
}

/**
 * Update status filter in filter state
 */
export function updateStatusFilter(
  state: FilterState,
  status: DocumentStatus | 'all'
): FilterState {
  return { ...state, status };
}

/**
 * Convert FilterState to FilterResult (separated domain filter and UI metadata)
 */
export function toFilterResult(state: FilterState): FilterResult {
  const trimmedSearch = state.searchText.trim();
  const hasSearchText = trimmedSearch.length > 0;
  const hasTypeFilter = state.type !== 'all';
  const hasStatusFilter = state.status !== 'all';

  return {
    filter: {
      type: hasTypeFilter ? state.type as DocumentType : undefined,
      status: hasStatusFilter ? state.status as DocumentStatus : undefined,
      searchText: hasSearchText ? trimmedSearch : undefined,
    },
    isFiltered: hasSearchText || hasTypeFilter || hasStatusFilter,
  };
}

/**
 * Convert FilterState to DocumentFilter for API calls
 * @deprecated Use toFilterResult instead for proper layer separation
 */
export function toDocumentFilter(state: FilterState): DocumentFilterWithMeta {
  const result = toFilterResult(state);
  return {
    ...result.filter,
    isFiltered: result.isFiltered,
  };
}

/**
 * Hook return type
 */
export interface UseDocumentFilterReturn {
  /** Current filter state */
  filterState: FilterState;
  /** Domain filter for API calls (no UI metadata) */
  filter: DocumentFilter;
  /** Whether any filter is active (UI metadata) */
  isFiltered: boolean;
  /** Update search text (debounced) */
  setSearchText: (text: string) => void;
  /** Update type filter */
  setTypeFilter: (type: DocumentType | 'all') => void;
  /** Update status filter */
  setStatusFilter: (status: DocumentStatus | 'all') => void;
  /** Reset all filters */
  resetFilters: () => void;
}

/**
 * Hook for managing document filter state
 *
 * @param debounceMs - Debounce delay for search text (default: 300)
 */
export function useDocumentFilter(debounceMs = 300): UseDocumentFilterReturn {
  const [filterState, setFilterState] = useState<FilterState>(initialFilterState);
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search text
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchText(filterState.searchText);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filterState.searchText, debounceMs]);

  const setSearchText = useCallback((text: string) => {
    setFilterState((prev) => updateSearchText(prev, text));
  }, []);

  const setTypeFilter = useCallback((type: DocumentType | 'all') => {
    setFilterState((prev) => updateTypeFilter(prev, type));
  }, []);

  const setStatusFilter = useCallback((status: DocumentStatus | 'all') => {
    setFilterState((prev) => updateStatusFilter(prev, status));
  }, []);

  const resetFilters = useCallback(() => {
    setFilterState(initialFilterState);
    setDebouncedSearchText('');
  }, []);

  // Create filter result with debounced search text (separated domain filter and UI metadata)
  // Memoized to ensure stable reference - prevents infinite refresh loops in useDocumentList
  const filterResult = useMemo(
    () =>
      toFilterResult({
        ...filterState,
        searchText: debouncedSearchText,
      }),
    [filterState.type, filterState.status, debouncedSearchText]
  );

  return {
    filterState,
    filter: filterResult.filter,
    isFiltered: filterResult.isFiltered,
    setSearchText,
    setTypeFilter,
    setStatusFilter,
    resetFilters,
  };
}
