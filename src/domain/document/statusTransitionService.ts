/**
 * Status Transition Service
 *
 * Pure functions for managing document status transitions.
 * Implements the state machine defined in SPEC 2.1.3.1:
 *
 * Estimate: draft ⇔ sent ⇔ issued, draft ⇔ issued
 * Invoice:  draft ⇔ sent ⇔ paid, draft ⇔ issued, issued → sent
 *
 * Forbidden: draft → paid (must go through sent)
 */

import type { Document, DocumentType, DocumentStatus } from '@/types/document';
import type { StatusTransitionError, DomainResult } from './types';
import { successResult, errorResult, createTransitionError } from './types';

// === Transition Matrix ===

/**
 * Allowed transitions for estimates
 * Estimates can be draft, sent, or issued
 * issued = PDF発行済み（最終確定）
 */
const ESTIMATE_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  draft: ['sent', 'issued'],
  sent: ['draft', 'issued'],
  paid: [], // Estimates cannot be paid
  issued: ['draft', 'sent'], // Can revert to draft or mark as sent
};

/**
 * Allowed transitions for invoices
 * Invoices can be draft, sent, paid, or issued
 * Transitions form a chain: draft ⇔ sent ⇔ paid
 * Additionally: draft ⇔ issued (PDF発行)
 * Note: draft → paid and paid → draft are forbidden (must go through sent)
 */
const INVOICE_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  draft: ['sent', 'issued'],
  sent: ['draft', 'paid'],
  paid: ['sent'], // Can only go back to sent, not directly to draft
  issued: ['draft', 'sent'], // Can revert to draft or mark as sent
};

// === Public API ===

/**
 * Check if a status transition is allowed
 *
 * @param documentType - Type of document (estimate or invoice)
 * @param fromStatus - Current status
 * @param toStatus - Target status
 * @returns true if transition is allowed
 */
export function canTransition(
  documentType: DocumentType,
  fromStatus: DocumentStatus,
  toStatus: DocumentStatus
): boolean {
  // Same status is not a transition
  if (fromStatus === toStatus) {
    return false;
  }

  const transitions =
    documentType === 'estimate' ? ESTIMATE_TRANSITIONS : INVOICE_TRANSITIONS;

  return transitions[fromStatus]?.includes(toStatus) ?? false;
}

/**
 * Get all allowed target statuses from current status
 *
 * @param documentType - Type of document
 * @param currentStatus - Current status
 * @returns Array of allowed target statuses
 */
export function getAllowedTransitions(
  documentType: DocumentType,
  currentStatus: DocumentStatus
): DocumentStatus[] {
  const transitions =
    documentType === 'estimate' ? ESTIMATE_TRANSITIONS : INVOICE_TRANSITIONS;

  return [...(transitions[currentStatus] ?? [])];
}

/**
 * Requirements for a status transition
 */
export interface TransitionRequirements {
  /** Whether paidAt is required for this transition */
  requiresPaidAt: boolean;
  /** Whether paidAt should be cleared (set to null) for this transition */
  clearsPaidAt: boolean;
}

/**
 * Get requirements for a specific transition
 *
 * @param documentType - Type of document
 * @param fromStatus - Current status
 * @param toStatus - Target status
 * @returns Requirements object, or null if transition is not allowed
 */
export function getTransitionRequirements(
  documentType: DocumentType,
  fromStatus: DocumentStatus,
  toStatus: DocumentStatus
): TransitionRequirements | null {
  if (!canTransition(documentType, fromStatus, toStatus)) {
    return null;
  }

  return {
    // paidAt is required when transitioning TO paid
    requiresPaidAt: toStatus === 'paid',
    // paidAt should be cleared when transitioning FROM paid
    clearsPaidAt: fromStatus === 'paid',
  };
}

/**
 * Execute a status transition on a document
 *
 * @param document - Document to transition
 * @param newStatus - Target status
 * @param paidAt - Payment date (required when transitioning to paid)
 * @returns Result containing updated document or error
 */
export function executeTransition(
  document: Document,
  newStatus: DocumentStatus,
  paidAt?: string | null
): DomainResult<Document, StatusTransitionError> {
  const { type, status: currentStatus } = document;

  // Check for estimate trying to become paid
  if (type === 'estimate' && newStatus === 'paid') {
    return errorResult(
      createTransitionError(
        'ESTIMATE_CANNOT_BE_PAID',
        'Estimates cannot have paid status',
        currentStatus,
        newStatus
      )
    );
  }

  // Check for direct draft → paid (forbidden)
  if (currentStatus === 'draft' && newStatus === 'paid') {
    return errorResult(
      createTransitionError(
        'DIRECT_DRAFT_TO_PAID',
        'Cannot transition directly from draft to paid. Must go through sent first.',
        currentStatus,
        newStatus
      )
    );
  }

  // Check if transition is allowed
  if (!canTransition(type, currentStatus, newStatus)) {
    return errorResult(
      createTransitionError(
        'INVALID_TRANSITION',
        `Cannot transition from ${currentStatus} to ${newStatus}`,
        currentStatus,
        newStatus
      )
    );
  }

  // Get transition requirements
  const requirements = getTransitionRequirements(type, currentStatus, newStatus)!;

  // Validate paidAt requirement
  if (requirements.requiresPaidAt && !paidAt) {
    return errorResult(
      createTransitionError(
        'INVALID_TRANSITION',
        'Payment date (paidAt) is required when transitioning to paid status',
        currentStatus,
        newStatus
      )
    );
  }

  // Build updated document
  let updatedPaidAt: string | null = document.paidAt;

  if (requirements.clearsPaidAt) {
    updatedPaidAt = null;
  } else if (requirements.requiresPaidAt && paidAt) {
    updatedPaidAt = paidAt;
  }

  const updatedDocument: Document = {
    ...document,
    status: newStatus,
    paidAt: updatedPaidAt,
  };

  return successResult(updatedDocument);
}
