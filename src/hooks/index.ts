/**
 * Hooks Module
 *
 * Exports all custom hooks.
 */

export { useReadOnlyMode, type UseReadOnlyModeReturn } from './useReadOnlyMode';
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

export { useProStatus } from './useProStatus';
export type { UseProStatusReturn } from './useProStatus';

export { useUnitPricePicker, extractCategories } from './useUnitPricePicker';
export type {
  UnitPricePickerState,
  UseUnitPricePickerReturn,
} from './useUnitPricePicker';

export { useCustomerList } from './useCustomerList';
export type { UseCustomerListReturn } from './useCustomerList';

export { useCustomerPhotos } from './useCustomerPhotos';
export type { UseCustomerPhotosReturn, PhotosByType } from './useCustomerPhotos';

export { useWorkLogEntries } from './useWorkLogEntries';
export type { UseWorkLogEntriesReturn } from './useWorkLogEntries';

export { useCustomerEdit } from './useCustomerEdit';
export type {
  CustomerFormValues,
  CustomerFormErrors,
  CustomerEditState,
  UseCustomerEditReturn,
} from './useCustomerEdit';

export { useFinanceChart } from './useFinanceChart';
export type { UseFinanceChartReturn } from './useFinanceChart';

export { useKanbanBoard, resolveHandleDrop } from './useKanbanBoard';
export type { UseKanbanBoardReturn, HandleDropResult } from './useKanbanBoard';

export { useAiPriceSearch } from './useAiPriceSearch';
export type { UseAiPriceSearchReturn } from './useAiPriceSearch';
