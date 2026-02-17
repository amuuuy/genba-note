/**
 * useMultiSelect Hook
 *
 * Manages a set of selected IDs for multi-select UI patterns.
 */

import { useState, useCallback } from 'react';

export interface UseMultiSelectReturn {
  /** Currently selected IDs */
  selectedIds: Set<string>;
  /** Number of selected items */
  selectedCount: number;
  /** Check if an ID is selected */
  isSelected: (id: string) => boolean;
  /** Toggle an ID in/out of the selection */
  toggle: (id: string) => void;
  /** Clear all selections */
  clear: () => void;
}

export function useMultiSelect(): UseMultiSelectReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedCount = selectedIds.size;

  return { selectedIds, selectedCount, isSelected, toggle, clear };
}
