/**
 * Line Item Service
 *
 * Standalone CRUD operations for line items.
 * All functions are pure and return new arrays (no mutation).
 *
 * Use case: UI forms for creating/editing individual line items
 * before adding them to a document. Validation errors use simple
 * field paths (name, quantityMilli, etc.) suitable for form field mapping.
 *
 * For document-context operations (where errors should reference
 * lineItems[id].*), use documentService directly which handles
 * document-level validation and storage.
 */

import type { LineItem, TaxRate } from '@/types/document';
import type { ValidationError } from '@/domain/document/types';
import { createValidationError } from '@/domain/document/types';
import { generateUUID } from '@/utils/uuid';
import { validateLineItem } from './validationService';
import { MAX_LINE_ITEMS } from '@/utils/constants';

// === Types ===

/**
 * Input for creating a new line item
 */
export interface LineItemInput {
  name: string;
  quantityMilli: number;
  unit: string;
  unitPrice: number;
  taxRate: TaxRate;
}

/**
 * Result type for line item operations
 */
export interface LineItemServiceResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

// === Helper Functions ===

/**
 * Create a success result
 */
function successResult<T>(data: T): LineItemServiceResult<T> {
  return { success: true, data };
}

/**
 * Create an error result
 */
function errorResult(errors: ValidationError[]): LineItemServiceResult<never> {
  return { success: false, errors };
}

// === Public Functions ===

/**
 * Create a new line item with generated ID
 * @param input - Line item input data
 * @returns Result with created LineItem or validation errors
 */
export function createLineItem(
  input: LineItemInput
): LineItemServiceResult<LineItem> {
  const lineItem: LineItem = {
    id: generateUUID(),
    name: input.name,
    quantityMilli: input.quantityMilli,
    unit: input.unit,
    unitPrice: input.unitPrice,
    taxRate: input.taxRate,
  };

  const errors = validateLineItem(lineItem);
  if (errors.length > 0) {
    return errorResult(errors);
  }

  return successResult(lineItem);
}

/**
 * Add a line item to an array (validates max limit)
 * @param lineItems - Current array of line items
 * @param input - New line item input data
 * @returns Result with new array or errors
 */
export function addLineItem(
  lineItems: LineItem[],
  input: LineItemInput
): LineItemServiceResult<LineItem[]> {
  // Check max limit before creating
  if (lineItems.length >= MAX_LINE_ITEMS) {
    return errorResult([
      createValidationError(
        'INVALID_LINE_ITEMS',
        `Maximum ${MAX_LINE_ITEMS} line items allowed`,
        'lineItems',
        { count: lineItems.length, max: MAX_LINE_ITEMS }
      ),
    ]);
  }

  // Create the new line item
  const createResult = createLineItem(input);
  if (!createResult.success) {
    return errorResult(createResult.errors!);
  }

  // Return new array with item appended
  return successResult([...lineItems, createResult.data!]);
}

/**
 * Update an existing line item by ID
 * @param lineItems - Current array of line items
 * @param id - ID of item to update
 * @param updates - Partial updates to apply
 * @returns Result with new array or errors
 */
export function updateLineItem(
  lineItems: LineItem[],
  id: string,
  updates: Partial<LineItemInput>
): LineItemServiceResult<LineItem[]> {
  const index = lineItems.findIndex((item) => item.id === id);
  if (index === -1) {
    return errorResult([
      createValidationError(
        'INVALID_LINE_ITEM',
        `Line item with ID '${id}' not found`,
        'id'
      ),
    ]);
  }

  // Create updated item
  const original = lineItems[index];
  const updated: LineItem = {
    ...original,
    ...updates,
  };

  // Validate updated item
  const errors = validateLineItem(updated);
  if (errors.length > 0) {
    return errorResult(errors);
  }

  // Return new array with updated item
  const newLineItems = [...lineItems];
  newLineItems[index] = updated;
  return successResult(newLineItems);
}

/**
 * Remove a line item by ID (validates min 1 item)
 * @param lineItems - Current array of line items
 * @param id - ID of item to remove
 * @returns Result with new array or errors
 */
export function removeLineItem(
  lineItems: LineItem[],
  id: string
): LineItemServiceResult<LineItem[]> {
  const index = lineItems.findIndex((item) => item.id === id);
  if (index === -1) {
    return errorResult([
      createValidationError(
        'INVALID_LINE_ITEM',
        `Line item with ID '${id}' not found`,
        'id'
      ),
    ]);
  }

  // Check minimum (must have at least 1 item)
  if (lineItems.length <= 1) {
    return errorResult([
      createValidationError(
        'INVALID_LINE_ITEMS',
        'At least one line item is required',
        'lineItems'
      ),
    ]);
  }

  // Return new array without the removed item
  const newLineItems = lineItems.filter((item) => item.id !== id);
  return successResult(newLineItems);
}

/**
 * Reorder line items (move item from fromIndex to toIndex)
 * @param lineItems - Current array of line items
 * @param fromIndex - Index of item to move
 * @param toIndex - Target index
 * @returns Result with new array or errors
 */
export function reorderLineItems(
  lineItems: LineItem[],
  fromIndex: number,
  toIndex: number
): LineItemServiceResult<LineItem[]> {
  // Validate indices
  if (
    fromIndex < 0 ||
    fromIndex >= lineItems.length ||
    toIndex < 0 ||
    toIndex >= lineItems.length
  ) {
    return errorResult([
      createValidationError(
        'INVALID_LINE_ITEM',
        `Invalid index: fromIndex=${fromIndex}, toIndex=${toIndex}, length=${lineItems.length}`,
        'index'
      ),
    ]);
  }

  // Same index is a no-op
  if (fromIndex === toIndex) {
    return successResult([...lineItems]);
  }

  // Create new array and reorder
  const newLineItems = [...lineItems];
  const [removed] = newLineItems.splice(fromIndex, 1);
  newLineItems.splice(toIndex, 0, removed);

  return successResult(newLineItems);
}

/**
 * Duplicate a line item
 * @param lineItems - Current array of line items
 * @param id - ID of item to duplicate
 * @returns Result with new array (duplicate inserted after original) or errors
 */
export function duplicateLineItem(
  lineItems: LineItem[],
  id: string
): LineItemServiceResult<LineItem[]> {
  const index = lineItems.findIndex((item) => item.id === id);
  if (index === -1) {
    return errorResult([
      createValidationError(
        'INVALID_LINE_ITEM',
        `Line item with ID '${id}' not found`,
        'id'
      ),
    ]);
  }

  // Check max limit
  if (lineItems.length >= MAX_LINE_ITEMS) {
    return errorResult([
      createValidationError(
        'INVALID_LINE_ITEMS',
        `Maximum ${MAX_LINE_ITEMS} line items allowed`,
        'lineItems',
        { count: lineItems.length, max: MAX_LINE_ITEMS }
      ),
    ]);
  }

  // Create duplicate with new ID
  const original = lineItems[index];
  const duplicate: LineItem = {
    ...original,
    id: generateUUID(),
  };

  // Insert duplicate right after original
  const newLineItems = [...lineItems];
  newLineItems.splice(index + 1, 0, duplicate);

  return successResult(newLineItems);
}
