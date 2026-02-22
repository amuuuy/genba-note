/**
 * Conversion Service
 *
 * Handles estimate-to-invoice conversion per SPEC 2.1.6
 * Converts an estimate into a new invoice document with:
 * - New document ID (UUID)
 * - New invoice number (auto-generated)
 * - Type changed to 'invoice'
 * - Issue date set to conversion date
 * - Status set to 'draft'
 * - validUntil removed, dueDate added (null)
 * - Client info and line items copied
 * - Issuer snapshot re-fetched from current settings (not copied from estimate)
 */

import type { Document, LineItem, IssuerSnapshot } from '@/types/document';
import type { DocumentServiceError, DomainResult } from './types';
import { successResult, errorResult, createDocumentServiceError } from './types';
import { generateDocumentNumber } from './autoNumberingService';
import {
  getDocumentById,
  saveDocument,
  getSettings,
} from '@/storage/asyncStorageService';
import {
  getSensitiveIssuerInfo,
  saveIssuerSnapshot,
} from '@/storage/secureStorageService';
import { generateUUID } from '@/utils/uuid';
import { getTodayString } from '@/utils/dateUtils';
import { enforceDocumentCreationLimit } from './documentService';

// === Result Types ===

/**
 * Result of estimate-to-invoice conversion
 */
export interface ConversionResult {
  /** The newly created invoice document */
  invoice: Document;
  /** The original estimate (unchanged) */
  originalEstimate: Document;
}

/**
 * Options for estimate-to-invoice conversion.
 * isPro defaults to false (fail-closed: treats user as free-tier).
 */
export interface ConvertEstimateOptions {
  /** Today's date override for testing */
  today?: string;
  /** Whether the user has Pro access. Defaults to false (fail-closed). */
  isPro?: boolean;
}

// === Helper Functions ===

/**
 * Generate new UUIDs for all line items
 */
function regenerateLineItemIds(lineItems: LineItem[]): LineItem[] {
  return lineItems.map((item) => ({
    ...item,
    id: generateUUID(),
  }));
}

/**
 * Get issuer snapshot from current settings
 * Returns default empty snapshot if settings read fails
 */
async function getIssuerSnapshotFromSettings(): Promise<IssuerSnapshot> {
  const settingsResult = await getSettings();
  if (settingsResult.success && settingsResult.data) {
    return {
      companyName: settingsResult.data.issuer.companyName,
      representativeName: settingsResult.data.issuer.representativeName,
      address: settingsResult.data.issuer.address,
      phone: settingsResult.data.issuer.phone,
      fax: settingsResult.data.issuer.fax,
      sealImageBase64: null, // Seal image is resolved dynamically for PDF generation
      contactPerson: settingsResult.data.issuer.showContactPerson
        ? settingsResult.data.issuer.contactPerson
        : null,
      email: settingsResult.data.issuer.email ?? null,
    };
  }
  return {
    companyName: null,
    representativeName: null,
    address: null,
    phone: null,
    fax: null,
    sealImageBase64: null,
    contactPerson: null,
    email: null,
  };
}

/**
 * Save sensitive issuer snapshot to secure storage
 * Reads current sensitive issuer info and saves it for the given document
 */
async function saveSensitiveSnapshot(
  documentId: string
): Promise<DomainResult<void, DocumentServiceError>> {
  // Try to read sensitive info - if it fails, use empty values
  const sensitiveResult = await getSensitiveIssuerInfo();

  const snapshot = sensitiveResult.success && sensitiveResult.data
    ? {
        invoiceNumber: sensitiveResult.data.invoiceNumber ?? null,
        bankName: sensitiveResult.data.bankAccount?.bankName ?? null,
        branchName: sensitiveResult.data.bankAccount?.branchName ?? null,
        accountType: sensitiveResult.data.bankAccount?.accountType ?? null,
        accountNumber: sensitiveResult.data.bankAccount?.accountNumber ?? null,
        accountHolderName: sensitiveResult.data.bankAccount?.accountHolderName ?? null,
      }
    : {
        invoiceNumber: null,
        bankName: null,
        branchName: null,
        accountType: null,
        accountNumber: null,
        accountHolderName: null,
      };

  // Save snapshot - check the result
  const saveResult = await saveIssuerSnapshot(documentId, snapshot);
  if (!saveResult.success) {
    return errorResult(
      createDocumentServiceError(
        'SNAPSHOT_ERROR',
        'Failed to save issuer snapshot',
        { originalError: saveResult.error?.originalError }
      )
    );
  }

  return successResult(undefined);
}

