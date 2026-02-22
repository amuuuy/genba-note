/**
 * Document Service
 *
 * Main service for document CRUD operations.
 * Integrates validation, status transitions, auto-numbering, and storage.
 */

import type {
  Document,
  DocumentType,
  DocumentStatus,
  DocumentFilter,
  DocumentSort,
  LineItem,
  IssuerSnapshot,
} from '@/types/document';
import type { DocumentServiceError, DomainResult } from './types';
import { successResult, errorResult, createDocumentServiceError } from './types';
import {
  validateDocument,
  validateEditAllowed,
  validatePaidAt,
  getEditableFields,
} from './documentValidation';
import { executeTransition, canTransition } from './statusTransitionService';
import { generateDocumentNumber } from './autoNumberingService';
import {
  getDocumentById,
  getAllDocuments,
  saveDocument,
  deleteDocument,
  filterDocuments,
  getSettings,
} from '@/storage/asyncStorageService';
import {
  getSensitiveIssuerInfo,
  saveIssuerSnapshot,
} from '@/storage/secureStorageService';
import { generateUUID } from '@/utils/uuid';
import { getTodayString } from '@/utils/dateUtils';
import { canCreateDocument as checkFreeTierLimit } from '@/subscription/freeTierLimitsService';

// === Input Types ===

/**
 * Input for creating a new document
 */
export interface CreateDocumentInput {
  type: DocumentType;
  clientName: string;
  clientAddress?: string | null;
  customerId?: string | null;
  subject?: string | null;
  issueDate: string;
  validUntil?: string | null;
  dueDate?: string | null;
  lineItems: Omit<LineItem, 'id'>[];
  carriedForwardAmount?: number | null;
  notes?: string | null;
}

/**
 * Input for updating a document
 */
export interface UpdateDocumentInput {
  clientName?: string;
  clientAddress?: string | null;
  customerId?: string | null;
  subject?: string | null;
  issueDate?: string;
  validUntil?: string | null;
  dueDate?: string | null;
  lineItems?: Omit<LineItem, 'id'>[];
  carriedForwardAmount?: number | null;
  notes?: string | null;
}

/**
 * Options for document creation operations.
 * isPro defaults to false (fail-closed: treats user as free-tier).
 */
export interface CreateDocumentOptions {
  /** Today's date override for testing */
  today?: string;
  /** Whether the user has Pro access. Defaults to false (fail-closed). */
  isPro?: boolean;
}

// === Helper Functions ===

/**
 * Enforce free-tier document creation limit.
 * Returns null if allowed, or an error result if blocked.
 * Pro users bypass the check entirely.
 * Free-tier users with document list read failure are fail-closed (blocked).
 *
 * Counts active (existing) documents, not cumulative creations.
 * Deleting documents frees up quota for free users.
 */
export async function enforceDocumentCreationLimit(
  isPro: boolean
): Promise<DomainResult<never, DocumentServiceError> | null> {
  if (isPro) return null;

  const docsResult = await getAllDocuments();
  if (!docsResult.success) {
    return errorResult(
      createDocumentServiceError(
        'FREE_TIER_LIMIT_EXCEEDED',
        'Failed to verify document creation limit'
      )
    );
  }
  const check = checkFreeTierLimit(docsResult.data!.length, false);
  if (!check.allowed) {
    return errorResult(
      createDocumentServiceError(
        'FREE_TIER_LIMIT_EXCEEDED',
        `Free tier document limit reached (${check.current}/${check.limit})`
      )
    );
  }
  return null;
}

/**
 * Generate UUIDs for line items
 */
function addLineItemIds(lineItems: Omit<LineItem, 'id'>[]): LineItem[] {
  return lineItems.map((item) => ({
    ...item,
    id: generateUUID(),
  }));
}

/**
 * Get issuer snapshot from settings
 */
