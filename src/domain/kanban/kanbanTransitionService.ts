/**
 * Kanban Transition Service
 *
 * Pure function that resolves a kanban drag-and-drop action
 * into a concrete status transition. Delegates to
 * statusTransitionService for transition validation.
 *
 * Key rules:
 * - working column → 'draft'
 * - sent_waiting column → 'sent'
 * - completed column: draft→'issued', sent+invoice→'paid', sent+estimate→'issued'
 * - Same-column drops return null (no-op)
 * - Invalid transitions (per statusTransitionService) return null
 */

import type { DocumentType, DocumentStatus } from '@/types/document';
import type { KanbanColumnId, DropTransitionResult } from '@/types/kanban';
import { canTransition, getTransitionRequirements } from '@/domain/document/statusTransitionService';
import { getKanbanColumn } from './kanbanService';

/**
 * Resolve a kanban drop into a status transition result.
 *
 * @param fromStatus - Current document status
 * @param toColumnId - Target kanban column
 * @param docType - Document type (estimate or invoice)
 * @returns Transition result with newStatus (and requiresPaidAt flag), or null if invalid/no-op
 */
export function resolveDropTransition(
  fromStatus: DocumentStatus,
  toColumnId: KanbanColumnId,
  docType: DocumentType
): DropTransitionResult | null {
  // Same column → no-op
  const sourceColumn = getKanbanColumn(fromStatus);
  if (sourceColumn === toColumnId) {
    return null;
  }

  // Determine target status based on column and context
  const targetStatus = resolveTargetStatus(fromStatus, toColumnId, docType);
  if (targetStatus === null) {
    return null;
  }

  // Validate via statusTransitionService
  if (!canTransition(docType, fromStatus, targetStatus)) {
    return null;
  }

  // Check requirements (paidAt)
  const reqs = getTransitionRequirements(docType, fromStatus, targetStatus);
  if (reqs?.requiresPaidAt) {
    return { newStatus: targetStatus, requiresPaidAt: true };
  }

  return { newStatus: targetStatus };
}

/**
 * Determine the target status for a given column drop.
 * Returns null for impossible combinations.
 */
function resolveTargetStatus(
  fromStatus: DocumentStatus,
  toColumnId: KanbanColumnId,
  docType: DocumentType
): DocumentStatus | null {
  switch (toColumnId) {
    case 'working':
      return 'draft';
    case 'sent_waiting':
      return 'sent';
    case 'completed':
      // draft → issued (draft→paid is always forbidden)
      if (fromStatus === 'draft') {
        return 'issued';
      }
      // sent + invoice → paid
      if (fromStatus === 'sent' && docType === 'invoice') {
        return 'paid';
      }
      // sent + estimate → issued (estimate has no paid status; mark as issued to complete)
      if (fromStatus === 'sent' && docType === 'estimate') {
        return 'issued';
      }
      // Other cases: let canTransition decide
      return 'issued';
    default:
      return null;
  }
}
