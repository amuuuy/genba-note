/**
 * v1-initial: Initial schema definition
 *
 * This migration handles first-time setup:
 * - If no data exists, initializes with defaults
 * - If data exists with no schema version (legacy), preserves existing data
 *
 * Schema v1 structure:
 * - @genba_documents: Document[] (empty by default)
 * - @genba_unitPrices: UnitPrice[] (empty by default)
 * - @genba_settings: AppSettings (DEFAULT_APP_SETTINGS)
 * - @genba_schemaVersion: 1
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Migration, MigrationStepResult, MigrationError } from '../migrationRunner';
import { DEFAULT_APP_SETTINGS } from '@/types/settings';
import { STORAGE_KEYS } from '@/utils/constants';

/**
 * v1 Initial Migration
 *
 * Initializes storage with default values if they don't exist.
 * Preserves any existing data (for legacy migration scenarios).
 */
export const v1InitialMigration: Migration = {
  fromVersion: 0,
  toVersion: 1,
  description: 'Initial schema setup with default settings',

  migrate: async (): Promise<MigrationStepResult> => {
    try {
      // Check existing data and initialize only if null
      const [existingSettings, existingDocs, existingPrices] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SETTINGS),
        AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.UNIT_PRICES),
      ]);

      const setOperations: Promise<void>[] = [];

      // Initialize settings with defaults if not exist
      if (existingSettings === null) {
        setOperations.push(
          AsyncStorage.setItem(
            STORAGE_KEYS.SETTINGS,
            JSON.stringify(DEFAULT_APP_SETTINGS)
          )
        );
      }

      // Initialize documents array if not exist
      if (existingDocs === null) {
        setOperations.push(
          AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify([]))
        );
      }

      // Initialize unit prices array if not exist
      if (existingPrices === null) {
        setOperations.push(
          AsyncStorage.setItem(STORAGE_KEYS.UNIT_PRICES, JSON.stringify([]))
        );
      }

      // Execute all set operations
      await Promise.all(setOperations);

      return { success: true };
    } catch (error) {
      const migrationError: MigrationError = {
        code: 'MIGRATION_FAILED',
        message: 'Failed to initialize v1 schema',
        fromVersion: 0,
        toVersion: 1,
        originalError: error instanceof Error ? error : undefined,
      };

      return {
        success: false,
        error: migrationError,
      };
    }
  },
};
