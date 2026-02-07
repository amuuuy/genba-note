/**
 * useKanbanBoard Hook
 *
 * Manages kanban board state: column grouping, drop handling,
 * status transitions, and paidAt modal flow.
 *
 * Core drop-resolution logic is exported as `resolveHandleDrop`
 * for direct unit testing (renderHook unavailable in this project).
 */

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type { DocumentWithTotals, DocumentStatus } from '@/types/document';
import type { KanbanColumnId } from '@/types/kanban';
import { getDocumentsForColumn, resolveDropTransition } from '@/domain/kanban';
import { changeDocumentStatus } from '@/domain/document/documentService';

interface PendingDrop {
  docId: string;
  targetStatus: DocumentStatus;
  issueDate: string;
}

/**
 * Result of resolving a handleDrop call.
 * Exported for direct testing without renderHook.
 */
export type HandleDropResult =
  | { action: 'noop' }
  | { action: 'transition'; docId: string; newStatus: DocumentStatus }
  | { action: 'requiresPaidAt'; docId: string; newStatus: DocumentStatus; issueDate: string };

/**
 * Pure function that resolves a drop into an action.
 * This is the exact logic used inside useKanbanBoard.handleDrop.
 */
export function resolveHandleDrop(
  documents: DocumentWithTotals[],
  docId: string,
  targetColumnId: KanbanColumnId
): HandleDropResult {
  const doc = documents.find((d) => d.id === docId);
  if (!doc) return { action: 'noop' };

  const result = resolveDropTransition(doc.status, targetColumnId, doc.type);
  if (result === null) return { action: 'noop' };

  if (result.requiresPaidAt) {
    return {
      action: 'requiresPaidAt',
      docId,
      newStatus: result.newStatus,
      issueDate: doc.issueDate,
    };
  }

  return { action: 'transition', docId, newStatus: result.newStatus };
}

export interface UseKanbanBoardReturn {
  columns: Record<KanbanColumnId, DocumentWithTotals[]>;
  handleDrop: (docId: string, targetColumnId: KanbanColumnId) => void;
  isTransitioning: boolean;
  transitionError: string | null;
  clearError: () => void;
  showPaidAtModal: boolean;
  paidAtIssueDate: string;
  onPaidAtConfirm: (paidAt: string) => void;
  onPaidAtCancel: () => void;
}

export function useKanbanBoard(
  documents: DocumentWithTotals[],
  refresh: () => Promise<void>
): UseKanbanBoardReturn {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup error timer on unmount to prevent state updates after unmount
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
    };
  }, []);

  const columns = useMemo<Record<KanbanColumnId, DocumentWithTotals[]>>(
    () => ({
      working: getDocumentsForColumn(documents, 'working'),
      sent_waiting: getDocumentsForColumn(documents, 'sent_waiting'),
      completed: getDocumentsForColumn(documents, 'completed'),
    }),
    [documents]
  );

  const showError = useCallback((message: string) => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
    }
    setTransitionError(message);
    errorTimerRef.current = setTimeout(() => {
      setTransitionError(null);
      errorTimerRef.current = null;
    }, 3000);
  }, []);

  const clearError = useCallback(() => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    setTransitionError(null);
  }, []);

  const executeTransition = useCallback(
    async (docId: string, newStatus: DocumentStatus, paidAt?: string) => {
      setIsTransitioning(true);
      try {
        const result = await changeDocumentStatus(docId, newStatus, paidAt);
        if (!result.success) {
          showError('ステータスの変更に失敗しました');
          return;
        }
        await refresh();
      } catch {
        showError('ステータスの変更に失敗しました');
      } finally {
        setIsTransitioning(false);
      }
    },
    [refresh, showError]
  );

  const handleDrop = useCallback(
    (docId: string, targetColumnId: KanbanColumnId) => {
      const dropResult = resolveHandleDrop(documents, docId, targetColumnId);

      if (dropResult.action === 'noop') return;

      if (dropResult.action === 'requiresPaidAt') {
        setPendingDrop({
          docId: dropResult.docId,
          targetStatus: dropResult.newStatus,
          issueDate: dropResult.issueDate,
        });
        return;
      }

      executeTransition(dropResult.docId, dropResult.newStatus);
    },
    [documents, executeTransition]
  );

  const onPaidAtConfirm = useCallback(
    (paidAt: string) => {
      if (pendingDrop) {
        executeTransition(pendingDrop.docId, pendingDrop.targetStatus, paidAt);
        setPendingDrop(null);
      }
    },
    [pendingDrop, executeTransition]
  );

  const onPaidAtCancel = useCallback(() => {
    setPendingDrop(null);
  }, []);

  return {
    columns,
    handleDrop,
    isTransitioning,
    transitionError,
    clearError,
    showPaidAtModal: pendingDrop !== null,
    paidAtIssueDate: pendingDrop?.issueDate ?? '',
    onPaidAtConfirm,
    onPaidAtCancel,
  };
}