async function getIssuerSnapshotFromSettings(): Promise<IssuerSnapshot> {
  const settingsResult = await getSettings();
  if (settingsResult.success && settingsResult.data) {
    const issuer = settingsResult.data.issuer;
    return {
      companyName: issuer.companyName,
      representativeName: issuer.representativeName,
      address: issuer.address,
      phone: issuer.phone,
      fax: issuer.fax,
      sealImageBase64: null, // Seal image is resolved dynamically for PDF generation
      // Only include contactPerson if showContactPerson is true
      contactPerson: issuer.showContactPerson ? issuer.contactPerson : null,
      email: issuer.email ?? null,
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
 * @returns DomainResult indicating success or failure
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
 * Create a new document
 *
 * @param input - Document creation input
 * @param options - Optional options (today override, isPro flag)
 * @returns Result containing created document
 */
export async function createDocument(
  input: CreateDocumentInput,
  options?: CreateDocumentOptions
): Promise<DomainResult<Document, DocumentServiceError>> {
  const todayDate = options?.today ?? getTodayString();
  const isPro = options?.isPro ?? false;

  // Free-tier limit guard (before numbering to avoid wasting a number)
  const limitError = await enforceDocumentCreationLimit(isPro);
  if (limitError) return limitError;

  // Generate document number
  const numberResult = await generateDocumentNumber(input.type);
  if (!numberResult.success) {
    return errorResult(
      createDocumentServiceError(
        'NUMBERING_ERROR',
        'Failed to generate document number'
      )
    );
  }

  // Validate type-specific field constraints (reject non-applicable fields)
  if (input.type === 'estimate') {
    // Estimate cannot have dueDate
    if (input.dueDate !== undefined && input.dueDate !== null) {
      return errorResult(
        createDocumentServiceError('VALIDATION_ERROR', 'Estimate cannot have dueDate')
      );
    }
  } else {
    // Invoice cannot have validUntil
    if (input.validUntil !== undefined && input.validUntil !== null) {
      return errorResult(
        createDocumentServiceError('VALIDATION_ERROR', 'Invoice cannot have validUntil')
      );
    }
  }

  // Get issuer snapshot
  const issuerSnapshot = await getIssuerSnapshotFromSettings();

  // Build document
  const now = Date.now();
  const documentId = generateUUID();
  const document: Document = {
    id: documentId,
    documentNo: numberResult.data!,
    type: input.type,
    status: 'draft',
    clientName: input.clientName,
    clientAddress: input.clientAddress ?? null,
    customerId: input.customerId ?? null,
    subject: input.subject ?? null,
    issueDate: input.issueDate,
    validUntil: input.type === 'estimate' ? (input.validUntil ?? null) : null,
    dueDate: input.type === 'invoice' ? (input.dueDate ?? null) : null,
    paidAt: null,
    lineItems: addLineItemIds(input.lineItems),
    carriedForwardAmount: input.carriedForwardAmount ?? null,
    notes: input.notes ?? null,
    issuerSnapshot,
    createdAt: now,
    updatedAt: now,
  };

  // Validate document
  const validationErrors = validateDocument(document, todayDate);
  if (validationErrors.length > 0) {
    return errorResult(
      createDocumentServiceError('VALIDATION_ERROR', 'Document validation failed', {
        validationErrors,
      })
    );
  }

  // Save document first (to avoid orphan snapshots if document save fails)
  const saveResult = await saveDocument(document);
  if (!saveResult.success) {
    return errorResult(
      createDocumentServiceError('STORAGE_ERROR', 'Failed to save document', {
        originalError: saveResult.error?.originalError,
      })
    );
  }

  // Save sensitive snapshot after document (snapshot failure is non-fatal for the document)
  const snapshotResult = await saveSensitiveSnapshot(documentId);
  if (!snapshotResult.success) {
    // Document is saved but snapshot failed - log for debugging but don't fail the operation
    // The document can still be used, just without sensitive issuer info in exports
    if (__DEV__) console.warn('Failed to save sensitive snapshot for document:', documentId);
  }

  return successResult(saveResult.data!);
}

/**
 * Get a document by ID
 *
 * @param id - Document ID
 * @returns Result containing document or null
 */
export async function getDocument(
  id: string
): Promise<DomainResult<Document | null, DocumentServiceError>> {
  const result = await getDocumentById(id);

  if (!result.success) {
    return errorResult(
      createDocumentServiceError('STORAGE_ERROR', 'Failed to read document', {
        originalError: result.error?.originalError,
      })
    );
  }

  return successResult(result.data ?? null);
}

/**
 * List documents with optional filtering and sorting
 *
 * @param filter - Optional filter criteria
 * @param sort - Optional sort criteria
 * @returns Result containing array of documents
 */
export async function listDocuments(
  filter?: DocumentFilter,
  sort?: DocumentSort
): Promise<DomainResult<Document[], DocumentServiceError>> {
  const result = await filterDocuments(filter, sort);

  if (!result.success) {
    return errorResult(
      createDocumentServiceError('STORAGE_ERROR', 'Failed to list documents', {
        originalError: result.error?.originalError,
      })
    );
  }

  return successResult(result.data ?? []);
}

/**
 * Update a document
 *
 * @param id - Document ID
 * @param updates - Fields to update
 * @param today - Optional today's date for testing
 * @returns Result containing updated document
 */
export async function updateDocument(
  id: string,
  updates: UpdateDocumentInput,
  today?: string
): Promise<DomainResult<Document, DocumentServiceError>> {
  const todayDate = today ?? getTodayString();

  // Get existing document
  const existingResult = await getDocumentById(id);
  if (!existingResult.success) {
    return errorResult(
      createDocumentServiceError('STORAGE_ERROR', 'Failed to read document')
    );
  }

  const existing = existingResult.data;
  if (!existing) {
    return errorResult(
      createDocumentServiceError('DOCUMENT_NOT_FOUND', 'Document not found')
    );
  }

  // Build updated document
  const updated: Document = {
    ...existing,
    clientName: updates.clientName ?? existing.clientName,
    clientAddress:
      updates.clientAddress !== undefined
        ? updates.clientAddress
        : existing.clientAddress,
    customerId:
      updates.customerId !== undefined
        ? updates.customerId
        : existing.customerId,
    subject: updates.subject !== undefined ? updates.subject : existing.subject,
    issueDate: updates.issueDate ?? existing.issueDate,
    validUntil:
      updates.validUntil !== undefined ? updates.validUntil : existing.validUntil,
    dueDate: updates.dueDate !== undefined ? updates.dueDate : existing.dueDate,
    lineItems: updates.lineItems
      ? addLineItemIds(updates.lineItems)
      : existing.lineItems,
    carriedForwardAmount:
      updates.carriedForwardAmount !== undefined
        ? updates.carriedForwardAmount
        : existing.carriedForwardAmount,
    notes: updates.notes !== undefined ? updates.notes : existing.notes,
    updatedAt: Date.now(),
  };

  // Check edit permissions for paid status
  if (existing.status === 'paid') {
    const editError = validateEditAllowed(existing, updated);
    if (editError) {
      return errorResult(
        createDocumentServiceError(
          'EDIT_FORBIDDEN',
          'Cannot edit this field when status is paid'
        )
      );
    }
  }

  // Validate updated document
  const validationErrors = validateDocument(updated, todayDate);
  if (validationErrors.length > 0) {
    return errorResult(
      createDocumentServiceError('VALIDATION_ERROR', 'Document validation failed', {
        validationErrors,
      })
    );
  }

  // Save document
  const saveResult = await saveDocument(updated);
  if (!saveResult.success) {
    return errorResult(
      createDocumentServiceError('STORAGE_ERROR', 'Failed to save document')
    );
  }

  return successResult(saveResult.data!);
}

/**
 * Change document status
 *
 * @param id - Document ID
 * @param newStatus - Target status
 * @param paidAt - Payment date (required when transitioning to paid)
 * @returns Result containing updated document
 */
export async function changeDocumentStatus(
  id: string,
  newStatus: DocumentStatus,
  paidAt?: string
): Promise<DomainResult<Document, DocumentServiceError>> {
  // Get existing document
  const existingResult = await getDocumentById(id);
  if (!existingResult.success) {
    return errorResult(
      createDocumentServiceError('STORAGE_ERROR', 'Failed to read document')
    );
  }

  const existing = existingResult.data;
  if (!existing) {
    return errorResult(
      createDocumentServiceError('DOCUMENT_NOT_FOUND', 'Document not found')
    );
  }

  // Execute transition
  const transitionResult = executeTransition(existing, newStatus, paidAt);
  if (!transitionResult.success) {
    return errorResult(
      createDocumentServiceError('TRANSITION_ERROR', 'Invalid status transition', {
        transitionError: transitionResult.error,
      })
    );
  }

  const updated = {
    ...transitionResult.data!,
    updatedAt: Date.now(),
  };

  // Validate paidAt using validatePaidAt (handles format, range, and requirement checks)
  const today = getTodayString();
  const paidAtError = validatePaidAt(
    updated.paidAt,
    updated.status,
    existing.issueDate,
    today
  );
  if (paidAtError) {
    return errorResult(
      createDocumentServiceError('VALIDATION_ERROR', paidAtError.message, {
        validationErrors: [paidAtError],
      })
    );
  }

  // Save document
  const saveResult = await saveDocument(updated);
  if (!saveResult.success) {
    return errorResult(
      createDocumentServiceError('STORAGE_ERROR', 'Failed to save document')
    );
  }

  return successResult(saveResult.data!);
}

/**
 * Delete a document
 *
 * @param id - Document ID
 * @returns Result indicating success
 */
export async function deleteDocumentById(
  id: string
): Promise<DomainResult<void, DocumentServiceError>> {
  // Check if document exists
  const existingResult = await getDocumentById(id);
  if (!existingResult.success) {
    return errorResult(
      createDocumentServiceError('STORAGE_ERROR', 'Failed to read document')
    );
  }

  if (!existingResult.data) {
    return errorResult(
      createDocumentServiceError('DOCUMENT_NOT_FOUND', 'Document not found')
    );
  }

  // Delete document (this also deletes sensitive snapshot)
  const deleteResult = await deleteDocument(id);
  if (!deleteResult.success) {
    return errorResult(
      createDocumentServiceError('STORAGE_ERROR', 'Failed to delete document')
    );
  }

  return successResult(undefined);
}

/**
 * Duplicate a document with new ID and number
 *
 * @param id - Source document ID
 * @param options - Optional options (today override, isPro flag)
 * @returns Result containing duplicated document
 */
export async function duplicateDocument(
  id: string,
  options?: CreateDocumentOptions
): Promise<DomainResult<Document, DocumentServiceError>> {
  const todayDate = options?.today ?? getTodayString();
  const isPro = options?.isPro ?? false;

  // Free-tier limit guard
  const limitError = await enforceDocumentCreationLimit(isPro);
  if (limitError) return limitError;

  // Get source document
  const existingResult = await getDocumentById(id);
  if (!existingResult.success) {
    return errorResult(
      createDocumentServiceError('STORAGE_ERROR', 'Failed to read document')
    );
  }

  const existing = existingResult.data;
  if (!existing) {
    return errorResult(
      createDocumentServiceError('DOCUMENT_NOT_FOUND', 'Document not found')
    );
  }

  // Generate new document number
  const numberResult = await generateDocumentNumber(existing.type);
  if (!numberResult.success) {
    return errorResult(
      createDocumentServiceError(
        'NUMBERING_ERROR',
        'Failed to generate document number'
      )
    );
  }

  // Get fresh issuer snapshot
  const issuerSnapshot = await getIssuerSnapshotFromSettings();

  // Build duplicated document
  const now = Date.now();
  const newDocumentId = generateUUID();
  const duplicated: Document = {
    ...existing,
    id: newDocumentId,
    documentNo: numberResult.data!,
    status: 'draft',
    paidAt: null,
    issuerSnapshot,
    lineItems: addLineItemIds(
      existing.lineItems.map(({ id: _, ...rest }) => rest)
    ),
    createdAt: now,
    updatedAt: now,
  };

  // Save document first (to avoid orphan snapshots if document save fails)
  const saveResult = await saveDocument(duplicated);
  if (!saveResult.success) {
    return errorResult(
      createDocumentServiceError('STORAGE_ERROR', 'Failed to save document')
    );
  }

  // Save sensitive snapshot after document (snapshot failure is non-fatal)
  const snapshotResult = await saveSensitiveSnapshot(newDocumentId);
  if (!snapshotResult.success) {
    if (__DEV__) console.warn('Failed to save sensitive snapshot for document:', newDocumentId);
  }

  return successResult(saveResult.data!);
}
