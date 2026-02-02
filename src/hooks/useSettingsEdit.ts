/**
 * useSettingsEdit Hook
 *
 * Manages settings form state and persistence.
 */

import { useReducer, useEffect, useCallback } from 'react';
import type { SettingsFormValues, SettingsFormErrors } from '@/domain/settings/types';
import { validateSettingsForm } from '@/domain/settings/validationService';
import type { AppSettings, SensitiveIssuerSettings } from '@/types/settings';
import { DEFAULT_APP_SETTINGS, DEFAULT_SENSITIVE_SETTINGS } from '@/types/settings';
import { getSettings, updateSettings } from '@/storage/asyncStorageService';
import {
  getSensitiveIssuerInfo,
  saveSensitiveIssuerInfo,
} from '@/storage/secureStorageService';
import { formatDocumentNumber } from '@/domain/document/autoNumberingService';

// Export types for external use
export type { SettingsFormValues };

/**
 * Settings edit state
 */
export interface SettingsEditState {
  values: SettingsFormValues;
  nextEstimateNumber: number;
  nextInvoiceNumber: number;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  errors: SettingsFormErrors;
  errorMessage: string | null;
}

/**
 * Settings edit actions
 */
export type SettingsEditAction =
  | { type: 'START_LOADING' }
  | {
      type: 'LOAD_SUCCESS';
      appSettings: AppSettings;
      sensitiveSettings: SensitiveIssuerSettings | null;
    }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'UPDATE_FIELD'; field: keyof SettingsFormValues; value: string }
  | { type: 'UPDATE_SEAL_IMAGE'; uri: string | null }
  | { type: 'SET_ERRORS'; errors: SettingsFormErrors }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'START_SAVING' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; message: string };

/**
 * Initial form values
 */
const initialFormValues: SettingsFormValues = {
  companyName: '',
  representativeName: '',
  address: '',
  phone: '',
  estimatePrefix: 'EST-',
  invoicePrefix: 'INV-',
  sealImageUri: null,
  invoiceNumber: '',
  bankName: '',
  branchName: '',
  accountType: '',
  accountNumber: '',
  accountHolderName: '',
};

/**
 * Initial state
 */
export const initialSettingsEditState: SettingsEditState = {
  values: initialFormValues,
  nextEstimateNumber: 1,
  nextInvoiceNumber: 1,
  isLoading: true,
  isSaving: false,
  isDirty: false,
  errors: {},
  errorMessage: null,
};

/**
 * Creates form values from loaded settings
 */
export function createInitialFormValues(
  appSettings: AppSettings,
  sensitiveSettings: SensitiveIssuerSettings | null
): SettingsFormValues {
  const { issuer, numbering } = appSettings;
  const bankAccount = sensitiveSettings?.bankAccount;

  return {
    // AsyncStorage fields
    companyName: issuer.companyName ?? '',
    representativeName: issuer.representativeName ?? '',
    address: issuer.address ?? '',
    phone: issuer.phone ?? '',
    estimatePrefix: numbering.estimatePrefix,
    invoicePrefix: numbering.invoicePrefix,
    sealImageUri: issuer.sealImageUri ?? null,
    // SecureStore fields
    invoiceNumber: sensitiveSettings?.invoiceNumber ?? '',
    bankName: bankAccount?.bankName ?? '',
    branchName: bankAccount?.branchName ?? '',
    accountType: bankAccount?.accountType ?? '',
    accountNumber: bankAccount?.accountNumber ?? '',
    accountHolderName: bankAccount?.accountHolderName ?? '',
  };
}

/**
 * Reducer for settings edit state
 */
export function settingsEditReducer(
  state: SettingsEditState,
  action: SettingsEditAction
): SettingsEditState {
  switch (action.type) {
    case 'START_LOADING':
      return {
        ...state,
        isLoading: true,
        errorMessage: null,
      };

    case 'LOAD_SUCCESS': {
      const values = createInitialFormValues(
        action.appSettings,
        action.sensitiveSettings
      );
      return {
        ...state,
        isLoading: false,
        values,
        nextEstimateNumber: action.appSettings.numbering.nextEstimateNumber,
        nextInvoiceNumber: action.appSettings.numbering.nextInvoiceNumber,
        isDirty: false,
        errors: {},
        errorMessage: null,
      };
    }

    case 'LOAD_ERROR':
      return {
        ...state,
        isLoading: false,
        errorMessage: action.message,
      };

    case 'UPDATE_FIELD': {
      // Remove error for the updated field
      const { [action.field]: _removed, ...remainingErrors } = state.errors;
      return {
        ...state,
        values: {
          ...state.values,
          [action.field]: action.value,
        },
        errors: remainingErrors,
        isDirty: true,
      };
    }

    case 'UPDATE_SEAL_IMAGE':
      return {
        ...state,
        values: {
          ...state.values,
          sealImageUri: action.uri,
        },
        isDirty: true,
      };

    case 'SET_ERRORS':
      return {
        ...state,
        errors: action.errors,
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: {},
      };

    case 'START_SAVING':
      return {
        ...state,
        isSaving: true,
        errorMessage: null,
      };

    case 'SAVE_SUCCESS':
      return {
        ...state,
        isSaving: false,
        isDirty: false,
        errorMessage: null,
      };

    case 'SAVE_ERROR':
      return {
        ...state,
        isSaving: false,
        errorMessage: action.message,
      };

    default:
      return state;
  }
}

/**
 * Return type for useSettingsEdit hook
 */
