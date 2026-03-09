/**
 * PDF Module for ポチッと事務
 *
 * Provides HTML template generation, PDF generation, and Pro feature gating.
 */

// Types
export type {
  PdfTemplateInput,
  PdfTemplateResult,
  ColorScheme,
  TemplateMode,
  PdfGenerationErrorCode,
  PdfGenerationError,
  PdfGenerationResult,
  ProGateReason,
  ProGateResult,
} from './types';

export { ESTIMATE_COLORS, INVOICE_COLORS, FORMAL_COLORS, getColorSchemeForType } from './types';

// Theme CSS Functions
export { getScreenThemeCss, getFormalThemeCss } from './themes';

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

// Pro Access Service - now in subscription layer
// NOTE: setProStatusOverride and resetProStatusOverride are NOT exported here.
// They are only available for testing via direct import from @/subscription/proAccessService.
export { checkProStatus } from '@/subscription/proAccessService';
