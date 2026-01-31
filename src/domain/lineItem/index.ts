/**
 * Line Item Domain Module
 *
 * Exports all public APIs for line item operations:
 * - Calculation functions (integer arithmetic)
 * - Validation functions
 * - CRUD operations
 */

// === Calculation Service ===
export {
  toQuantityMilli,
  fromQuantityMilli,
  calcLineSubtotal,
  calcLineTax,
  calculateLineItem,
  calculateLineItems,
  calculateDocumentTotals,
  enrichDocumentWithTotals,
  validateCalculation,
} from './calculationService';

// === Validation Service ===
export {
  // Standalone lineItem validation (simple field paths)
  validateLineItem,
  // Document-context validation (lineItems[id].* paths)
  validateLineItemInDocument,
  validateLineItems,
  validateDocumentTotal,
  // Field-level validation helpers
  validateQuantityMilli,
  validateUnitPrice,
  validateLineItemCalculation,
} from './validationService';

export type { ValidationError } from './validationService';

// === Line Item Service ===
export {
  createLineItem,
  addLineItem,
  updateLineItem,
  removeLineItem,
  reorderLineItems,
  duplicateLineItem,
} from './lineItemService';

export type {
  LineItemInput,
  LineItemServiceResult,
} from './lineItemService';
