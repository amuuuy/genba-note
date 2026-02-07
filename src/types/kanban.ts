/**
 * Kanban Board Types
 *
 * Type definitions for the kanban board view layer.
 * The kanban board is a visual representation of document statuses
 * using 3 columns: working, sent/waiting, completed.
 */

import type { DocumentStatus } from './document';

/** The three kanban column identifiers */
export type KanbanColumnId = 'working' | 'sent_waiting' | 'completed';

/** Domain column definition (status mapping only, no UI metadata) */
export interface KanbanColumnDef {
  id: KanbanColumnId;
  statuses: DocumentStatus[];
}

/** UI column definition extending domain with display metadata */
export interface KanbanColumnUIDef extends KanbanColumnDef {
  title: string;
  headerColor: string;
  headerBgColor: string;
}

/** Result of resolving a kanban drop to a status transition */
export interface DropTransitionResult {
  newStatus: DocumentStatus;
  requiresPaidAt?: boolean;
}
