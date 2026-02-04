/**
 * v5-add-work-log-entries: Add work log entries for date-based photo grouping
 *
 * This migration:
 * 1. Initializes empty work_log_entries collection
 * 2. Adds workLogEntryId: null to all existing CustomerPhoto records
 *
 * Existing photos will appear in "日付未設定" (undated) section until
 * users assign them to specific work log entries.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Migration,
  MigrationStepResult,
  MigrationError,
} from '../migrationRunner';
import { STORAGE_KEYS } from '@/utils/constants';
import type { WorkLogEntry } from '@/types/workLogEntry';

/**
 * Legacy CustomerPhoto type (before v5 migration)
 * Does not have workLogEntryId field
 */
interface LegacyCustomerPhoto {
  id: string;
  customerId: string;
  type: 'before' | 'after';
  uri: string;
  originalFilename: string | null;
  takenAt: number;
  createdAt: number;
}

/**
 * v5 Migration: Add work log entries for date-based photo grouping
 */
export const v5AddWorkLogEntriesMigration: Migration = {
  fromVersion: 4,
  toVersion: 5,
  description: 'Add work log entries for date-based photo grouping',

  migrate: async (): Promise<MigrationStepResult> => {
    try {
      // Step 1: Initialize empty work_log_entries collection
      const emptyWorkLogEntries: WorkLogEntry[] = [];
      await AsyncStorage.setItem(
        STORAGE_KEYS.WORK_LOG_ENTRIES,
        JSON.stringify(emptyWorkLogEntries)
      );

      // Step 2: Load existing photos and add workLogEntryId: null
      const photosJson = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOMER_PHOTOS);
      const legacyPhotos: LegacyCustomerPhoto[] = photosJson
        ? JSON.parse(photosJson)
        : [];

      // Add workLogEntryId: null to all existing photos
      const migratedPhotos = legacyPhotos.map((photo) => ({
        ...photo,
        workLogEntryId: null,
      }));

      await AsyncStorage.setItem(
        STORAGE_KEYS.CUSTOMER_PHOTOS,
        JSON.stringify(migratedPhotos)
      );

      return { success: true };
    } catch (error) {
      const migrationError: MigrationError = {
        code: 'MIGRATION_FAILED',
        message: 'Failed to migrate to v5 schema (work log entries)',
        fromVersion: 4,
        toVersion: 5,
        originalError: error instanceof Error ? error : undefined,
      };

      return {
        success: false,
        error: migrationError,
      };
    }
  },
};
