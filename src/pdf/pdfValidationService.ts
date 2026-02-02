/**
 * PDF Validation Service
 *
 * Validates documents before PDF generation.
 * Required fields for invoice PDF:
 * - documentNo (請求書番号)
 * - issueDate (発行日)
 * - dueDate (支払期限) - invoice only
 */

import type { Document, DocumentType } from '@/types/document';

/**
 * Validation result for PDF generation
 */
export interface PdfValidationResult {
  /** Whether the document is valid for PDF generation */
  isValid: boolean;
  /** List of missing required field names (Japanese) */
  missingFields: string[];
}

/**
 * Field display names for error messages
 */
const FIELD_NAMES: Record<string, string> = {
  documentNo: '請求書番号',
  issueDate: '発行日',
  dueDate: '支払期限',
};

/**
 * Validate document for PDF generation
 *
 * Required fields:
 * - documentNo: Always required
 * - issueDate: Always required
 * - dueDate: Required for invoices only
 *
 * @param document - Document to validate
 * @returns Validation result with missing field names
 */
export function validateDocumentForPdf(document: Document): PdfValidationResult {
  const missingFields: string[] = [];

  // Document number is always required
  if (!document.documentNo || document.documentNo.trim() === '') {
    missingFields.push(FIELD_NAMES.documentNo);
  }

  // Issue date is always required
  if (!document.issueDate || document.issueDate.trim() === '') {
    missingFields.push(FIELD_NAMES.issueDate);
  }

  // Due date is required for invoices
  if (document.type === 'invoice') {
    if (!document.dueDate || document.dueDate.trim() === '') {
      missingFields.push(FIELD_NAMES.dueDate);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Format validation error message
 *
 * @param result - Validation result
 * @returns Error message string
 */
export function formatValidationError(result: PdfValidationResult): string {
  if (result.isValid) {
    return '';
  }

  return `以下の項目を入力してください:\n${result.missingFields.join('\n')}`;
}
