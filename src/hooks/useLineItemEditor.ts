/**
 * useLineItemEditor Hook
 *
 * Manages line items array state for document editing.
 * Provides add/update/remove/reorder/duplicate operations.
 * Uses pure functions from lineItemService for consistency.
 */

import { useState, useCallback, useMemo } from 'react';
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

  // Memoized totals calculation
  const totals = useMemo(() => {
    return calculateDocumentTotals(state.lineItems);
  }, [state.lineItems]);

  const addItem = useCallback((input: LineItemInput): boolean => {
    const result = addLineItem(state.lineItems, input);
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
  }, [state.lineItems]);

  const updateItem = useCallback(
    (id: string, updates: Partial<LineItemInput>): boolean => {
      const result = updateLineItem(state.lineItems, id, updates);
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
    [state.lineItems]
  );

  const removeItem = useCallback((id: string): boolean => {
    const result = removeLineItem(state.lineItems, id);
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
  }, [state.lineItems]);

  const reorder = useCallback(
    (fromIndex: number, toIndex: number): boolean => {
      const result = reorderLineItems(state.lineItems, fromIndex, toIndex);
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
    [state.lineItems]
  );

  const duplicate = useCallback((id: string): boolean => {
    const result = duplicateLineItem(state.lineItems, id);
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
  }, [state.lineItems]);

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
