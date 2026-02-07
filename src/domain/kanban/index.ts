/**
 * Kanban Domain Module
 *
 * Exports kanban board domain logic (pure functions).
 */

export {
  KANBAN_COLUMNS,
  getKanbanColumn,
  getDocumentsForColumn,
} from './kanbanService';

export { resolveDropTransition } from './kanbanTransitionService';
