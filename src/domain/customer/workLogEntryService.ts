/**
 * Work Log Entry Service
 *
 * Manages work log entries (日次作業記録) for date-based photo grouping
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import type {
  WorkLogEntry,
  CreateWorkLogEntryInput,
  UpdateWorkLogEntryInput,
} from '@/types/workLogEntry';
import type { CustomerPhoto } from '@/types/customerPhoto';
import {
  CustomerDomainResult,
  successResult,
  errorResult,
  createCustomerServiceError,
} from './types';
import { generateUUID } from '@/utils/uuid';
import { STORAGE_KEYS } from '@/utils/constants';
import { workLogEntriesQueue, photosQueue } from '@/utils/writeQueue';

// === Helper Functions ===

/**
 * Get all work log entries from storage
 */
async function getAllEntriesFromStorage(): Promise<WorkLogEntry[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.WORK_LOG_ENTRIES);
  if (!json) {
    return [];
  }
  return JSON.parse(json) as WorkLogEntry[];
}

/**
 * Save all work log entries to storage
 */
async function saveAllEntriesToStorage(entries: WorkLogEntry[]): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEYS.WORK_LOG_ENTRIES,
    JSON.stringify(entries)
  );
}

/**
 * Validate workDate format (YYYY-MM-DD)
 */
function isValidWorkDate(workDate: string): boolean {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(workDate)) {
    return false;
  }
  // Validate it's a real date
  const date = new Date(workDate + 'T00:00:00');
  return !isNaN(date.getTime());
}

// === Public API ===

/**
 * Create a new work log entry
 * Enforces unique (customerId, workDate) constraint
 */
