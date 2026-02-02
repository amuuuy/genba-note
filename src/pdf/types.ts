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

  /** Output mode - 'screen' for colorful preview, 'pdf' for formal print (default: 'screen') */
  mode?: TemplateMode;
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

// === Template Mode ===

/**
 * Template output mode - controls visual styling
 * - 'screen': Colorful theme for preview (blue/orange based on document type)
 * - 'pdf': Formal monochrome theme for print/PDF output
 */
export type TemplateMode = 'screen' | 'pdf';

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
 * Formal monochrome color scheme for PDF output
 * Designed for black & white printing and professional business documents
 */
export const FORMAL_COLORS: ColorScheme = {
  primary: '#333333',      // Dark gray for text/headers
  secondary: '#666666',    // Medium gray for borders
  background: '#FFFFFF',   // White background
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
 * Reason codes for Pro status check
 *
 * Aligned with ProValidationResult.reason from subscription types.
 */
export type ProGateReason =
  // Success reasons
  | 'online_verified'
  | 'offline_grace_period'
  | 'development_mode'
  // Failure reasons (from offlineValidationService)
  | 'cache_missing'
  | 'cache_invalid'
  | 'entitlement_inactive'
  | 'entitlement_expired'
  | 'uptime_rollback'
  | 'grace_period_exceeded'
  | 'clock_manipulation'
  // Development/testing placeholders (kept for backwards compatibility)
  | 'placeholder_always_false'
  | 'placeholder_always_true';

/**
 * Result of Pro status check
 */
export interface ProGateResult {
  /** Whether Pro features are allowed */
  isPro: boolean;

  /** Reason for the result */
  reason: ProGateReason;
}
