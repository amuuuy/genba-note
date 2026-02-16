/**
 * Document Creation Counter
 *
 * Tracks the cumulative number of documents ever created.
 * This counter only increases - deleting documents does NOT decrease it.
 * Used to enforce the free tier document creation limit.
 *
 * Fail-closed: corrupt/unreadable counter blocks document creation.
 * Atomic: read-modify-write is serialized via documentCounterQueue.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createWriteQueue } from '@/utils/writeQueue';

export const DOCUMENT_CREATION_COUNT_KEY = '@genba_document_creation_count';

/** Dedicated queue for counter RMW atomicity */
const documentCounterQueue = createWriteQueue();

/** Result type for counter operations */
export interface CounterResult {
  success: boolean;
  count: number;
  error?: string;
}

/**
 * Get the cumulative document creation count.
 * Fail-closed: returns error on corrupt or unreadable data.
 */
export async function getDocumentCreationCount(): Promise<CounterResult> {
  try {
    const value = await AsyncStorage.getItem(DOCUMENT_CREATION_COUNT_KEY);
    if (value === null) return { success: true, count: 0 };

    if (!/^\d+$/.test(value)) {
      return {
        success: false,
        count: 0,
        error: `Corrupt counter value: ${value}`,
      };
    }
    const count = Number(value);
    if (!Number.isSafeInteger(count) || count < 0) {
      return {
        success: false,
        count: 0,
        error: `Corrupt counter value: ${value}`,
      };
    }

    return { success: true, count };
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Increment the cumulative document creation count by 1.
 * Serialized via documentCounterQueue to prevent RMW race conditions.
 * Fail-closed: rejects if current count is corrupt or unreadable.
 *
 * @returns CounterResult with the new count, or error
 */
export async function incrementDocumentCreationCount(): Promise<CounterResult> {
  return documentCounterQueue.enqueue(async () => {
    const current = await getDocumentCreationCount();
    if (!current.success) {
      return current; // Propagate error - fail-closed
    }

    const newCount = current.count + 1;
    try {
      await AsyncStorage.setItem(DOCUMENT_CREATION_COUNT_KEY, String(newCount));
      return { success: true, count: newCount };
    } catch (error) {
      return {
        success: false,
        count: current.count,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}