export interface UseSettingsEditReturn {
  state: SettingsEditState;
  updateField: (field: keyof SettingsFormValues, value: string) => void;
  updateSealImage: (uri: string | null) => void;
  save: () => Promise<boolean>;
  validate: () => boolean;
  getFormattedNextNumber: (type: 'estimate' | 'invoice') => string;
  reload: () => Promise<void>;
}

/**
 * Hook for managing settings form state
 */
export function useSettingsEdit(): UseSettingsEditReturn {
  const [state, dispatch] = useReducer(
    settingsEditReducer,
    initialSettingsEditState
  );

  // Load/reload settings function
  const reload = useCallback(async () => {
    dispatch({ type: 'START_LOADING' });

    try {
      // Load from AsyncStorage
      const appSettingsResult = await getSettings();

      // Check for AsyncStorage read errors (parse errors, etc.)
      if (!appSettingsResult.success) {
        dispatch({
          type: 'LOAD_ERROR',
          message:
            appSettingsResult.error?.message ?? '設定の読み込みに失敗しました',
        });
        return;
      }

      const appSettings: AppSettings =
        appSettingsResult.data ?? DEFAULT_APP_SETTINGS;

      // Load from SecureStore
      const sensitiveResult = await getSensitiveIssuerInfo();

      // Distinguish between "no data" (success with null) and "read error" (failure)
      // Read errors must block to prevent silent data loss on save
      if (!sensitiveResult.success) {
        dispatch({
          type: 'LOAD_ERROR',
          message:
            sensitiveResult.error?.message ??
            '機密情報の読み込みに失敗しました。再試行してください。',
        });
        return;
      }

      // Success with null means no data exists yet (first time use)
      // This is safe - saving will create new data, not overwrite existing
      const sensitiveSettings: SensitiveIssuerSettings | null =
        sensitiveResult.data ?? null;

      dispatch({
        type: 'LOAD_SUCCESS',
        appSettings,
        sensitiveSettings,
      });
    } catch (error) {
      dispatch({
        type: 'LOAD_ERROR',
        message: '設定の読み込みに失敗しました',
      });
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    reload();
  }, [reload]);

  // Update a single field
  const updateField = useCallback(
    (field: keyof SettingsFormValues, value: string) => {
      dispatch({ type: 'UPDATE_FIELD', field, value });
    },
    []
  );

  // Update seal image URI
  const updateSealImage = useCallback((uri: string | null) => {
    dispatch({ type: 'UPDATE_SEAL_IMAGE', uri });
  }, []);

  // Validate the form
  const validate = useCallback((): boolean => {
    const errors = validateSettingsForm(state.values);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors });
      return false;
    }
    dispatch({ type: 'CLEAR_ERRORS' });
    return true;
  }, [state.values]);

  // Save settings
  const save = useCallback(async (): Promise<boolean> => {
    // Validate first
    const errors = validateSettingsForm(state.values);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors });
      return false;
    }

    dispatch({ type: 'START_SAVING' });

    try {
      // Save to AsyncStorage (non-sensitive data)
      // IMPORTANT: Do NOT include nextEstimateNumber/nextInvoiceNumber here!
      // Those are managed exclusively by autoNumberingService to prevent race conditions.
      // updateSettings performs deep merge, so omitting next* fields preserves existing values.
      const appSettingsResult = await updateSettings({
        issuer: {
          companyName: state.values.companyName || null,
          representativeName: state.values.representativeName || null,
          address: state.values.address || null,
          phone: state.values.phone || null,
          sealImageUri: state.values.sealImageUri,
        },
        // Only update prefixes, NOT next numbers (managed by autoNumberingService)
        numbering: {
          estimatePrefix: state.values.estimatePrefix,
          invoicePrefix: state.values.invoicePrefix,
        } as AppSettings['numbering'],
      });

      if (!appSettingsResult.success) {
        throw new Error(
          appSettingsResult.error?.message ?? 'AsyncStorage保存に失敗しました'
        );
      }

      // Save to SecureStore (sensitive data)
      const sensitiveResult = await saveSensitiveIssuerInfo({
        invoiceNumber: state.values.invoiceNumber || null,
        bankAccount: {
          bankName: state.values.bankName || null,
          branchName: state.values.branchName || null,
          accountType:
            state.values.accountType === '' ? null : state.values.accountType,
          accountNumber: state.values.accountNumber || null,
          accountHolderName: state.values.accountHolderName || null,
        },
      });

      if (!sensitiveResult.success) {
        throw new Error(
          sensitiveResult.error?.message ?? 'SecureStore保存に失敗しました'
        );
      }

      dispatch({ type: 'SAVE_SUCCESS' });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '保存に失敗しました';
      dispatch({ type: 'SAVE_ERROR', message });
      return false;
    }
  }, [state.values]);

  // Format next document number for display
  const getFormattedNextNumber = useCallback(
    (type: 'estimate' | 'invoice'): string => {
      if (type === 'estimate') {
        return formatDocumentNumber(
          state.values.estimatePrefix,
          state.nextEstimateNumber
        );
      }
      return formatDocumentNumber(
        state.values.invoicePrefix,
        state.nextInvoiceNumber
      );
    },
    [
      state.values.estimatePrefix,
      state.values.invoicePrefix,
      state.nextEstimateNumber,
      state.nextInvoiceNumber,
    ]
  );

  return {
    state,
    updateField,
    updateSealImage,
    save,
    validate,
    getFormattedNextNumber,
    reload,
  };
}
