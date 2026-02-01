/**
 * CSV Export Module
 *
 * Public exports for CSV export functionality.
 * Per SPEC 2.6.6, CSV export is a Pro-only feature.
 */

// Types
export type {
  CsvInvoiceRow,
  CsvExportOptions,
  CsvExportErrorCode,
  CsvExportError,
  CsvExportResult,
} from './types';

// Constants
export { UTF8_BOM, CRLF, CSV_HEADER } from './types';

// Pure functions (for testing and advanced usage)
export {
  escapeField,
  formatCsvRow,
  formatHeaderRow,
  formatCsvContent,
  generateCsvFilename,
} from './csvFormatService';

export {
  filterInvoicesForExport,
  documentToCsvRow,
  documentsToCsvRows,
  generateCsvFromDocuments,
} from './csvExportService';

// Main entry point (async, with Pro gating)
export { exportInvoicesToCsv } from './csvFileService';
