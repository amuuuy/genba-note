/**
 * v9 Migration: Add email field to issuer information
 *
 * This migration adds:
 * - IssuerSnapshot.email (null for existing documents)
 * - AppSettings.issuer.email (null)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Migration, MigrationStepResult, MigrationError } from '../migrationRunner';
import { STORAGE_KEYS } from '@/utils/constants';
import type { Document, IssuerSnapshot } from '@/types/document';
import type { AppSettings } from '@/types/settings';

/**
 * v9 Migration: Add email field to issuer information
 */
export const v9AddEmailFieldMigration: Migration = {
  fromVersion: 8,
  toVersion: 9,
  description: 'Add email field to issuer snapshot and settings',

  migrate: async (): Promise<MigrationStepResult> => {
    try {
      // Migrate documents
      const documentsJson = await AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (documentsJson) {
        const documents = JSON.parse(documentsJson) as Document[];
        const migratedDocuments = documents.map((doc) => ({
          ...doc,
          issuerSnapshot: {
            ...doc.issuerSnapshot,
            email: (doc.issuerSnapshot as IssuerSnapshot).email ?? null,
          },
        }));
        await AsyncStorage.setItem(
          STORAGE_KEYS.DOCUMENTS,
          JSON.stringify(migratedDocuments)
        );
      }

      // Migrate settings
      const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        // Defensive: guard against corrupted root (e.g. JSON.parse("null") → null)
        if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
          return { success: true };
        }
        // Defensive: ensure issuer object exists (handles partial data corruption)
        const issuer = (settings as AppSettings).issuer ?? {} as AppSettings['issuer'];
        const migratedSettings: AppSettings = {
          ...settings,
          issuer: {
            ...issuer,
            email: issuer.email ?? null,
          },
        };
        await AsyncStorage.setItem(
          STORAGE_KEYS.SETTINGS,
          JSON.stringify(migratedSettings)
        );
      }

      return { success: true };
    } catch (error) {
      const migrationError: MigrationError = {
        code: 'MIGRATION_FAILED',
        message: 'Failed to migrate to v9 schema',
        fromVersion: 8,
        toVersion: 9,
        originalError: error instanceof Error ? error : undefined,
      };

      return {
        success: false,
        error: migrationError,
      };
    }
  },
};
