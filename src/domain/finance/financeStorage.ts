/**
 * Finance Storage Service
 *
 * Handles CRUD operations for finance entries (income/expense).
 * Uses AsyncStorage for persistence.
 * Write operations are serialized via financeEntriesQueue to prevent RMW race conditions.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/utils/constants';
import { getReadOnlyMode } from '@/storage/readOnlyModeState';
import { financeEntriesQueue } from '@/utils/writeQueue';
import type { FinanceEntry, FinanceSummary } from './types';
import { deletePhotosByFinanceEntry } from './financePhotoStorage';

// === Result Types ===

export type FinanceErrorCode =
  | 'READ_ERROR'
  | 'WRITE_ERROR'
  | 'PARSE_ERROR'
  | 'NOT_FOUND'
  | 'READONLY_MODE';

export interface FinanceError {
  code: FinanceErrorCode;
  message: string;
  originalError?: Error;
}

export interface FinanceResult<T> {
  success: boolean;
  data?: T;
  error?: FinanceError;
}

// === Helper Functions ===

function createError(
  code: FinanceErrorCode,
  message: string,
  originalError?: Error
): FinanceError {
  return { code, message, originalError };
}

function successResult<T>(data: T): FinanceResult<T> {
  return { success: true, data };
}

function errorResult<T>(error: FinanceError): FinanceResult<T> {
  return { success: false, error };
}

function readOnlyError<T>(): FinanceResult<T> {
  return errorResult(
    createError(
      'READONLY_MODE',
      'App is in read-only mode. Cannot modify finance entries.'
    )
  );
}

// === Finance Entry Operations ===

/**
 * Get all finance entries
 */
export async function getAllFinanceEntries(): Promise<FinanceResult<FinanceEntry[]>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FINANCE_ENTRIES);

    if (data === null) {
      return successResult([]);
    }

    try {
      const entries = JSON.parse(data) as FinanceEntry[];
      return successResult(entries);
    } catch {
      return errorResult(createError('PARSE_ERROR', 'Failed to parse finance entries'));
    }
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        'Failed to read finance entries',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Get finance entry by ID
 */
export async function getFinanceEntryById(
  id: string
): Promise<FinanceResult<FinanceEntry | null>> {
  const result = await getAllFinanceEntries();

  if (!result.success) {
    return errorResult(result.error!);
  }

  const entry = result.data?.find((e) => e.id === id) ?? null;
  return successResult(entry);
}

/**
 * Save finance entry (create or update)
 * Serialized via financeEntriesQueue to prevent RMW race conditions.
 */
export async function saveFinanceEntry(
  entry: FinanceEntry
): Promise<FinanceResult<FinanceEntry>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  return financeEntriesQueue.enqueue(async () => {
    // Re-check read-only mode inside queue to handle mode changes during wait
    if (getReadOnlyMode()) {
      return readOnlyError();
    }

    try {
      const result = await getAllFinanceEntries();

      if (!result.success) {
        return errorResult<FinanceEntry>(result.error!);
      }

      const entries = result.data ?? [];
      const existingIndex = entries.findIndex((e) => e.id === entry.id);

      const now = new Date().toISOString();
      const updatedEntry: FinanceEntry = {
        ...entry,
        updatedAt: now,
        createdAt: existingIndex === -1 ? now : entries[existingIndex].createdAt,
      };

      if (existingIndex !== -1) {
        entries[existingIndex] = updatedEntry;
      } else {
        entries.push(updatedEntry);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.FINANCE_ENTRIES, JSON.stringify(entries));
      return successResult(updatedEntry);
    } catch (error) {
      return errorResult<FinanceEntry>(
        createError(
          'WRITE_ERROR',
          'Failed to save finance entry',
          error instanceof Error ? error : undefined
        )
      );
    }
  });
}

/**
 * Delete finance entry
 * Serialized via financeEntriesQueue to prevent RMW race conditions.
 * Also deletes all associated photos (cascading delete).
 */
export async function deleteFinanceEntry(id: string): Promise<FinanceResult<void>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  const entryResult = await financeEntriesQueue.enqueue(async () => {
    // Re-check read-only mode inside queue to handle mode changes during wait
    if (getReadOnlyMode()) {
      return { success: false as const, readonly: true };
    }

    try {
      const result = await getAllFinanceEntries();

      if (!result.success) {
        return { success: false as const, error: result.error };
      }

      const entries = result.data ?? [];
      const existingIndex = entries.findIndex((e) => e.id === id);

      if (existingIndex === -1) {
        return {
          success: false as const,
          error: createError('NOT_FOUND', `Finance entry not found: ${id}`),
        };
      }

      const filteredEntries = entries.filter((e) => e.id !== id);

      await AsyncStorage.setItem(
        STORAGE_KEYS.FINANCE_ENTRIES,
        JSON.stringify(filteredEntries)
      );
      return { success: true as const };
    } catch (error) {
      return {
        success: false as const,
        error: createError(
          'WRITE_ERROR',
          'Failed to delete finance entry',
          error instanceof Error ? error : undefined
        ),
      };
    }
  });

  if (entryResult.readonly) {
    return readOnlyError();
  }

  // For errors other than NOT_FOUND, return immediately (e.g. READ_ERROR, WRITE_ERROR)
  if (!entryResult.success && entryResult.error?.code !== 'NOT_FOUND') {
    return errorResult<void>(entryResult.error!);
  }

  // Delete associated photos (cascading delete)
  // Runs even when entry is already gone (NOT_FOUND) to ensure idempotent
  // cleanup of orphaned photos from a previous partial deletion.
  const photoResult = await deletePhotosByFinanceEntry(id);
  if (!photoResult.success) {
    return errorResult<void>(
      createError(
        'WRITE_ERROR',
        `Finance entry deleted but failed to delete associated photos: ${photoResult.error?.message}`
      )
    );
  }

  return successResult(undefined);
}

/**
 * Calculate finance summary from entries
 */
export function calculateFinanceSummary(entries: FinanceEntry[]): FinanceSummary {
  const totalIncome = entries
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpense = entries
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}
