/**
 * v7-add-pdf-customization: Add PDF customization fields to AppSettings
 *
 * This migration:
 * 1. Reads existing settings from AsyncStorage
 * 2. Adds sealSize, backgroundDesign, defaultEstimateTemplateId, defaultInvoiceTemplateId
 * 3. Maps invoiceTemplateType → defaultInvoiceTemplateId for backward compatibility
 * 4. Writes updated settings back to AsyncStorage
 *
 * No existing fields are modified or removed (additive-only).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Migration, MigrationStepResult, MigrationError } from '../migrationRunner';
import { STORAGE_KEYS } from '@/utils/constants';

export const v7AddPdfCustomizationMigration: Migration = {
  fromVersion: 6,
  toVersion: 7,
  description: 'Add PDF customization fields (sealSize, backgroundDesign, template IDs)',

  migrate: async (): Promise<MigrationStepResult> => {
    try {
      // Step 1: Load existing settings
      const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      const settings = settingsJson ? JSON.parse(settingsJson) : {};

      // Step 2: Map invoiceTemplateType → defaultInvoiceTemplateId
      const invoiceTemplateType = settings.invoiceTemplateType;
      const defaultInvoiceTemplateId =
        invoiceTemplateType === 'SIMPLE' ? 'SIMPLE' : 'ACCOUNTING';

      // Step 3: Add new fields only if not already present (idempotent)
      const migratedSettings = {
        ...settings,
        sealSize: settings.sealSize ?? 'MEDIUM',
        backgroundDesign: settings.backgroundDesign ?? 'NONE',
        defaultEstimateTemplateId: settings.defaultEstimateTemplateId ?? 'FORMAL_STANDARD',
        defaultInvoiceTemplateId: settings.defaultInvoiceTemplateId ?? defaultInvoiceTemplateId,
      };

      // Step 4: Save updated settings
      await AsyncStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(migratedSettings)
      );

      return { success: true };
    } catch (error) {
      const migrationError: MigrationError = {
        code: 'MIGRATION_FAILED',
        message: 'Failed to migrate to v7 schema (PDF customization)',
        fromVersion: 6,
        toVersion: 7,
        originalError: error instanceof Error ? error : undefined,
      };

      return {
        success: false,
        error: migrationError,
      };
    }
  },
};