// === Public API ===

/**
 * Convert an estimate to an invoice
 *
 * Per SPEC 2.1.6, the conversion:
 * - Creates a NEW invoice (does not modify the estimate)
 * - Generates new UUID for document and line items
 * - Auto-generates new invoice number (INV-xxx)
 * - Sets issueDate to conversion date
 * - Sets status to 'draft'
 * - Copies clientName, clientAddress, subject, lineItems, notes from estimate
 * - Sets validUntil to null, dueDate to null, paidAt to null
 * - Re-fetches issuer snapshot from CURRENT settings (not estimate's snapshot)
 *
 * @param estimateId - ID of the estimate to convert
 * @param options - Optional options (today override, isPro flag)
 * @returns Result containing the new invoice and original estimate
 */
export async function convertEstimateToInvoice(
  estimateId: string,
  options?: ConvertEstimateOptions
): Promise<DomainResult<ConversionResult, DocumentServiceError>> {
  const todayDate = options?.today ?? getTodayString();
  const isPro = options?.isPro ?? false;

  // Free-tier limit guard (before any other operation)
  const limitError = await enforceDocumentCreationLimit(isPro);
  if (limitError) return limitError;

  // 1. Get the source estimate
  const estimateResult = await getDocumentById(estimateId);
  if (!estimateResult.success) {
    return errorResult(
      createDocumentServiceError(
        'STORAGE_ERROR',
        'Failed to read estimate',
        { originalError: estimateResult.error?.originalError }
      )
    );
  }

  const estimate = estimateResult.data;
  if (!estimate) {
    return errorResult(
      createDocumentServiceError(
        'DOCUMENT_NOT_FOUND',
        `Estimate with ID ${estimateId} not found`
      )
    );
  }

  // 2. Verify it's an estimate
  if (estimate.type !== 'estimate') {
    return errorResult(
      createDocumentServiceError(
        'VALIDATION_ERROR',
        `Document ${estimateId} is not an estimate (type: ${estimate.type})`
      )
    );
  }

  // 3. Generate new invoice number
  const numberResult = await generateDocumentNumber('invoice');
  if (!numberResult.success) {
    return errorResult(
      createDocumentServiceError(
        'NUMBERING_ERROR',
        'Failed to generate invoice number'
      )
    );
  }

  // 4. Get fresh issuer snapshot from current settings
  const issuerSnapshot = await getIssuerSnapshotFromSettings();

  // 5. Build the new invoice document
  const now = Date.now();
  const newInvoiceId = generateUUID();
  const invoice: Document = {
    // New identity
    id: newInvoiceId,
    documentNo: numberResult.data!,
    type: 'invoice',
    status: 'draft',

    // Copied from estimate
    clientName: estimate.clientName,
    clientAddress: estimate.clientAddress,
    customerId: estimate.customerId, // Preserve customer reference
    subject: estimate.subject,
    lineItems: regenerateLineItemIds(estimate.lineItems),
    notes: estimate.notes,
    carriedForwardAmount: estimate.carriedForwardAmount, // Copy from estimate

    // Date transformations
    issueDate: todayDate, // Set to conversion date
    validUntil: null,     // Removed for invoice
    dueDate: null,        // To be manually entered
    paidAt: null,         // Not paid yet

    // Fresh issuer snapshot
    issuerSnapshot,

    // Timestamps
    createdAt: now,
    updatedAt: now,
  };

  // 6. Save the invoice document
  const saveResult = await saveDocument(invoice);
  if (!saveResult.success) {
    return errorResult(
      createDocumentServiceError(
        'STORAGE_ERROR',
        'Failed to save converted invoice',
        { originalError: saveResult.error?.originalError }
      )
    );
  }

  // 7. Save sensitive issuer snapshot (non-fatal if fails)
  const snapshotResult = await saveSensitiveSnapshot(newInvoiceId);
  if (!snapshotResult.success) {
    // Log warning but don't fail the conversion
    if (__DEV__) console.warn('Failed to save sensitive snapshot for converted invoice:', newInvoiceId);
  }

  // 9. Return successful result
  return successResult({
    invoice: saveResult.data!,
    originalEstimate: estimate,
  });
}
