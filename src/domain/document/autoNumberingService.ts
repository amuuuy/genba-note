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
import { getSettings, updateSettings } from '@/storage/asyncStorageService';
import { PREFIX_PATTERN } from '@/utils/constants';

// === Concurrency Control ===

/**
 * Simple mutex for serializing numbering operations.
 * Prevents race conditions when multiple documents are created simultaneously.
 */
let numberingLock: Promise<void> = Promise.resolve();

/**
 * Execute a function with exclusive access to numbering.
 * Serializes concurrent calls to prevent duplicate numbers.
 */
async function withNumberingLock<T>(fn: () => Promise<T>): Promise<T> {
  // Chain onto existing lock
  const previousLock = numberingLock;

  // Create new lock that resolves when this operation completes
  let releaseLock: () => void;
  numberingLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  try {
    // Wait for previous operation to complete
    await previousLock;
    // Execute our operation
    return await fn();
  } finally {
    // Release lock for next operation
    releaseLock!();
  }
}

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
 * This operation is serialized using a mutex to prevent race conditions.
 * Concurrent calls will be queued and executed sequentially.
 * The number is consumed even if the document is never saved (by design).
 *
 * @param documentType - Type of document (estimate or invoice)
 * @returns Result containing the generated document number
 */
export async function generateDocumentNumber(
  documentType: DocumentType
): Promise<DomainResult<string, NumberingError>> {
  // Serialize access to prevent race conditions
  return withNumberingLock(async () => {
    // Read current settings
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

    const settings = settingsResult.data!;
    const { numbering } = settings;

    // Get prefix and current number based on document type
    const prefix =
      documentType === 'estimate' ? numbering.estimatePrefix : numbering.invoicePrefix;
    const currentNumber =
      documentType === 'estimate'
        ? numbering.nextEstimateNumber
        : numbering.nextInvoiceNumber;

    // Format the document number
    const documentNumber = formatDocumentNumber(prefix, currentNumber);

    // Prepare updated numbering
    const updatedNumbering = {
      ...numbering,
      ...(documentType === 'estimate'
        ? { nextEstimateNumber: currentNumber + 1 }
        : { nextInvoiceNumber: currentNumber + 1 }),
    };

    // Save incremented number
    const updateResult = await updateSettings({ numbering: updatedNumbering });

    if (!updateResult.success) {
      return errorResult(
        createNumberingError(
          'SETTINGS_WRITE_ERROR',
          'Failed to save updated numbering settings',
          updateResult.error?.originalError
        )
      );
    }

    return successResult(documentNumber);
  });
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
