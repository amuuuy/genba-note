/**
 * v3-add-fax-field: Add fax field to issuer information
 *
 * This migration adds:
 * - IssuerSnapshot.fax (null for existing documents)
 * - AppSettings.issuer.fax (null)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Migration, MigrationStepResult, MigrationError } from '../migrationRunner';
import { STORAGE_KEYS } from '@/utils/constants';
import type { Document, IssuerSnapshot } from '@/types/document';
import type { AppSettings } from '@/types/settings';

/**
 * v3 Migration: Add fax field to issuer information
 */
export const v3AddFaxFieldMigration: Migration = {
  fromVersion: 2,
  toVersion: 3,
  description: 'Add fax field to issuer snapshot and settings',

  migrate: async (): Promise<MigrationStepResult> => {
    try {
      // Migrate documents
      const documentsJson = await AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (documentsJson) {
        const documents = JSON.parse(documentsJson) as Document[];
        const migratedDocuments = documents.map((doc) => ({
          ...doc,
          // Add fax to issuerSnapshot if not exists
          issuerSnapshot: {
            ...doc.issuerSnapshot,
            fax: (doc.issuerSnapshot as IssuerSnapshot).fax ?? null,
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
            // Add fax if not exists
            fax: issuer.fax ?? null,
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
        message: 'Failed to migrate to v3 schema',
        fromVersion: 2,
        toVersion: 3,
        originalError: error instanceof Error ? error : undefined,
      };

      return {
        success: false,
        error: migrationError,
      };
    }
  },
};
