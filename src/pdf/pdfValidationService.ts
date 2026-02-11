/**
 * PDF Validation Service
 *
 * Validates documents before PDF generation.
 * Required fields for PDF:
 * - documentNo (見積書番号/請求書番号) - always required
 * - issueDate (発行日) - always required
 * - dueDate (支払期限) - invoice only
 * - companyName (会社名) - always required
 * - clientName (取引先名) - always required
 * - lineItems (明細) - at least one required
 */

import type { Document, DocumentType } from '@/types/document';
import { getDocumentLabels } from './templates/documentLabels';

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
  issueDate: '発行日',
  dueDate: '支払期限',
  companyName: '会社名',
  clientName: '取引先名',
  lineItems: '明細',
};

/**
 * Validate document for PDF generation
 *
 * Required fields:
 * - documentNo: Always required
 * - issueDate: Always required
 * - dueDate: Required for invoices only
 * - companyName: Always required (from issuerSnapshot)
 * - clientName: Always required
 * - lineItems: At least one required
 *
 * @param document - Document to validate
 * @returns Validation result with missing field names
 */
export function validateDocumentForPdf(document: Document): PdfValidationResult {
  const missingFields: string[] = [];

  // Document number is always required
  if (!document.documentNo || document.documentNo.trim() === '') {
    missingFields.push(getDocumentLabels(document.type).numberLabel);
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

  // Company name is always required
  if (
    !document.issuerSnapshot?.companyName ||
    document.issuerSnapshot.companyName.trim() === ''
  ) {
    missingFields.push(FIELD_NAMES.companyName);
  }

  // Client name is always required
  if (!document.clientName || document.clientName.trim() === '') {
    missingFields.push(FIELD_NAMES.clientName);
  }

  // At least one line item is required
  if (!document.lineItems || document.lineItems.length === 0) {
    missingFields.push(FIELD_NAMES.lineItems);
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
