/**
 * v8 Migration: Add calendar events collection
 *
 * This migration:
 * 1. Initializes empty CALENDAR_EVENTS collection (empty array)
 *
 * Rollback: v8 is additive only (new storage key).
 * Failure activates read-only mode. Existing data unaffected.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/utils/constants';
import type {
  Migration,
  MigrationStepResult,
  MigrationError,
} from '../migrationRunner';

export const v8AddCalendarEventsMigration: Migration = {
  fromVersion: 7,
  toVersion: 8,
  description: 'Add calendar events collection',

  migrate: async (): Promise<MigrationStepResult> => {
    try {
      // Initialize empty calendar events collection (idempotent)
      const existing = await AsyncStorage.getItem(STORAGE_KEYS.CALENDAR_EVENTS);
      if (existing === null) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.CALENDAR_EVENTS,
          JSON.stringify([])
        );
      }

      return { success: true };
    } catch (error) {
      const migrationError: MigrationError = {
        code: 'MIGRATION_FAILED',
        message: 'Failed to migrate to v8 schema (calendar events)',
        fromVersion: 7,
        toVersion: 8,
        originalError: error instanceof Error ? error : undefined,
      };
      return { success: false, error: migrationError };
    }
  },
};
