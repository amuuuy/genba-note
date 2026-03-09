/**
 * PDF Types for ポチッと事務
 *
 * Types for PDF template generation, PDF generation service, and Pro feature gating.
 * Follows SPEC 2.7 for PDF output specifications.
 *
 * Settings-related types are defined in @/types/settings and re-exported here
 * for backward compatibility.
 */

import type { DocumentWithTotals, SensitiveIssuerSnapshot, DocumentType } from '@/types/document';
import type { SealSize, BackgroundDesign, DocumentTemplateId, PreviewOrientation, InvoiceTemplateType } from '@/types/settings';

// Re-export settings-related types for backward compatibility
export {
  InvoiceTemplateType,
  DEFAULT_INVOICE_TEMPLATE_TYPE,
  SEAL_SIZES,
  DEFAULT_SEAL_SIZE,
  BACKGROUND_DESIGNS,
  DOCUMENT_TEMPLATE_IDS,
} from '@/types/settings';

export type {
  SealSize,
  BackgroundDesign,
  DocumentTemplateId,
  PreviewOrientation,
} from '@/types/settings';

/**
 * Options for PDF generation (extensible for future milestones).
 * M18: orientation
 * M19: customFilename
 */
export interface PdfGenerationOptions {
  /** Preview orientation - controls page size in PDF output */
  orientation?: PreviewOrientation;
  /** Custom filename for the shared PDF (M19). Sanitized before use. */
  customFilename?: string;
}

/**
 * Seal size in pixels per template.
 * SIMPLE uses smaller sizes; all others share the same scale.
 *
 * | Template         | SMALL | MEDIUM | LARGE |
 * |------------------|-------|--------|-------|
 * | FORMAL_STANDARD  |  45px |  70px  | 100px |
 * | ACCOUNTING       |  45px |  70px  | 100px |
 * | SIMPLE           |  30px |  50px  |  70px |
 * | MODERN           |  45px |  70px  | 100px |
 * | CLASSIC          |  45px |  70px  | 100px |
 * | CONSTRUCTION     |  45px |  70px  | 100px |
 */
const SEAL_SIZE_MAP: Record<SealSize, Record<DocumentTemplateId, number>> = {
  SMALL:  { FORMAL_STANDARD: 45, ACCOUNTING: 45, SIMPLE: 30, MODERN: 45, CLASSIC: 45, CONSTRUCTION: 45 },
  MEDIUM: { FORMAL_STANDARD: 70, ACCOUNTING: 70, SIMPLE: 50, MODERN: 70, CLASSIC: 70, CONSTRUCTION: 70 },
  LARGE:  { FORMAL_STANDARD: 100, ACCOUNTING: 100, SIMPLE: 70, MODERN: 100, CLASSIC: 100, CONSTRUCTION: 100 },
};

/** Resolve seal size to pixel value based on seal size and template */
export function getSealSizePx(sealSize: SealSize, templateId: DocumentTemplateId): number {
  return SEAL_SIZE_MAP[sealSize][templateId];
}

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

  /** Invoice template type (only used for invoice documents in pdf mode) */
  invoiceTemplateType?: InvoiceTemplateType;

  /** Document template ID for PDF output (M16). Ignored in screen mode. */
  templateId?: DocumentTemplateId;

  /** Seal size for PDF output (M17). Defaults to MEDIUM if not provided. */
  sealSize?: SealSize;

  /** Background design for PDF output (M20). Defaults to NONE if not provided. */
  backgroundDesign?: BackgroundDesign;

  /** Pre-loaded background image data URL for IMAGE design */
  backgroundImageDataUrl?: string | null;
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
  | 'TEMPLATE_ERROR'
  | 'VALIDATION_FAILED';

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

// === Pro Gate Types (re-exported from subscription layer) ===

export type { ProGateReason, ProGateResult } from '@/subscription/types';
