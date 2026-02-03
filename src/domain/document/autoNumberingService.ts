/**
 * Auto Numbering Service
 *
 * Generates document numbers in the format: {prefix}{number}
 * Example: EST-001, INV-001, QUOTE-042
 *
 * SPEC 2.1.5 Rules:
 * - 3-digit zero padding: 001, 002, ..., 999
 * - Beyond 999, digits expand: 1000, 1001, ...
 * - Numbers are never reused (deleted documents leave gaps)
 * - Estimates and invoices have independent sequences
 */

import type { DocumentType } from '@/types/document';
import type { NumberingError, DomainResult } from './types';
import { successResult, errorResult, createNumberingError } from './types';
import { getSettings, updateSettingsAtomic } from '@/storage/asyncStorageService';
import { PREFIX_PATTERN } from '@/utils/constants';

// === Public API ===

/**
 * Numbering settings
 */
export interface NumberingSettings {
  estimatePrefix: string;
  invoicePrefix: string;
  nextEstimateNumber: number;
  nextInvoiceNumber: number;
}

/**
 * Format a document number with prefix and zero-padded number
 *
 * @param prefix - Prefix string (e.g., 'EST-', 'INV-')
 * @param number - Sequential number
 * @returns Formatted document number (e.g., 'EST-001')
 */
export function formatDocumentNumber(prefix: string, number: number): string {
  // Pad to at least 3 digits
  const paddedNumber = number.toString().padStart(3, '0');
  return `${prefix}${paddedNumber}`;
}

/**
 * Validate document number prefix
 * Must match PREFIX_PATTERN: alphanumeric, hyphen, underscore, 1-10 chars
 *
 * @param prefix - Prefix to validate
 * @returns true if valid
 */
export function validatePrefix(prefix: string): boolean {
  return PREFIX_PATTERN.test(prefix);
}

/**
 * Generate next document number and update settings
 *
 * This operation is serialized using updateSettingsAtomic to prevent race conditions.
 * Concurrent calls will be queued and executed sequentially.
 * The number is consumed even if the document is never saved (by design).
 *
 * @param documentType - Type of document (estimate or invoice)
 * @returns Result containing the generated document number
 */
export async function generateDocumentNumber(
  documentType: DocumentType
): Promise<DomainResult<string, NumberingError>> {
  // Use a variable to capture the generated number from inside the transform
  let generatedNumber: string = '';

  // Atomically read-compute-write to prevent race conditions
  // The transform function reads current number, formats it, and increments
  // This uses settingsQueue internally and checks read-only mode
  const updateResult = await updateSettingsAtomic((current) => {
    const { numbering } = current;

    // Get prefix and current number based on document type
    const prefix =
      documentType === 'estimate' ? numbering.estimatePrefix : numbering.invoicePrefix;
    const currentNumber =
      documentType === 'estimate'
        ? numbering.nextEstimateNumber
        : numbering.nextInvoiceNumber;

    // Format the document number (captured for return)
    generatedNumber = formatDocumentNumber(prefix, currentNumber);

    // Return updated settings with incremented number
    return {
      ...current,
      numbering: {
        ...numbering,
        ...(documentType === 'estimate'
          ? { nextEstimateNumber: currentNumber + 1 }
          : { nextInvoiceNumber: currentNumber + 1 }),
      },
    };
  });

  if (!updateResult.success) {
    // Check if it's a read-only error
    if (updateResult.error?.code === 'READONLY_MODE') {
      return errorResult(
        createNumberingError(
          'SETTINGS_WRITE_ERROR',
          'Cannot generate document number in read-only mode',
          undefined
        )
      );
    }
    return errorResult(
      createNumberingError(
        'SETTINGS_WRITE_ERROR',
        'Failed to save updated numbering settings',
        updateResult.error?.originalError
      )
    );
  }

  return successResult(generatedNumber);
}

/**
 * Get current numbering settings (read-only)
 *
 * @returns Result containing current numbering settings
 */
export async function getNumberingSettings(): Promise<
  DomainResult<NumberingSettings, NumberingError>
> {
  const settingsResult = await getSettings();

  if (!settingsResult.success) {
    return errorResult(
      createNumberingError(
        'SETTINGS_READ_ERROR',
        'Failed to read numbering settings',
        settingsResult.error?.originalError
      )
    );
  }

  const { numbering } = settingsResult.data!;

  return successResult({
    estimatePrefix: numbering.estimatePrefix,
    invoicePrefix: numbering.invoicePrefix,
    nextEstimateNumber: numbering.nextEstimateNumber,
    nextInvoiceNumber: numbering.nextInvoiceNumber,
  });
}
