/**
 * Document Creation Counter
 *
 * Tracks the cumulative number of documents ever created.
 * This counter only increases - deleting documents does NOT decrease it.
 * Used to enforce the free tier document creation limit.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const DOCUMENT_CREATION_COUNT_KEY = '@genba_document_creation_count';

/**
 * Get the cumulative document creation count.
 * Returns 0 if no value is stored, value is corrupt, or on read error.
 */
export async function getDocumentCreationCount(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem(DOCUMENT_CREATION_COUNT_KEY);
    if (value === null) return 0;

    const count = parseInt(value, 10);
    if (isNaN(count) || count < 0) return 0;

    return count;
  } catch {
    return 0;
  }
}

/**
 * Increment the cumulative document creation count by 1.
 * Should be called once each time a NEW document is created (not on edits).
 *
 * @returns The new count after incrementing
 * @throws If AsyncStorage write fails
 */
export async function incrementDocumentCreationCount(): Promise<number> {
  const current = await getDocumentCreationCount();
  const newCount = current + 1;
  await AsyncStorage.setItem(DOCUMENT_CREATION_COUNT_KEY, String(newCount));
  return newCount;
}
