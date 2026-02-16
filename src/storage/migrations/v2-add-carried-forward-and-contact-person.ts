/**
 * v2-add-carried-forward-and-contact-person: Add new fields
 *
 * This migration adds:
 * - Document.carriedForwardAmount (null for existing documents)
 * - IssuerSnapshot.contactPerson (null for existing documents)
 * - AppSettings.issuer.contactPerson (null)
 * - AppSettings.issuer.showContactPerson (true)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Migration, MigrationStepResult, MigrationError } from '../migrationRunner';
import { STORAGE_KEYS } from '@/utils/constants';
import type { Document, IssuerSnapshot } from '@/types/document';
import type { AppSettings } from '@/types/settings';

/**
 * v2 Migration: Add carried forward amount and contact person fields
 */
export const v2AddCarriedForwardAndContactPersonMigration: Migration = {
  fromVersion: 1,
  toVersion: 2,
  description: 'Add carriedForwardAmount to documents and contactPerson to issuer settings',

  migrate: async (): Promise<MigrationStepResult> => {
    try {
      // Migrate documents
      const documentsJson = await AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (documentsJson) {
        const documents = JSON.parse(documentsJson) as Document[];
        const migratedDocuments = documents.map((doc) => ({
          ...doc,
          // Add carriedForwardAmount if not exists
          carriedForwardAmount: doc.carriedForwardAmount ?? null,
          // Add contactPerson to issuerSnapshot if not exists
          issuerSnapshot: {
            ...doc.issuerSnapshot,
            contactPerson: (doc.issuerSnapshot as IssuerSnapshot).contactPerson ?? null,
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
            // Add contactPerson if not exists
            contactPerson: issuer.contactPerson ?? null,
            // Add showContactPerson if not exists (default to true)
            showContactPerson: issuer.showContactPerson ?? true,
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
        message: 'Failed to migrate to v2 schema',
        fromVersion: 1,
        toVersion: 2,
        originalError: error instanceof Error ? error : undefined,
      };

      return {
        success: false,
        error: migrationError,
      };
    }
  },
};
