/**
 * useWorkLogEntries Hook
 *
 * Manages work log entries (日次作業記録) for a specific customer.
 */

import { useState, useCallback, useEffect } from 'react';
import type { WorkLogEntry } from '@/types/workLogEntry';
import {
  getWorkLogEntriesByCustomer,
  createWorkLogEntry as createEntryService,
  updateWorkLogEntry as updateEntryService,
  deleteWorkLogEntry as deleteEntryService,
} from '@/domain/customer';

/**
 * Work log entries state
 */
interface WorkLogEntriesState {
  entries: WorkLogEntry[];
  isLoading: boolean;
  error: string | null;
}

export interface UseWorkLogEntriesReturn {
  /** All work log entries for this customer (sorted by date descending) */
  entries: WorkLogEntry[];
  /** Whether entries are loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Create a new work log entry */
  createEntry: (workDate: string, note?: string | null) => Promise<WorkLogEntry | null>;
  /** Update an entry's note */
  updateEntry: (id: string, note: string | null) => Promise<boolean>;
  /** Delete a work log entry (associated photos are also deleted) */
  deleteEntry: (id: string) => Promise<boolean>;
  /** Refresh the entries list */
  refresh: () => Promise<void>;
}

/**
 * Hook for managing work log entries
 *
 * @param customerId - Customer ID to load entries for (null = no entries loaded)
 */
export function useWorkLogEntries(customerId: string | null): UseWorkLogEntriesReturn {
  const [state, setState] = useState<WorkLogEntriesState>({
    entries: [],
    isLoading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!customerId) {
      setState({ entries: [], isLoading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await getWorkLogEntriesByCustomer(customerId);
      if (result.success && result.data) {
        setState({
          entries: result.data,
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          entries: [],
          isLoading: false,
          error: result.error?.message ?? '作業記録の読み込みに失敗しました',
        });
      }
    } catch {
      setState({
        entries: [],
        isLoading: false,
        error: '作業記録の読み込みに失敗しました',
      });
    }
  }, [customerId]);

  // Load on mount and when customerId changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Create a new work log entry
   * @returns the created entry, or null if failed
   */
  const createEntry = useCallback(
    async (workDate: string, note?: string | null): Promise<WorkLogEntry | null> => {
      if (!customerId) {
        return null;
      }

      const result = await createEntryService({
        customerId,
        workDate,
        note,
      });

      if (result.success && result.data) {
        await refresh();
        return result.data;
      }
      return null;
    },
    [customerId, refresh]
  );

  /**
   * Update an entry's note
   * @returns true if successful
   */
  const updateEntry = useCallback(
    async (id: string, note: string | null): Promise<boolean> => {
      const result = await updateEntryService(id, { note });
      if (result.success) {
        await refresh();
        return true;
      }
      return false;
    },
    [refresh]
  );

  /**
   * Delete a work log entry
   * Associated photos are also deleted
   * @returns true if successful
   */
  const deleteEntry = useCallback(
    async (id: string): Promise<boolean> => {
      const result = await deleteEntryService(id);
      if (result.success) {
        await refresh();
        return true;
      }
      return false;
    },
    [refresh]
  );

  return {
    entries: state.entries,
    isLoading: state.isLoading,
    error: state.error,
    createEntry,
    updateEntry,
    deleteEntry,
    refresh,
  };
}
