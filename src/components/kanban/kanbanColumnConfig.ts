/**
 * Kanban Column UI Configuration
 *
 * UI metadata (title, colors) for kanban columns.
 * Domain mapping (columnId ↔ statuses) lives in domain/kanban/kanbanService.
 */

import type { KanbanColumnId, KanbanColumnUIDef } from '@/types/kanban';
import { KANBAN_COLUMNS } from '@/domain/kanban/kanbanService';

/** UI metadata keyed by column ID — typed to enforce coverage of all column IDs */
const COLUMN_UI_META: Record<KanbanColumnId, { title: string; headerColor: string; headerBgColor: string }> = {
  working: { title: '作業中', headerColor: '#8E8E93', headerBgColor: '#E5E5EA' },
  sent_waiting: { title: '送付済/入金待ち', headerColor: '#FF9500', headerBgColor: '#FFF3E0' },
  completed: { title: '完了', headerColor: '#34C759', headerBgColor: '#E8F5E9' },
};

/** Merged column definitions with UI metadata for rendering */
export const KANBAN_UI_COLUMNS: KanbanColumnUIDef[] = KANBAN_COLUMNS.map((col) => ({
  ...col,
  ...COLUMN_UI_META[col.id],
}));
