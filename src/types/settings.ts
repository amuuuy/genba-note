// === Invoice Template Type ===

/**
 * Invoice template type for PDF generation
 * - ACCOUNTING: Traditional Japanese accounting-style layout (current default)
 * - SIMPLE: Clean, minimal layout similar to estimate format
 */
export const InvoiceTemplateType = {
  ACCOUNTING: 'ACCOUNTING',
  SIMPLE: 'SIMPLE',
} as const;

export type InvoiceTemplateType = (typeof InvoiceTemplateType)[keyof typeof InvoiceTemplateType];

/** Default invoice template type */
export const DEFAULT_INVOICE_TEMPLATE_TYPE: InvoiceTemplateType = 'ACCOUNTING';

// === PDF Customization Types ===

/** Seal (stamp) size values — single source of truth for type + runtime validation */
export const SEAL_SIZES = ['SMALL', 'MEDIUM', 'LARGE'] as const;
export type SealSize = (typeof SEAL_SIZES)[number];

/** Default seal size */
export const DEFAULT_SEAL_SIZE: SealSize = 'MEDIUM';

/** Background design values — single source of truth for type + runtime validation */
export const BACKGROUND_DESIGNS = ['NONE', 'STRIPE', 'WAVE', 'GRID', 'DOTS', 'IMAGE'] as const;
export type BackgroundDesign = (typeof BACKGROUND_DESIGNS)[number];

/** Template ID values — single source of truth for type + runtime validation */
export const DOCUMENT_TEMPLATE_IDS = ['FORMAL_STANDARD', 'ACCOUNTING', 'SIMPLE', 'MODERN', 'CLASSIC', 'CONSTRUCTION'] as const;
export type DocumentTemplateId = (typeof DOCUMENT_TEMPLATE_IDS)[number];

/** Preview orientation for document preview */
export type PreviewOrientation = 'PORTRAIT' | 'LANDSCAPE';

/**
 * App settings stored in AsyncStorage
 */
export interface AppSettings {
  /** Issuer (company) information - non-sensitive fields */
  issuer: {
    companyName: string | null;
    representativeName: string | null;
    address: string | null;
    phone: string | null;
    /** Fax number (optional) */
    fax: string | null;
    /** Seal image URI (local file path for PDF) */
    sealImageUri: string | null;
    /** Contact person name (optional) */
    contactPerson: string | null;
    /** Whether to show contact person on documents */
    showContactPerson: boolean;
    /** Email address (optional) */
    email: string | null;
  };

  /** Document numbering settings */
  numbering: {
    /** Estimate prefix (default: 'EST-') */
    estimatePrefix: string;
    /** Invoice prefix (default: 'INV-') */
    invoicePrefix: string;
    /** Next estimate number (starts at 1) */
    nextEstimateNumber: number;
    /** Next invoice number (starts at 1) */
    nextInvoiceNumber: number;
  };

  /** @deprecated Use defaultInvoiceTemplateId instead. Kept for backward compatibility with v6 data. */
  invoiceTemplateType: InvoiceTemplateType;

  /** Seal (stamp) size for PDF documents */
  sealSize: SealSize;

  /** Background design pattern for PDF documents */
  backgroundDesign: BackgroundDesign;

  /** Background image URI (local file path) for IMAGE background design */
  backgroundImageUri: string | null;

  /** Default template for estimate (見積書) PDF output */
  defaultEstimateTemplateId: DocumentTemplateId;

  /** Default template for invoice (請求書) PDF output */
  defaultInvoiceTemplateId: DocumentTemplateId;

  /** Schema version for data migration */
  schemaVersion: number;
}

/**
 * Sensitive issuer settings stored in expo-secure-store
 * Key: 'sensitive_issuer_info'
 */
export interface SensitiveIssuerSettings {
  /** Invoice registration number (T + 13 digits) */
  invoiceNumber: string | null;

  /** Bank account information */
  bankAccount: {
    bankName: string | null;
    branchName: string | null;
    accountType: '普通' | '当座' | null;
    accountNumber: string | null;
    accountHolderName: string | null;
  };
}

/**
 * Default app settings for first launch
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  issuer: {
    companyName: null,
    representativeName: null,
    address: null,
    phone: null,
    fax: null,
    sealImageUri: null,
    contactPerson: null,
    showContactPerson: true,
    email: null,
  },
  numbering: {
    estimatePrefix: 'EST-',
    invoicePrefix: 'INV-',
    nextEstimateNumber: 1,
    nextInvoiceNumber: 1,
  },
  invoiceTemplateType: DEFAULT_INVOICE_TEMPLATE_TYPE,
  sealSize: 'MEDIUM',
  backgroundDesign: 'NONE',
  backgroundImageUri: null,
  defaultEstimateTemplateId: 'FORMAL_STANDARD',
  defaultInvoiceTemplateId: 'ACCOUNTING',
  schemaVersion: 1,
};

/**
 * Default sensitive settings
 */
export const DEFAULT_SENSITIVE_SETTINGS: SensitiveIssuerSettings = {
  invoiceNumber: null,
  bankAccount: {
    bankName: null,
    branchName: null,
    accountType: null,
    accountNumber: null,
    accountHolderName: null,
  },
};

// Note: PREFIX_PATTERN is defined in src/utils/constants.ts to avoid duplication