export async function createWorkLogEntry(
  input: CreateWorkLogEntryInput
): Promise<CustomerDomainResult<WorkLogEntry>> {
  try {
    // Validate workDate format
    if (!isValidWorkDate(input.workDate)) {
      return errorResult(
        createCustomerServiceError(
          'VALIDATION_ERROR',
          '日付の形式が正しくありません（YYYY-MM-DD）'
        )
      );
    }

    const now = Date.now();
    const entry: WorkLogEntry = {
      id: generateUUID(),
      customerId: input.customerId,
      workDate: input.workDate,
      note: input.note ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // Use queue to prevent RMW race conditions
    const queueResult = await workLogEntriesQueue.enqueue(async () => {
      const entries = await getAllEntriesFromStorage();

      // Check for duplicate (customerId, workDate)
      const duplicate = entries.find(
        (e) =>
          e.customerId === input.customerId && e.workDate === input.workDate
      );
      if (duplicate) {
        return { success: false as const, reason: 'duplicate' };
      }

      entries.push(entry);
      await saveAllEntriesToStorage(entries);
      return { success: true as const };
    });

    if (!queueResult.success) {
      return errorResult(
        createCustomerServiceError(
          'DUPLICATE_WORK_DATE',
          `この日付（${input.workDate}）の作業記録は既に存在します`
        )
      );
    }

    return successResult(entry);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to create work log entry',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Get a work log entry by ID
 */
export async function getWorkLogEntry(
  id: string
): Promise<CustomerDomainResult<WorkLogEntry | null>> {
  try {
    const entries = await getAllEntriesFromStorage();
    const entry = entries.find((e) => e.id === id);
    return successResult(entry ?? null);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to get work log entry',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Get all work log entries for a customer
 * Returns entries sorted by workDate descending (newest first)
 */
export async function getWorkLogEntriesByCustomer(
  customerId: string
): Promise<CustomerDomainResult<WorkLogEntry[]>> {
  try {
    const entries = await getAllEntriesFromStorage();
    const customerEntries = entries
      .filter((e) => e.customerId === customerId)
      .sort((a, b) => b.workDate.localeCompare(a.workDate));
    return successResult(customerEntries);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to get work log entries',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Update a work log entry
 */
export async function updateWorkLogEntry(
  id: string,
  input: UpdateWorkLogEntryInput
): Promise<CustomerDomainResult<WorkLogEntry>> {
  try {
    const result = await workLogEntriesQueue.enqueue(async () => {
      const entries = await getAllEntriesFromStorage();
      const index = entries.findIndex((e) => e.id === id);

      if (index === -1) {
        return { success: false as const, reason: 'not_found' };
      }

      const entry = entries[index];
      const updated: WorkLogEntry = {
        ...entry,
        note: input.note !== undefined ? input.note ?? null : entry.note,
        updatedAt: Date.now(),
      };

      entries[index] = updated;
      await saveAllEntriesToStorage(entries);
      return { success: true as const, entry: updated };
    });

    if (!result.success) {
      return errorResult(
        createCustomerServiceError(
          'WORK_LOG_ENTRY_NOT_FOUND',
          '作業記録が見つかりません'
        )
      );
    }

    return successResult(result.entry);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to update work log entry',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Delete a work log entry
 * Associated photos are also deleted (both files and metadata)
 *
 * IMPORTANT: Entry is deleted first to ensure atomicity.
 * If entry deletion fails, photos remain intact.
 * Photo deletion failures are logged but don't fail the operation
 * since the entry is already deleted.
 */
export async function deleteWorkLogEntry(
  id: string
): Promise<CustomerDomainResult<void>> {
  try {
    // First, delete the entry to ensure it exists and can be deleted
    const result = await workLogEntriesQueue.enqueue(async () => {
      const entries = await getAllEntriesFromStorage();
      const index = entries.findIndex((e) => e.id === id);

      if (index === -1) {
        return { success: false as const, reason: 'not_found' };
      }

      entries.splice(index, 1);
      await saveAllEntriesToStorage(entries);
      return { success: true as const };
    });

    if (!result.success) {
      return errorResult(
        createCustomerServiceError(
          'WORK_LOG_ENTRY_NOT_FOUND',
          '作業記録が見つかりません'
        )
      );
    }

    // Entry deleted successfully, now delete associated photos
    // Only delete metadata for photos whose files were successfully deleted
    // Photos with failed file deletions keep their metadata for cleanup retry
    await photosQueue.enqueue(async () => {
      const photosJson = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOMER_PHOTOS);
      if (photosJson) {
        const photos = JSON.parse(photosJson) as CustomerPhoto[];
        const photosToDelete = photos.filter((p) => p.workLogEntryId === id);
        const successfullyDeletedIds = new Set<string>();

        // Delete photo files, tracking which ones succeed
        for (const photo of photosToDelete) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(photo.uri);
            if (fileInfo.exists) {
              await FileSystem.deleteAsync(photo.uri, { idempotent: true });
            }
            // File deleted or doesn't exist - mark as successfully handled
            successfullyDeletedIds.add(photo.id);
          } catch (error) {
            // File deletion failed - keep metadata for cleanup retry
            console.warn('Failed to delete photo file, keeping metadata for retry:', photo.uri, error);
          }
        }

        // Only remove metadata for successfully deleted photos
        // Failed deletions keep their metadata so cleanupOrphanedPhotos can retry
        const remaining = photos.filter(
          (p) => p.workLogEntryId !== id || !successfullyDeletedIds.has(p.id)
        );
        await AsyncStorage.setItem(
          STORAGE_KEYS.CUSTOMER_PHOTOS,
          JSON.stringify(remaining)
        );
      }
    });

    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to delete work log entry',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Delete a work log entry without deleting associated photos
 * Used for rollback scenarios where photos should be preserved
 */
export async function deleteWorkLogEntryOnly(
  id: string
): Promise<CustomerDomainResult<void>> {
  try {
    const result = await workLogEntriesQueue.enqueue(async () => {
      const entries = await getAllEntriesFromStorage();
      const index = entries.findIndex((e) => e.id === id);

      if (index === -1) {
        return { success: false as const, reason: 'not_found' };
      }

      entries.splice(index, 1);
      await saveAllEntriesToStorage(entries);
      return { success: true as const };
    });

    if (!result.success) {
      return errorResult(
        createCustomerServiceError(
          'WORK_LOG_ENTRY_NOT_FOUND',
          '作業記録が見つかりません'
        )
      );
    }

    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to delete work log entry',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Delete all work log entries for a customer
 * Called when customer is deleted
 */
export async function deleteWorkLogEntriesByCustomer(
  customerId: string
): Promise<CustomerDomainResult<void>> {
  try {
    await workLogEntriesQueue.enqueue(async () => {
      const entries = await getAllEntriesFromStorage();
      const filtered = entries.filter((e) => e.customerId !== customerId);
      await saveAllEntriesToStorage(filtered);
    });

    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to delete work log entries',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}
