import type { InvoiceTemplateType, SealSize, BackgroundDesign, DocumentTemplateId } from '@/pdf/types';
import { DEFAULT_INVOICE_TEMPLATE_TYPE } from '@/pdf/types';

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
