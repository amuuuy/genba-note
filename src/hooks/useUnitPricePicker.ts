/**
 * useUnitPricePicker Hook
 *
 * Manages unit price picker modal state.
 * Provides list loading, search/filter, and selection.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { UnitPrice, UnitPriceFilter } from '@/types/unitPrice';
import type { LineItemInput } from '@/domain/lineItem/lineItemService';
import { listUnitPrices, unitPriceToLineItemInput } from '@/domain/unitPrice';
import { filterUnitPrices, sortUnitPrices, type UnitPriceSortField } from '@/domain/unitPrice/searchService';

/**
 * Unit price picker state
 */
export interface UnitPricePickerState {
  /** All loaded unit prices */
  allUnitPrices: UnitPrice[];
  /** Whether list is loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Current search text */
  searchText: string;
  /** Selected category filter */
  selectedCategory: string | null;
}

export interface UseUnitPricePickerReturn {
  /** Filtered and sorted unit prices */
  unitPrices: UnitPrice[];
  /** Whether list is loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Current search text */
  searchText: string;
  /** Available categories (derived from data) */
  categories: string[];
  /** Selected category */
  selectedCategory: string | null;
  /** Update search text */
  setSearchText: (text: string) => void;
  /** Set category filter */
  setCategory: (category: string | null) => void;
  /** Refresh the list */
  refresh: () => Promise<void>;
  /** Convert unit price to line item input */
  toLineItemInput: (unitPrice: UnitPrice, quantityMilli?: number) => LineItemInput;
}

/**
 * Extract unique categories from unit prices
 */
export function extractCategories(unitPrices: UnitPrice[]): string[] {
  const categorySet = new Set<string>();
  for (const up of unitPrices) {
    if (up.category) {
      categorySet.add(up.category);
    }
  }
  return Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'ja'));
}

/**
 * Hook for unit price picker modal
 */
export function useUnitPricePicker(): UseUnitPricePickerReturn {
  const [state, setState] = useState<UnitPricePickerState>({
    allUnitPrices: [],
    isLoading: true,
    error: null,
    searchText: '',
    selectedCategory: null,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await listUnitPrices();
      if (result.success && result.data) {
        setState((prev) => ({
          ...prev,
          allUnitPrices: result.data!,
          isLoading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error?.message ?? '単価表の読み込みに失敗しました',
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: '単価表の読み込みに失敗しました',
      }));
    }
  }, []);

  // Load on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  const setSearchText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, searchText: text }));
  }, []);

  const setCategory = useCallback((category: string | null) => {
    setState((prev) => ({ ...prev, selectedCategory: category }));
  }, []);

  // Memoized filtered list
  const unitPrices = useMemo(() => {
    const filter: UnitPriceFilter = {};
    if (state.searchText) {
      filter.searchText = state.searchText;
    }
    if (state.selectedCategory) {
      filter.category = state.selectedCategory;
    }

    let filtered = filterUnitPrices(state.allUnitPrices, filter);
    // Sort by name for consistent display
    filtered = sortUnitPrices(filtered, 'name', 'asc');
    return filtered;
  }, [state.allUnitPrices, state.searchText, state.selectedCategory]);

  // Memoized categories
  const categories = useMemo(() => {
    return extractCategories(state.allUnitPrices);
  }, [state.allUnitPrices]);

  const toLineItemInput = useCallback(
    (unitPrice: UnitPrice, quantityMilli: number = 1000): LineItemInput => {
      return unitPriceToLineItemInput(unitPrice, quantityMilli);
    },
    []
  );

  return {
    unitPrices,
    isLoading: state.isLoading,
    error: state.error,
    searchText: state.searchText,
    categories,
    selectedCategory: state.selectedCategory,
    setSearchText,
    setCategory,
    refresh,
    toLineItemInput,
  };
}
