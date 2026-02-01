/**
 * CSV Export Types
 *
 * Types for CSV export functionality per SPEC 2.6.6.
 */

import type { PeriodType } from '@/domain/revenue/types';

// === CSV Column Definition ===

/**
 * CSV row data for a single invoice
 * Column order matches SPEC 2.6.6:
 * documentNo, issueDate, dueDate, paidAt, clientName, subject,
 * subtotalYen, taxYen, totalYen, status
 */
export interface CsvInvoiceRow {
  documentNo: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD or empty
  paidAt: string; // YYYY-MM-DD or empty
  clientName: string;
  subject: string; // empty string if null
  subtotalYen: number;
  taxYen: number;
  totalYen: number;
  status: 'sent' | 'paid';
}

// === Export Options ===

export interface CsvExportOptions {
  /** Period for filtering invoices by issueDate */
  periodType: PeriodType;
  /** Reference date for period calculation (optional, defaults to today) */
  referenceDate?: string;
}

// === Error Codes ===

export type CsvExportErrorCode =
  | 'STORAGE_ERROR' // Failed to read invoices from storage
  | 'NO_DATA' // No invoices match the filter
  | 'FILE_WRITE_ERROR' // Failed to write CSV file
  | 'SHARE_CANCELLED' // User cancelled sharing
  | 'SHARE_FAILED' // Sharing failed
  | 'PRO_REQUIRED'; // Pro subscription required

// === Error Interface ===

export interface CsvExportError {
  code: CsvExportErrorCode;
  message: string;
  originalError?: Error;
}

// === Result Type ===

export interface CsvExportResult<T> {
  success: boolean;
  data?: T;
  error?: CsvExportError;
}

// === Result Helper Functions ===

export function successResult<T>(data: T): CsvExportResult<T> {
  return { success: true, data };
}

export function errorResult(error: CsvExportError): CsvExportResult<never> {
  return { success: false, error };
}

export function createCsvExportError(
  code: CsvExportErrorCode,
  message: string,
  originalError?: Error
): CsvExportError {
  return { code, message, originalError };
}

// === Constants ===

/** UTF-8 BOM character */
export const UTF8_BOM = '\uFEFF';

/** CRLF line ending */
export const CRLF = '\r\n';

/** CSV header columns per SPEC 2.6.6 */
export const CSV_HEADER = [
  'documentNo',
  'issueDate',
  'dueDate',
  'paidAt',
  'clientName',
  'subject',
  'subtotalYen',
  'taxYen',
  'totalYen',
  'status',
] as const;
