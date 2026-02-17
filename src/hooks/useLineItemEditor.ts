/**
 * useLineItemEditor Hook
 *
 * Manages line items array state for document editing.
 * Provides add/update/remove/reorder/duplicate operations.
 * Uses pure functions from lineItemService for consistency.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import type { LineItem, TaxRate } from '@/types/document';
import type { LineItemInput, LineItemServiceResult } from '@/domain/lineItem/lineItemService';
import {
  createLineItem,
  addLineItem,
  updateLineItem,
  removeLineItem,
  reorderLineItems,
  duplicateLineItem,
} from '@/domain/lineItem';
import { calculateLineItems, calculateDocumentTotals } from '@/domain/lineItem';

/**
 * Error state for line item operations
 */
export interface LineItemError {
  /** Error message */
  message: string;
  /** Field path if applicable */
  field?: string;
}

/**
 * Line item editor state
 */
export interface LineItemEditorState {
  /** Current line items */
  lineItems: LineItem[];
  /** Current errors (cleared on successful operation) */
  errors: LineItemError[];
  /** Whether there are unsaved changes */
  isDirty: boolean;
}

/**
 * Line item editor actions
 */
export interface UseLineItemEditorReturn {
  /** Current line items */
  lineItems: LineItem[];
  /** Current errors */
  errors: LineItemError[];
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Calculated totals */
  totals: {
    subtotalYen: number;
    taxYen: number;
    totalYen: number;
    taxBreakdown: { rate: TaxRate; subtotal: number; tax: number }[];
  };
  /** Add a new line item */
  addItem: (input: LineItemInput) => boolean;
  /** Update an existing line item */
  updateItem: (id: string, updates: Partial<LineItemInput>) => boolean;
  /** Remove a line item */
  removeItem: (id: string) => boolean;
  /** Reorder line items */
  reorder: (fromIndex: number, toIndex: number) => boolean;
  /** Duplicate a line item */
  duplicate: (id: string) => boolean;
  /** Replace all line items (used when loading document) */
  setLineItems: (items: LineItem[]) => void;
  /** Clear all errors */
  clearErrors: () => void;
  /** Reset dirty flag (after save) */
  resetDirty: () => void;
}

/**
 * Convert service result to error array
 */
function extractErrors(result: LineItemServiceResult<unknown>): LineItemError[] {
  if (result.success) {
    return [];
  }
  return (result.errors ?? []).map((e) => ({
    message: e.message,
    field: e.field,
  }));
}

/**
 * Hook for managing line items during document editing
 *
 * @param initialItems - Initial line items (from loaded document or empty)
 */
export function useLineItemEditor(
  initialItems: LineItem[] = []
): UseLineItemEditorReturn {
  const [state, setState] = useState<LineItemEditorState>({
    lineItems: initialItems,
    errors: [],
    isDirty: false,
  });

  // Keep a ref to the latest lineItems to avoid stale closures in callbacks
  const lineItemsRef = useRef(state.lineItems);
  lineItemsRef.current = state.lineItems;

  // Memoized totals calculation
  const totals = useMemo(() => {
    return calculateDocumentTotals(state.lineItems);
  }, [state.lineItems]);

  const addItem = useCallback((input: LineItemInput): boolean => {
    const result = addLineItem(lineItemsRef.current, input);
    if (result.success && result.data) {
      lineItemsRef.current = result.data!;
      setState((prev) => ({
        ...prev,
        lineItems: result.data!,
        errors: [],
        isDirty: true,
      }));
      return true;
    }
    setState((prev) => ({
      ...prev,
      errors: extractErrors(result),
    }));
    return false;
  }, []);

  const updateItem = useCallback(
    (id: string, updates: Partial<LineItemInput>): boolean => {
      const result = updateLineItem(lineItemsRef.current, id, updates);
      if (result.success && result.data) {
        setState((prev) => ({
          ...prev,
          lineItems: result.data!,
          errors: [],
          isDirty: true,
        }));
        return true;
      }
      setState((prev) => ({
        ...prev,
        errors: extractErrors(result),
      }));
      return false;
    },
    []
  );

  const removeItem = useCallback((id: string): boolean => {
    const result = removeLineItem(lineItemsRef.current, id);
    if (result.success && result.data) {
      setState((prev) => ({
        ...prev,
        lineItems: result.data!,
        errors: [],
        isDirty: true,
      }));
      return true;
    }
    setState((prev) => ({
      ...prev,
      errors: extractErrors(result),
    }));
    return false;
  }, []);

  const reorder = useCallback(
    (fromIndex: number, toIndex: number): boolean => {
      const result = reorderLineItems(lineItemsRef.current, fromIndex, toIndex);
      if (result.success && result.data) {
        setState((prev) => ({
          ...prev,
          lineItems: result.data!,
          errors: [],
          isDirty: true,
        }));
        return true;
      }
      setState((prev) => ({
        ...prev,
        errors: extractErrors(result),
      }));
      return false;
    },
    []
  );

  const duplicate = useCallback((id: string): boolean => {
    const result = duplicateLineItem(lineItemsRef.current, id);
    if (result.success && result.data) {
      setState((prev) => ({
        ...prev,
        lineItems: result.data!,
        errors: [],
        isDirty: true,
      }));
      return true;
    }
    setState((prev) => ({
      ...prev,
      errors: extractErrors(result),
    }));
    return false;
  }, []);

  const setLineItems = useCallback((items: LineItem[]) => {
    setState({
      lineItems: items,
      errors: [],
      isDirty: false,
    });
  }, []);

  const clearErrors = useCallback(() => {
    setState((prev) => ({ ...prev, errors: [] }));
  }, []);

  const resetDirty = useCallback(() => {
    setState((prev) => ({ ...prev, isDirty: false }));
  }, []);

  return {
    lineItems: state.lineItems,
    errors: state.errors,
    isDirty: state.isDirty,
    totals,
    addItem,
    updateItem,
    removeItem,
    reorder,
    duplicate,
    setLineItems,
    clearErrors,
    resetDirty,
  };
}
