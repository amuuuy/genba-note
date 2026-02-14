/**
 * Revenue Service
 *
 * Functions for calculating revenue summaries from invoices.
 * Base date for filtering is issueDate (NOT paidAt) per SPEC 2.6.3.
 *
 * Aggregation rules:
 * - Revenue total: invoices where status in [sent, paid]
 * - Paid amount: invoices where status = paid
 * - Unpaid amount: invoices where status = sent
 * - Draft invoices are NOT counted
 *
 * INVARIANT: total = paid + unpaid (enforced)
 */

import type { Document } from '@/types/document';
import type {
  PeriodType,
  RevenueSummary,
  RevenueResult,
  RevenueServiceError,
} from './types';
import { successResult, errorResult, createRevenueServiceError } from './types';
import { isDateInPeriod } from './periodFilterService';
import { enrichDocumentWithTotals } from '@/domain/lineItem/calculationService';
import { filterDocuments } from '@/storage/asyncStorageService';

/**
 * Filter invoices by period (pure function)
 *
 * @param invoices - Array of documents to filter
 * @param periodType - Period type for filtering
 * @param referenceDate - Optional reference date for period calculation
 * @returns Filtered array of invoices within the period
 *
 * Filtering logic:
 * - Only invoices (type === 'invoice')
 * - Only sent or paid status (NOT draft)
 * - issueDate within the period range
 */
export function filterInvoicesByPeriod(
  invoices: Document[],
  periodType: PeriodType,
  referenceDate?: string
): Document[] {
  return invoices.filter(
    (doc) =>
      doc.type === 'invoice' &&
      (doc.status === 'sent' || doc.status === 'paid') &&
      isDateInPeriod(doc.issueDate, periodType, referenceDate)
  );
}

/**
 * Verify revenue summary invariant (pure function)
 * Used internally and for testing.
 *
 * @param summary - Revenue summary to verify
 * @returns true if total === paid + unpaid
 */
export function verifyInvariant(summary: RevenueSummary): boolean {
  return summary.total === summary.paid + summary.unpaid;
}

/**
 * Calculate revenue summary from invoices (pure function)
 *
 * @param invoices - Array of invoices (will be filtered to only include
 *                   type='invoice' with status in ['sent', 'paid'] per SPEC 2.6.3)
 * @returns RevenueSummary with total, paid, unpaid, and count
 *
 * Calculation rules (SPEC 2.6.3):
 * - Only invoices with type='invoice' and status in ['sent', 'paid'] are counted
 * - total: Sum of totalYen for all valid invoices
 * - paid: Sum of totalYen for paid invoices
 * - unpaid: Sum of totalYen for sent invoices
 * - invoiceCount: Count of valid invoices
 *
 * INVARIANT: total === paid + unpaid (always true)
 */
export function calculateRevenueSummary(invoices: Document[]): RevenueSummary {
  // Filter to only include invoices with status 'sent' or 'paid' per SPEC 2.6.3
  // This guard ensures correctness even if caller passes unfiltered data
  const validInvoices = invoices.filter(
    (doc) =>
      doc.type === 'invoice' &&
      (doc.status === 'sent' || doc.status === 'paid')
  );

  if (validInvoices.length === 0) {
    return {
      total: 0,
      paid: 0,
      unpaid: 0,
      invoiceCount: 0,
    };
  }

  let paid = 0;
  let unpaid = 0;

  for (const invoice of validInvoices) {
    const enriched = enrichDocumentWithTotals(invoice);
    const totalYen = enriched.totalYen;

    if (invoice.status === 'paid') {
      paid += totalYen;
    } else {
      // status === 'sent'
      unpaid += totalYen;
    }
  }

  const summary: RevenueSummary = {
    total: paid + unpaid,
    paid,
    unpaid,
    invoiceCount: validInvoices.length,
  };

  // Sanity check - invariant should always hold
  if (!verifyInvariant(summary)) {
    // This should never happen, but if it does, log for debugging
    if (__DEV__) console.error('Revenue invariant violation:', summary);
  }

  return summary;
}

/**
 * Get revenue summary for a period (async, accesses storage)
 *
 * @param periodType - Period type for aggregation
 * @param referenceDate - Optional reference date for period calculation
 * @returns Promise<RevenueResult<RevenueSummary>>
 *
 * This is the main entry point for the revenue screen.
 * Combines storage access, filtering, and calculation.
 *
 * @example
 * const result = await getRevenueSummary('this-month');
 * if (result.success) {
 *   console.log(result.data.total);  // Total revenue
 *   console.log(result.data.paid);   // Paid amount
 *   console.log(result.data.unpaid); // Unpaid amount
 *   console.log(result.data.invoiceCount); // Invoice count
 * }
 */
export async function getRevenueSummary(
  periodType: PeriodType,
  referenceDate?: string
): Promise<RevenueResult<RevenueSummary>> {
  // Fetch invoices from storage
  const storageResult = await filterDocuments(
    { type: 'invoice', status: ['sent', 'paid'] },
    undefined
  );

  if (!storageResult.success) {
    return errorResult(
      createRevenueServiceError(
        'STORAGE_ERROR',
        'Failed to fetch invoices from storage'
      )
    );
  }

  const documents = storageResult.data ?? [];

  // Apply period filter
  const filteredInvoices = filterInvoicesByPeriod(
    documents,
    periodType,
    referenceDate
  );

  // Calculate summary
  const summary = calculateRevenueSummary(filteredInvoices);

  return successResult(summary);
}
