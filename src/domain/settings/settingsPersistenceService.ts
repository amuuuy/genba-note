/**
 * Settings Persistence Service
 *
 * Domain service for loading and saving settings across AsyncStorage and SecureStore.
 * Implements 2-phase save with rollback to ensure data consistency.
 */

import type { SettingsFormValues } from './types';
import type { AppSettings, SensitiveIssuerSettings } from '@/types/settings';
import { DEFAULT_APP_SETTINGS } from '@/types/settings';
import { getSettings, updateSettings } from '@/storage/asyncStorageService';
import {
  getSensitiveIssuerInfo,
  saveSensitiveIssuerInfo,
  deleteSensitiveIssuerInfo,
} from '@/storage/secureStorageService';
import { deleteStoredImage, isValidBackgroundImageUri } from '@/utils/imageUtils';

// === Result Types ===

export type LoadSettingsResult =
  | {
      success: true;
      appSettings: AppSettings;
      sensitiveSettings: SensitiveIssuerSettings | null;
    }
  | { success: false; message: string };

export type SaveSettingsResult =
  | { success: true }
  | { success: false; message: string };

// === Load ===

/**
 * Load settings from both AsyncStorage and SecureStore.
 *
 * Returns AppSettings and SensitiveIssuerSettings on success.
 * Returns an error message if either storage read fails.
 * A null sensitiveSettings is valid (first-time use).
 */
export async function loadSettings(): Promise<LoadSettingsResult> {
  // Load from AsyncStorage
  const appSettingsResult = await getSettings();

  if (!appSettingsResult.success) {
    return {
      success: false,
      message:
        appSettingsResult.error?.message ?? '設定の読み込みに失敗しました',
    };
  }

  const appSettings: AppSettings =
    appSettingsResult.data ?? DEFAULT_APP_SETTINGS;

  // Load from SecureStore
  // Distinguish between "no data" (success with null) and "read error" (failure)
  // Read errors must block to prevent silent data loss on save
  const sensitiveResult = await getSensitiveIssuerInfo();

  if (!sensitiveResult.success) {
    return {
      success: false,
      message:
        sensitiveResult.error?.message ??
        '機密情報の読み込みに失敗しました。再試行してください。',
    };
  }

  // Success with null means no data exists yet (first time use)
  // This is safe - saving will create new data, not overwrite existing
  return {
    success: true,
    appSettings,
    sensitiveSettings: sensitiveResult.data ?? null,
  };
}

// === Save ===

/**
 * Save settings to both SecureStore and AsyncStorage with 2-phase commit.
 *
 * Phase 1: Save to SecureStore (stricter 2KB limit, saved first)
 * Phase 2: Save to AsyncStorage (after SecureStore success)
 * Rollback: If AsyncStorage fails, roll back SecureStore to previous state
 *
 * Also handles post-save cleanup of old background images.
 *
 * IMPORTANT: nextEstimateNumber/nextInvoiceNumber are NOT saved here.
 * Those are managed exclusively by autoNumberingService.
 */
export async function saveSettings(
  values: SettingsFormValues
): Promise<SaveSettingsResult> {
  try {
    // 0. Capture previous backgroundImageUri for post-save cleanup
    const previousSettingsResult = await getSettings();
    const previousBackgroundImageUri = previousSettingsResult.success
      ? (previousSettingsResult.data?.backgroundImageUri ?? null)
      : null;

    // 1. Get current SecureStore values for potential rollback
    const previousSensitiveResult = await getSensitiveIssuerInfo();

    // If we can't read current state, abort to prevent inconsistency on rollback
    if (!previousSensitiveResult.success) {
      return {
        success: false,
        message:
          previousSensitiveResult.error?.message ??
          '現在の設定を取得できませんでした。保存を中断します。',
      };
    }
    const previousSensitive = previousSensitiveResult.data; // Can be null (first time)

    // 2. Prepare new sensitive data
    const newSensitiveData: SensitiveIssuerSettings = {
      invoiceNumber: values.invoiceNumber || null,
      bankAccount: {
        bankName: values.bankName || null,
        branchName: values.branchName || null,
        accountType:
          values.accountType === '' ? null : values.accountType,
        accountNumber: values.accountNumber || null,
        accountHolderName: values.accountHolderName || null,
      },
    };

    // 3. Save to SecureStore FIRST (has stricter constraints - 2KB limit)
    // If this fails, AsyncStorage remains unchanged, avoiding partial save state
    const sensitiveResult = await saveSensitiveIssuerInfo(newSensitiveData);

    if (!sensitiveResult.success) {
      return {
        success: false,
        message:
          sensitiveResult.error?.message ?? 'SecureStore保存に失敗しました',
      };
    }

    // 4. Save to AsyncStorage AFTER SecureStore success
    // IMPORTANT: Do NOT include nextEstimateNumber/nextInvoiceNumber here!
    // Those are managed exclusively by autoNumberingService to prevent race conditions.
    // updateSettings performs deep merge, so omitting next* fields preserves existing values.
    const appSettingsResult = await updateSettings({
      issuer: {
        companyName: values.companyName || null,
        representativeName: values.representativeName || null,
        address: values.address || null,
        phone: values.phone || null,
        fax: values.fax || null,
        contactPerson: values.contactPerson || null,
        showContactPerson: values.showContactPerson,
        email: values.email || null,
        sealImageUri: values.sealImageUri,
      },
      // Only update prefixes, NOT next numbers (managed by autoNumberingService)
      numbering: {
        estimatePrefix: values.estimatePrefix,
        invoicePrefix: values.invoicePrefix,
      } as AppSettings['numbering'],
      invoiceTemplateType: values.invoiceTemplateType,
      sealSize: values.sealSize,
      backgroundDesign: values.backgroundDesign,
      backgroundImageUri: values.backgroundImageUri,
      defaultEstimateTemplateId: values.defaultEstimateTemplateId,
      defaultInvoiceTemplateId: values.defaultInvoiceTemplateId,
    });

    if (!appSettingsResult.success) {
      // 5. Rollback SecureStore on AsyncStorage failure to maintain consistency
      // Handle both existing data (restore) and no previous data (delete)
      if (previousSensitive !== null && previousSensitive !== undefined) {
        // Restore previous values
        const rollbackResult =
          await saveSensitiveIssuerInfo(previousSensitive);
        if (!rollbackResult.success) {
          // Critical: both storages are now inconsistent
          return {
            success: false,
            message:
              'AsyncStorage保存に失敗し、SecureStoreのロールバックにも失敗しました。データの整合性が保てない可能性があります。',
          };
        }
      } else {
        // First save case: delete the newly saved data to restore original state (no data)
        const deleteResult = await deleteSensitiveIssuerInfo();
        if (!deleteResult.success) {
          // Critical: SecureStore has orphaned data
          return {
            success: false,
            message:
              'AsyncStorage保存に失敗し、SecureStoreの削除にも失敗しました。データの整合性が保てない可能性があります。',
          };
        }
      }
      return {
        success: false,
        message:
          appSettingsResult.error?.message ?? 'AsyncStorage保存に失敗しました',
      };
    }

    // Post-save cleanup: delete old background image if URI changed
    if (
      previousBackgroundImageUri &&
      previousBackgroundImageUri !== values.backgroundImageUri &&
      isValidBackgroundImageUri(previousBackgroundImageUri)
    ) {
      deleteStoredImage(previousBackgroundImageUri).catch((err) => {
        if (__DEV__) console.warn('Failed to cleanup old background image:', err);
      });
    }

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '保存に失敗しました';
    return { success: false, message };
  }
}
