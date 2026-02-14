/**
 * v6-remove-undated-photos: Remove orphaned photos
 *
 * This migration:
 * 1. Deletes photo files for photos referencing non-existent work log entries (orphaned)
 * 2. Removes orphaned photo records from storage
 * 3. Preserves photos with workLogEntryId = null (unassigned, set by v5)
 *
 * This cleanup runs on every app launch as part of migration check to catch:
 * - Orphaned photos from failed deletions or partial operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import {
  Migration,
  MigrationStepResult,
  MigrationError,
} from '../migrationRunner';
import { STORAGE_KEYS } from '@/utils/constants';
import { photosQueue } from '@/utils/writeQueue';
import type { CustomerPhoto } from '@/types/customerPhoto';
import type { WorkLogEntry } from '@/types/workLogEntry';

/**
 * v6 Migration: Remove orphaned photos
 * Also exported for use in orphan cleanup on app launch.
 */
export const v6RemoveUndatedPhotosMigration: Migration = {
  fromVersion: 5,
  toVersion: 6,
  description: 'Remove orphaned photos (referencing deleted entries)',

  migrate: async (): Promise<MigrationStepResult> => {
    try {
      await cleanupOrphanedPhotos();
      return { success: true };
    } catch (error) {
      const migrationError: MigrationError = {
        code: 'MIGRATION_FAILED',
        message: 'Failed to migrate to v6 schema (remove orphaned photos)',
        fromVersion: 5,
        toVersion: 6,
        originalError: error instanceof Error ? error : undefined,
      };

      return {
        success: false,
        error: migrationError,
      };
    }
  },
};

/**
 * Clean up orphaned photos.
 * This function can be called independently for ongoing cleanup.
 *
 * Orphaned photos are photos referencing a workLogEntryId that no longer
 * exists (deleted entry). Photos with workLogEntryId = null are "unassigned"
 * (e.g. set by v5 migration) and are intentionally preserved.
 *
 * Uses photosQueue to ensure serialized access to photo storage,
 * preventing race conditions with concurrent photo operations.
 */
export async function cleanupOrphanedPhotos(): Promise<{ deleted: number }> {
  return await photosQueue.enqueue(async () => {
    // Load photos and work log entries
    const [photosJson, entriesJson] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.CUSTOMER_PHOTOS),
      AsyncStorage.getItem(STORAGE_KEYS.WORK_LOG_ENTRIES),
    ]);

    const photos: CustomerPhoto[] = photosJson ? JSON.parse(photosJson) : [];
    const entries: WorkLogEntry[] = entriesJson ? JSON.parse(entriesJson) : [];

    // Create set of valid entry IDs for fast lookup
    const validEntryIds = new Set(entries.map((e) => e.id));

    // Separate valid and orphaned photos
    const orphanedPhotos: CustomerPhoto[] = [];
    const validPhotos: CustomerPhoto[] = [];

    for (const photo of photos) {
      if (
        photo.workLogEntryId !== null &&
        !validEntryIds.has(photo.workLogEntryId)
      ) {
        orphanedPhotos.push(photo);
      } else {
        validPhotos.push(photo);
      }
    }

    // Delete orphaned photo files
    // Only remove metadata for photos whose files were successfully deleted
    const successfullyDeletedPhotos: CustomerPhoto[] = [];
    for (const photo of orphanedPhotos) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(photo.uri);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(photo.uri, { idempotent: true });
        }
        // File deleted or doesn't exist - mark as successfully handled
        successfullyDeletedPhotos.push(photo);
      } catch (error) {
        // File deletion failed - keep metadata for next cleanup attempt
        if (__DEV__) console.warn('Failed to delete orphaned photo file, will retry:', photo.uri, error);
        validPhotos.push(photo);
      }
    }

    // Save photos (valid + failed-to-delete orphans)
    await AsyncStorage.setItem(
      STORAGE_KEYS.CUSTOMER_PHOTOS,
      JSON.stringify(validPhotos)
    );

    return { deleted: successfullyDeletedPhotos.length };
  });
}
