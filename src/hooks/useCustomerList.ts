/**
 * useCustomerList Hook
 *
 * Manages customer list state with CRUD operations.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import type { Customer, CustomerFilter, CreateCustomerInput, UpdateCustomerInput } from '@/types/customer';
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '@/domain/customer';

/**
 * Customer list state
 */
interface CustomerListState {
  /** All loaded customers */
  allCustomers: Customer[];
  /** Whether list is loading */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Current search text */
  searchText: string;
}

export interface UseCustomerListReturn {
  /** Filtered and sorted customers */
  customers: Customer[];
  /** Whether list is loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Current search text */
  searchText: string;
  /** Update search text */
  setSearchText: (text: string) => void;
  /** Refresh the list */
  refresh: () => Promise<void>;
  /** Create a new customer */
  createItem: (input: CreateCustomerInput) => Promise<boolean>;
  /** Update a customer */
  updateItem: (id: string, updates: UpdateCustomerInput) => Promise<boolean>;
  /** Delete a customer */
  deleteItem: (id: string) => Promise<boolean>;
}

/**
 * Filter customers by search text (client-side)
 */
function filterCustomers(customers: Customer[], searchText: string): Customer[] {
  if (!searchText || searchText.trim().length === 0) {
    return customers;
  }

  const lowerSearch = searchText.toLowerCase();
  return customers.filter((customer) => {
    // Search in name
    if (customer.name.toLowerCase().includes(lowerSearch)) {
      return true;
    }
    // Search in address
    if (customer.address && customer.address.toLowerCase().includes(lowerSearch)) {
      return true;
    }
    return false;
  });
}

/**
 * Hook for customer list management with CRUD operations
 */
export function useCustomerList(): UseCustomerListReturn {
  const [state, setState] = useState<CustomerListState>({
    allCustomers: [],
    isLoading: true,
    error: null,
    searchText: '',
  });

  // Track first useFocusEffect call to skip it (useEffect handles initial load)
  const isFirstFocusRef = useRef(true);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await listCustomers();
      if (result.success && result.data) {
        setState((prev) => ({
          ...prev,
          allCustomers: result.data!,
          isLoading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error?.message ?? '顧客の読み込みに失敗しました',
        }));
      }
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: '顧客の読み込みに失敗しました',
      }));
    }
  }, []);

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

  // Memoized filtered list
  const customers = useMemo(() => {
    return filterCustomers(state.allCustomers, state.searchText);
  }, [state.allCustomers, state.searchText]);

  /**
   * Create a new customer
   * @returns true if successful
   */
  const createItem = useCallback(
    async (input: CreateCustomerInput): Promise<boolean> => {
      const result = await createCustomer(input);
      if (result.success) {
        await refresh();
        return true;
      }
      return false;
    },
    [refresh]
  );

  /**
   * Update a customer
   * @returns true if successful
   */
  const updateItem = useCallback(
    async (id: string, updates: UpdateCustomerInput): Promise<boolean> => {
      const result = await updateCustomer(id, updates);
      if (result.success) {
        await refresh();
        return true;
      }
      return false;
    },
    [refresh]
  );

  /**
   * Delete a customer
   * @returns true if successful
   */
  const deleteItem = useCallback(
    async (id: string): Promise<boolean> => {
      const result = await deleteCustomer(id);
      if (result.success) {
        await refresh();
        return true;
      }
      return false;
    },
    [refresh]
  );

  return {
    customers,
    isLoading: state.isLoading,
    error: state.error,
    searchText: state.searchText,
    setSearchText,
    refresh,
    createItem,
    updateItem,
    deleteItem,
  };
}
