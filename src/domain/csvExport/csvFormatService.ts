/**
 * CSV Format Service
 *
 * Pure functions for RFC 4180 compliant CSV formatting.
 * All functions are pure and easily testable.
 */

import { UTF8_BOM, CRLF, CSV_HEADER, type CsvInvoiceRow } from './types';

/**
 * Characters that trigger formula interpretation in spreadsheet software.
 * String fields starting with these are prefixed with ' to neutralize.
 *
 * @see OWASP CSV Injection prevention
 */
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r', '\n'];

/**
 * Escape a single field value for CSV output.
 *
 * Applies two layers of protection:
 * 1. CSV formula injection (B5): string values starting with =, +, -, @, \t, or \r
 *    are prefixed with a single quote (') to prevent spreadsheet formula execution.
 *    Numeric values are exempt (negative numbers are safe).
 * 2. RFC 4180 escaping: fields containing comma, double-quote, or newline
 *    are enclosed in double-quotes, with internal double-quotes doubled.
 *
 * @param value - Field value (string or number)
 * @returns Escaped field string safe for CSV output
 *
 * @example
 * escapeField('hello') => 'hello'
 * escapeField('hello, world') => '"hello, world"'
 * escapeField('=SUM(A1)') => "'=SUM(A1)"
 * escapeField(-500) => '-500'       // number: no prefix
 * escapeField('-500') => "'-500"    // string: prefixed
 */
export function escapeField(value: string | number): string {
  let str = String(value);

  // B5: CSV formula injection protection
  // Only sanitize string values (numeric negatives like -500 are safe)
  if (typeof value === 'string' && str.length > 0 && FORMULA_PREFIXES.includes(str[0])) {
    str = "'" + str;
  }

  // RFC 4180: fields containing comma, double-quote, or newline must be quoted
  const needsEscape =
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r');

  if (!needsEscape) {
    return str;
  }

  // Double all quotes and wrap in quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Format a single row as CSV line
 *
 * @param row - CsvInvoiceRow data
 * @returns CSV line (without line ending)
 */
export function formatCsvRow(row: CsvInvoiceRow): string {
  const fields = [
    row.documentNo,
    row.issueDate,
    row.dueDate,
    row.paidAt,
    row.clientName,
    row.subject,
    row.subtotalYen,
    row.taxYen,
    row.totalYen,
    row.status,
  ];

  return fields.map(escapeField).join(',');
}

/**
 * Format header row as CSV line
 *
 * @returns CSV header line (without line ending)
 */
export function formatHeaderRow(): string {
  return CSV_HEADER.map(escapeField).join(',');
}

/**
 * Format complete CSV content with BOM and CRLF line endings
 *
 * @param rows - Array of CsvInvoiceRow
 * @returns Complete CSV string with UTF-8 BOM
 */
export function formatCsvContent(rows: CsvInvoiceRow[]): string {
  const lines: string[] = [];

  // Header row
  lines.push(formatHeaderRow());

  // Data rows
  for (const row of rows) {
    lines.push(formatCsvRow(row));
  }

  // Join with CRLF and prepend BOM
  return UTF8_BOM + lines.join(CRLF) + CRLF;
}

/**
 * Generate CSV filename with current date
 * Format: invoices_YYYYMMDD.csv
 *
 * @param referenceDate - Optional date string (YYYY-MM-DD) for filename
 *                        Defaults to today
 * @returns Filename string
 */
export function generateCsvFilename(referenceDate?: string): string {
  let dateStr: string;

  if (referenceDate) {
    // Remove hyphens from YYYY-MM-DD format
    dateStr = referenceDate.replace(/-/g, '');
  } else {
    // Use today's date
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    dateStr = `${year}${month}${day}`;
  }

  return `invoices_${dateStr}.csv`;
}
