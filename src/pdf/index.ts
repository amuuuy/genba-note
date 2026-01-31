/**
 * PDF Module for GenBa Note
 *
 * Provides HTML template generation, PDF generation, and Pro feature gating.
 */

// Types
export type {
  PdfTemplateInput,
  PdfTemplateResult,
  ColorScheme,
  PdfGenerationErrorCode,
  PdfGenerationError,
  PdfGenerationResult,
  ProGateReason,
  ProGateResult,
} from './types';

export { ESTIMATE_COLORS, INVOICE_COLORS, getColorSchemeForType } from './types';

// Template Service
export {
  generateHtmlTemplate,
  getColorScheme,
  formatCurrency,
  formatQuantity,
  formatTaxRate,
  formatDate,
  generateDocumentTitle,
  generateFilenameTitle,
} from './pdfTemplateService';

// Generation Service
// NOTE: generatePdf and sharePdf are intentionally NOT exported to enforce Pro gating.
// All PDF generation must go through generateAndSharePdf which enforces Pro status.
export { generateAndSharePdf } from './pdfGenerationService';

// Pro Gate Service
// NOTE: setProStatusOverride and resetProStatusOverride are NOT exported here.
// They are only available for testing via direct import from proGateService.
export { checkProStatus } from './proGateService';
