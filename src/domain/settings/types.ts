/**
 * Settings Domain Types
 */

/**
 * Validation error for a specific field
 */
export interface ValidationError {
  /** Error code for programmatic handling */
  code: 'REQUIRED' | 'INVALID_FORMAT';
  /** Field name that has the error */
  field: string;
  /** Human-readable error message */
  message: string;
}

/**
 * Form values for settings edit screen
 */
export interface SettingsFormValues {
  // AsyncStorage fields (non-sensitive)
  companyName: string;
  representativeName: string;
  address: string;
  phone: string;
  /** Contact person name */
  contactPerson: string;
  /** Whether to show contact person on documents */
  showContactPerson: boolean;
  estimatePrefix: string;
  invoicePrefix: string;
  /** Seal image URI (local file path) */
  sealImageUri: string | null;

  // SecureStore fields (sensitive)
  invoiceNumber: string;
  bankName: string;
  branchName: string;
  accountType: '普通' | '当座' | '';
  accountNumber: string;
  accountHolderName: string;
}

/**
 * Form errors map (field name -> error message)
 */
export type SettingsFormErrors = Record<string, string>;
