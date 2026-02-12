/**
 * useSettingsEdit Hook
 *
 * Manages settings form state and persistence.
 */

import { useReducer, useEffect, useCallback } from 'react';
import type { SettingsFormValues, SettingsFormErrors } from '@/domain/settings/types';
import { validateSettingsForm } from '@/domain/settings/validationService';
import {
  loadSettings as loadSettingsFromStorage,
  saveSettings as saveSettingsToStorage,
} from '@/domain/settings/settingsPersistenceService';
import type { AppSettings, SensitiveIssuerSettings } from '@/types/settings';
import { formatDocumentNumber } from '@/domain/document/autoNumberingService';
import type { InvoiceTemplateType, SealSize, BackgroundDesign, DocumentTemplateId } from '@/types/settings';
import { DEFAULT_INVOICE_TEMPLATE_TYPE, DEFAULT_SEAL_SIZE } from '@/types/settings';

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
  | { type: 'TOGGLE_SHOW_CONTACT_PERSON'; value: boolean }
  | { type: 'UPDATE_INVOICE_TEMPLATE_TYPE'; value: InvoiceTemplateType }
  | { type: 'UPDATE_SEAL_SIZE'; value: SealSize }
  | { type: 'UPDATE_BACKGROUND_DESIGN'; value: BackgroundDesign }
  | { type: 'UPDATE_BACKGROUND_IMAGE_URI'; uri: string | null }
  | { type: 'UPDATE_DEFAULT_ESTIMATE_TEMPLATE_ID'; value: DocumentTemplateId }
  | { type: 'UPDATE_DEFAULT_INVOICE_TEMPLATE_ID'; value: DocumentTemplateId }
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
  fax: '',
  contactPerson: '',
  showContactPerson: true,
  email: '',
  estimatePrefix: 'EST-',
  invoicePrefix: 'INV-',
  sealImageUri: null,
  invoiceTemplateType: DEFAULT_INVOICE_TEMPLATE_TYPE,
  sealSize: DEFAULT_SEAL_SIZE,
  backgroundDesign: 'NONE' as const,
  backgroundImageUri: null,
  defaultEstimateTemplateId: 'FORMAL_STANDARD' as const,
  defaultInvoiceTemplateId: 'ACCOUNTING' as const,
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
  const { issuer, numbering, invoiceTemplateType, sealSize, backgroundDesign, backgroundImageUri, defaultEstimateTemplateId, defaultInvoiceTemplateId } = appSettings;
  const bankAccount = sensitiveSettings?.bankAccount;

  return {
    // AsyncStorage fields
    companyName: issuer.companyName ?? '',
    representativeName: issuer.representativeName ?? '',
    address: issuer.address ?? '',
    phone: issuer.phone ?? '',
    fax: issuer.fax ?? '',
    contactPerson: issuer.contactPerson ?? '',
    showContactPerson: issuer.showContactPerson ?? true,
    email: issuer.email ?? '',
    estimatePrefix: numbering.estimatePrefix,
    invoicePrefix: numbering.invoicePrefix,
    sealImageUri: issuer.sealImageUri ?? null,
    invoiceTemplateType: invoiceTemplateType ?? DEFAULT_INVOICE_TEMPLATE_TYPE,
    sealSize: sealSize ?? DEFAULT_SEAL_SIZE,
    backgroundDesign: backgroundDesign ?? 'NONE',
    backgroundImageUri: backgroundImageUri ?? null,
    defaultEstimateTemplateId: defaultEstimateTemplateId ?? 'FORMAL_STANDARD',
    defaultInvoiceTemplateId: defaultInvoiceTemplateId ?? 'ACCOUNTING',
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

    case 'TOGGLE_SHOW_CONTACT_PERSON':
      return {
        ...state,
        values: {
          ...state.values,
          showContactPerson: action.value,
        },
        isDirty: true,
      };

    case 'UPDATE_INVOICE_TEMPLATE_TYPE':
      return {
        ...state,
        values: {
          ...state.values,
          invoiceTemplateType: action.value,
          // Sync defaultInvoiceTemplateId for backward compatibility
          defaultInvoiceTemplateId: action.value,
        },
        isDirty: true,
      };

    case 'UPDATE_SEAL_SIZE':
      return {
        ...state,
        values: {
          ...state.values,
          sealSize: action.value,
        },
        isDirty: true,
      };

    case 'UPDATE_BACKGROUND_DESIGN':
      return {
        ...state,
        values: {
          ...state.values,
          backgroundDesign: action.value,
        },
        isDirty: true,
      };

    case 'UPDATE_BACKGROUND_IMAGE_URI':
      return {
        ...state,
        values: {
          ...state.values,
          backgroundImageUri: action.uri,
        },
        isDirty: true,
      };

    case 'UPDATE_DEFAULT_ESTIMATE_TEMPLATE_ID':
      return {
        ...state,
        values: {
          ...state.values,
          defaultEstimateTemplateId: action.value,
        },
        isDirty: true,
      };

    case 'UPDATE_DEFAULT_INVOICE_TEMPLATE_ID':
      return {
        ...state,
        values: {
          ...state.values,
          defaultInvoiceTemplateId: action.value,
          // Sync legacy invoiceTemplateType for backward compatibility
          invoiceTemplateType: (action.value === 'ACCOUNTING' || action.value === 'SIMPLE')
            ? action.value as InvoiceTemplateType
            : 'ACCOUNTING' as InvoiceTemplateType,
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
  toggleShowContactPerson: (value: boolean) => void;
  updateInvoiceTemplateType: (value: InvoiceTemplateType) => void;
  updateSealSize: (value: SealSize) => void;
  updateBackgroundDesign: (value: BackgroundDesign) => void;
  updateBackgroundImageUri: (uri: string | null) => void;
  updateDefaultEstimateTemplateId: (value: DocumentTemplateId) => void;
  updateDefaultInvoiceTemplateId: (value: DocumentTemplateId) => void;
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

  // Load/reload settings function (delegates to domain service)
  const reload = useCallback(async () => {
    dispatch({ type: 'START_LOADING' });

    try {
      const result = await loadSettingsFromStorage();

      if (result.success) {
        dispatch({
          type: 'LOAD_SUCCESS',
          appSettings: result.appSettings,
          sensitiveSettings: result.sensitiveSettings,
        });
      } else {
        dispatch({ type: 'LOAD_ERROR', message: result.message });
      }
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

  // Toggle showContactPerson
  const toggleShowContactPerson = useCallback((value: boolean) => {
    dispatch({ type: 'TOGGLE_SHOW_CONTACT_PERSON', value });
  }, []);

  // Update invoice template type
  const updateInvoiceTemplateType = useCallback((value: InvoiceTemplateType) => {
    dispatch({ type: 'UPDATE_INVOICE_TEMPLATE_TYPE', value });
  }, []);

  // Update seal size
  const updateSealSize = useCallback((value: SealSize) => {
    dispatch({ type: 'UPDATE_SEAL_SIZE', value });
  }, []);

  // Update background design
  const updateBackgroundDesign = useCallback((value: BackgroundDesign) => {
    dispatch({ type: 'UPDATE_BACKGROUND_DESIGN', value });
  }, []);

  // Update background image URI
  const updateBackgroundImageUri = useCallback((uri: string | null) => {
    dispatch({ type: 'UPDATE_BACKGROUND_IMAGE_URI', uri });
  }, []);

  // Update default estimate template ID (M21)
  const updateDefaultEstimateTemplateId = useCallback((value: DocumentTemplateId) => {
    dispatch({ type: 'UPDATE_DEFAULT_ESTIMATE_TEMPLATE_ID', value });
  }, []);

  // Update default invoice template ID (M21)
  const updateDefaultInvoiceTemplateId = useCallback((value: DocumentTemplateId) => {
    dispatch({ type: 'UPDATE_DEFAULT_INVOICE_TEMPLATE_ID', value });
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

  // Save settings (delegates to domain service)
  const save = useCallback(async (): Promise<boolean> => {
    // Validate first
    const errors = validateSettingsForm(state.values);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors });
      return false;
    }

    dispatch({ type: 'START_SAVING' });

    const result = await saveSettingsToStorage(state.values);

    if (result.success) {
      dispatch({ type: 'SAVE_SUCCESS' });
      return true;
    }

    dispatch({ type: 'SAVE_ERROR', message: result.message });
    return false;
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
    toggleShowContactPerson,
    updateInvoiceTemplateType,
    updateSealSize,
    updateBackgroundDesign,
    updateBackgroundImageUri,
    updateDefaultEstimateTemplateId,
    updateDefaultInvoiceTemplateId,
    save,
    validate,
    getFormattedNextNumber,
    reload,
  };
}
