/**
 * UnitPrice Domain Module
 *
 * Exports all unitPrice domain services and types.
 */

// Types
export type {
  UnitPriceValidationErrorCode,
  UnitPriceServiceErrorCode,
  UnitPriceValidationError,
  UnitPriceServiceError,
  UnitPriceResult,
} from './types';

export {
  successResult,
  errorResult,
  createValidationError,
  createServiceError,
} from './types';

// Validation Service
export type { UnitPriceInput } from './validationService';

export {
  validateName,
  validateUnit,
  validateDefaultPrice,
  validateDefaultTaxRate,
  validatePackQty,
  validatePackPrice,
  validatePackConsistency,
  validateUnitPrice,
  normalizeOptionalString,
} from './validationService';

// Search Service
export type { UnitPriceSortField, SortDirection } from './searchService';

export {
  matchesSearchText,
  matchesCategory,
  filterUnitPrices,
  getUniqueCategories,
  sortUnitPrices,
} from './searchService';

// CRUD Service
export type { UpdateUnitPriceInput } from './unitPriceService';

export {
  createUnitPrice,
  getUnitPrice,
  listUnitPrices,
  updateUnitPrice,
  deleteUnitPriceById,
  duplicateUnitPrice,
  unitPriceToLineItemInput,
  lineItemToUnitPriceInput,
} from './unitPriceService';
