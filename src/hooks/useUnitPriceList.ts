/**
 * useUnitPriceList Hook
 *
 * Manages unit price list state with CRUD operations.
 * Extends useUnitPricePicker with create, update, delete capabilities.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import type { UnitPrice, UnitPriceFilter } from '@/types/unitPrice';
import {
  listUnitPrices,
  createUnitPrice,
  updateUnitPrice,
  deleteUnitPriceById,
  type UnitPriceInput,
  type UpdateUnitPriceInput,
} from '@/domain/unitPrice';
import {
  filterUnitPrices,
  sortUnitPrices,
} from '@/domain/unitPrice/searchService';
import { extractCategories } from './useUnitPricePicker';

/**
 * Unit price list state
 */
interface UnitPriceListState {
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

export interface UseUnitPriceListReturn {
  /** Filtered and sorted unit prices */
  unitPrices: UnitPrice[];
  /** Total number of unit prices (unfiltered) */
  totalCount: number;
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
  /** Create a new unit price */
  createItem: (input: UnitPriceInput) => Promise<boolean>;
  /** Create multiple unit prices in batch (refreshes list once at end) */
  createItems: (inputs: UnitPriceInput[]) => Promise<number>;
  /** Update a unit price */
  updateItem: (id: string, updates: UpdateUnitPriceInput) => Promise<boolean>;
  /** Delete a unit price */
  deleteItem: (id: string) => Promise<boolean>;
}

/**
 * Hook for unit price list management with CRUD operations
 */
export function useUnitPriceList(): UseUnitPriceListReturn {
  const [state, setState] = useState<UnitPriceListState>({
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
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: '単価表の読み込みに失敗しました',
      }));
    }
  }, []);

  // Track first useFocusEffect call to skip it (useEffect handles initial load)
  const isFirstFocusRef = useRef(true);

  // Load on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh when screen comes into focus (skip first call to avoid double fetch)
  useFocusEffect(
    useCallback(() => {
      // Skip first focus (initial mount) - useEffect already handles initial load
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );

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

  /**
   * Create a new unit price
   * @returns true if successful
   */
  const createItem = useCallback(
    async (input: UnitPriceInput): Promise<boolean> => {
      const result = await createUnitPrice(input);
      if (result.success) {
        await refresh();
        return true;
      }
      return false;
    },
    [refresh]
  );

  /**
   * Create multiple unit prices in batch (refreshes list once at end)
   * @returns number of successfully created items
   */
  const createItems = useCallback(
    async (inputs: UnitPriceInput[]): Promise<number> => {
      let count = 0;
      for (const input of inputs) {
        const result = await createUnitPrice(input);
        if (result.success) count++;
      }
      if (count > 0) await refresh();
      return count;
    },
    [refresh]
  );

  /**
   * Update a unit price
   * @returns true if successful
   */
  const updateItem = useCallback(
    async (id: string, updates: UpdateUnitPriceInput): Promise<boolean> => {
      const result = await updateUnitPrice(id, updates);
      if (result.success) {
        await refresh();
        return true;
      }
      return false;
    },
    [refresh]
  );

  /**
   * Delete a unit price
   * @returns true if successful
   */
  const deleteItem = useCallback(
    async (id: string): Promise<boolean> => {
      const result = await deleteUnitPriceById(id);
      if (result.success) {
        await refresh();
        return true;
      }
      return false;
    },
    [refresh]
  );

  return {
    unitPrices,
    totalCount: state.allUnitPrices.length,
    isLoading: state.isLoading,
    error: state.error,
    searchText: state.searchText,
    categories,
    selectedCategory: state.selectedCategory,
    setSearchText,
    setCategory,
    refresh,
    createItem,
    createItems,
    updateItem,
    deleteItem,
  };
}
