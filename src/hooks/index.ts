/**
 * Hooks Module
 *
 * Exports all custom hooks.
 */

export { useDocumentFilter } from './useDocumentFilter';
export type {
  FilterState,
  FilterResult,
  UseDocumentFilterReturn,
  DocumentFilterWithMeta,
} from './useDocumentFilter';
export {
  initialFilterState,
  updateSearchText,
  updateTypeFilter,
  updateStatusFilter,
  toFilterResult,
  toDocumentFilter,
} from './useDocumentFilter';

export { useDocumentList } from './useDocumentList';
export type {
  DocumentListState,
  UseDocumentListReturn,
} from './useDocumentList';
export { enrichDocumentsWithTotals, createDeleteHandler } from './useDocumentList';
