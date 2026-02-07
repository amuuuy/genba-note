/**
 * Kanban Service
 *
 * Pure functions for mapping document statuses to kanban columns
 * and grouping documents by column.
 *
 * Column definitions map columnId to statuses (domain only).
 * UI metadata (title, colors) lives in components/kanban/kanbanColumnConfig.
 */

import type { DocumentStatus } from '@/types/document';
import type { DocumentWithTotals } from '@/types/document';
import type { KanbanColumnId, KanbanColumnDef } from '@/types/kanban';

/** Domain-only column definitions (columnId ↔ statuses mapping) */
export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { id: 'working', statuses: ['draft'] },
  { id: 'sent_waiting', statuses: ['sent'] },
  { id: 'completed', statuses: ['paid', 'issued'] },
];

/**
 * Map a document status to its kanban column ID
 */
export function getKanbanColumn(status: DocumentStatus): KanbanColumnId {
  for (const col of KANBAN_COLUMNS) {
    if (col.statuses.includes(status)) {
      return col.id;
    }
  }
  return 'working';
}

/**
 * Filter documents belonging to a specific kanban column
 */
export function getDocumentsForColumn(
  documents: DocumentWithTotals[],
  columnId: KanbanColumnId
): DocumentWithTotals[] {
  const col = KANBAN_COLUMNS.find((c) => c.id === columnId);
  if (!col) return [];
  return documents.filter((doc) => col.statuses.includes(doc.status));
}
