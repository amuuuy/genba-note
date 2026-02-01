/**
 * CSV Export Service
 *
 * Pure functions for filtering invoices and converting to CSV format.
 * Follows SPEC 2.6.6:
 * - Target: issueDate in period AND status in [sent, paid]
 * - Only invoices (type === 'invoice')
 */

import type { Document } from '@/types/document';
import type { PeriodType } from '@/domain/revenue/types';
import type { CsvInvoiceRow } from './types';
import { enrichDocumentWithTotals } from '@/domain/lineItem/calculationService';
import { isDateInPeriod } from '@/domain/revenue/periodFilterService';
import { formatCsvContent } from './csvFormatService';

/**
 * Filter invoices for CSV export (pure function)
 *
 * Criteria (SPEC 2.6.6):
 * - type === 'invoice'
 * - status in ['sent', 'paid']
 * - issueDate within the specified period
 *
 * @param documents - Array of documents to filter
 * @param periodType - Period type for filtering
 * @param referenceDate - Optional reference date for period calculation
 * @returns Filtered array of invoices
 */
export function filterInvoicesForExport(
  documents: Document[],
  periodType: PeriodType,
  referenceDate?: string
): Document[] {
  return documents.filter(
    (doc) =>
      doc.type === 'invoice' &&
      (doc.status === 'sent' || doc.status === 'paid') &&
      isDateInPeriod(doc.issueDate, periodType, referenceDate)
  );
}

/**
 * Convert a Document to CsvInvoiceRow (pure function)
 *
 * @param document - Document to convert (must be an invoice)
 * @returns CsvInvoiceRow with calculated totals
 */
export function documentToCsvRow(document: Document): CsvInvoiceRow {
  const enriched = enrichDocumentWithTotals(document);

  return {
    documentNo: document.documentNo,
    issueDate: document.issueDate,
    dueDate: document.dueDate ?? '',
    paidAt: document.paidAt ?? '',
    clientName: document.clientName,
    subject: document.subject ?? '',
    subtotalYen: enriched.subtotalYen,
    taxYen: enriched.taxYen,
    totalYen: enriched.totalYen,
    status: document.status as 'sent' | 'paid',
  };
}

/**
 * Convert array of Documents to CsvInvoiceRows (pure function)
 *
 * @param documents - Array of documents to convert
 * @returns Array of CsvInvoiceRow
 */
export function documentsToCsvRows(documents: Document[]): CsvInvoiceRow[] {
  return documents.map(documentToCsvRow);
}

/**
 * Generate CSV content from documents (pure function)
 *
 * Combines filtering, conversion, and formatting.
 *
 * @param documents - Array of all documents
 * @param periodType - Period type for filtering
 * @param referenceDate - Optional reference date
 * @returns Object with csvContent string and rowCount
 */
export function generateCsvFromDocuments(
  documents: Document[],
  periodType: PeriodType,
  referenceDate?: string
): { csvContent: string; rowCount: number } {
  // Filter invoices
  const filtered = filterInvoicesForExport(documents, periodType, referenceDate);

  // Convert to CSV rows
  const rows = documentsToCsvRows(filtered);

  // Format as CSV
  const csvContent = formatCsvContent(rows);

  return {
    csvContent,
    rowCount: rows.length,
  };
}
