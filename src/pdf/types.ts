/**
 * PDF Types for GenBa Note
 *
 * Types for PDF template generation, PDF generation service, and Pro feature gating.
 * Follows SPEC 2.7 for PDF output specifications.
 */

import type { DocumentWithTotals, SensitiveIssuerSnapshot, DocumentType } from '@/types/document';

// === Template Input ===

/**
 * Input for PDF template generation
 */
export interface PdfTemplateInput {
  /** Document with calculated totals */
  document: DocumentWithTotals;

  /** Sensitive issuer snapshot (bank account, invoice number) */
  sensitiveSnapshot: SensitiveIssuerSnapshot | null;
}

/**
 * Result of PDF template generation
 */
export interface PdfTemplateResult {
  /** Generated HTML string */
  html: string;

  /** Title for PDF filename (e.g., "EST-001_見積書") */
  title: string;
}

// === Color Scheme ===

/**
 * Color scheme for PDF template
 */
export interface ColorScheme {
  /** Primary color for headers and titles */
  primary: string;

  /** Secondary color for borders and accents */
  secondary: string;

  /** Background color for header sections */
  background: string;
}

/**
 * Blue color scheme for estimates (見積書)
 */
export const ESTIMATE_COLORS: ColorScheme = {
  primary: '#1E88E5',
  secondary: '#90CAF9',
  background: '#E3F2FD',
};

/**
 * Orange color scheme for invoices (請求書)
 */
export const INVOICE_COLORS: ColorScheme = {
  primary: '#FF6D00',
  secondary: '#FFAB91',
  background: '#FBE9E7',
};

/**
 * Get color scheme for document type
 */
export function getColorSchemeForType(type: DocumentType): ColorScheme {
  return type === 'estimate' ? ESTIMATE_COLORS : INVOICE_COLORS;
}

// === PDF Generation ===

/**
 * Error codes for PDF generation
 */
export type PdfGenerationErrorCode =
  | 'GENERATION_FAILED'
  | 'SHARE_CANCELLED'
  | 'SHARE_FAILED'
  | 'PRO_REQUIRED'
  | 'DOCUMENT_NOT_FOUND'
  | 'TEMPLATE_ERROR';

/**
 * PDF generation error
 */
export interface PdfGenerationError {
  code: PdfGenerationErrorCode;
  message: string;
  originalError?: Error;
}

/**
 * Result of PDF generation operation
 */
export interface PdfGenerationResult {
  success: boolean;
  fileUri?: string;
  error?: PdfGenerationError;
}

// === Pro Gate ===

/**
 * Reason codes for Pro status check (placeholder for M12)
 */
export type ProGateReason =
  | 'placeholder_always_false'
  | 'placeholder_always_true'
  | 'online_verified'
  | 'offline_grace_period'
  | 'not_subscribed';

/**
 * Result of Pro status check
 */
export interface ProGateResult {
  /** Whether Pro features are allowed */
  isPro: boolean;

  /** Reason for the result */
  reason: ProGateReason;
}
