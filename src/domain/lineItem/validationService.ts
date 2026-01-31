/**
 * Validation Service for Line Items
 *
 * Provides lineItem-specific validation with simple field paths
 * suitable for standalone lineItem forms.
 *
 * Re-exports document-context validation for use within documents.
 */

import type { LineItem, TaxRate } from '@/types/document';
import type { ValidationError } from '@/domain/document/types';
import { createValidationError } from '@/domain/document/types';
import {
  MAX_QUANTITY_MILLI,
  MIN_QUANTITY_MILLI,
  MAX_UNIT_PRICE,
  MIN_UNIT_PRICE,
  isCalculationSafe,
  MILLI_MULTIPLIER,
} from '@/utils/constants';

// Re-export from documentValidation for document-context use
export {
  validateLineItem as validateLineItemInDocument,
  validateLineItems,
  validateDocumentTotal,
} from '@/domain/document/documentValidation';

// Re-export types
export type { ValidationError } from '@/domain/document/types';

/**
 * Validate quantityMilli value
 * @param quantityMilli - Quantity in milli-units to validate
 * @returns ValidationError if invalid, null if valid
 */
export function validateQuantityMilli(
  quantityMilli: number
): ValidationError | null {
  if (quantityMilli < MIN_QUANTITY_MILLI || quantityMilli > MAX_QUANTITY_MILLI) {
    return createValidationError(
      'INVALID_QUANTITY',
      `Quantity must be between ${MIN_QUANTITY_MILLI / MILLI_MULTIPLIER} and ${MAX_QUANTITY_MILLI / MILLI_MULTIPLIER}`,
      'quantityMilli',
      { min: MIN_QUANTITY_MILLI, max: MAX_QUANTITY_MILLI }
    );
  }
  return null;
}

/**
 * Validate unitPrice value
 * @param unitPrice - Unit price in yen to validate
 * @returns ValidationError if invalid, null if valid
 */
export function validateUnitPrice(unitPrice: number): ValidationError | null {
  if (unitPrice < MIN_UNIT_PRICE || unitPrice > MAX_UNIT_PRICE) {
    return createValidationError(
      'INVALID_UNIT_PRICE',
      `Unit price must be between ${MIN_UNIT_PRICE} and ${MAX_UNIT_PRICE} yen`,
      'unitPrice',
      { min: MIN_UNIT_PRICE, max: MAX_UNIT_PRICE }
    );
  }
  return null;
}

/**
 * Validate that line item calculation is safe (no overflow)
 * @param quantityMilli - Quantity in milli-units
 * @param unitPrice - Unit price in yen
 * @returns ValidationError if overflow would occur, null if safe
 */
export function validateLineItemCalculation(
  quantityMilli: number,
  unitPrice: number
): ValidationError | null {
  if (!isCalculationSafe(quantityMilli, unitPrice)) {
    return createValidationError(
      'CALCULATION_OVERFLOW',
      'Quantity and unit price combination exceeds calculation limit',
      'lineItem', // item-level field for consistent error mapping
      { quantityMilli, unitPrice }
    );
  }
  return null;
}

// === Standalone LineItem Validation ===
// Uses simple field names (name, quantityMilli, etc.) instead of
// document-context paths (lineItems[id].name)

/**
 * Validate a single line item with simple field paths.
 * Use this for standalone lineItem forms where error.field
 * should be directly mappable to input fields.
 *
 * @param lineItem - Line item to validate (or partial input with id)
 * @returns Array of ValidationErrors (empty if valid)
 */
export function validateLineItem(
  lineItem: LineItem | { name: string; quantityMilli: number; unit: string; unitPrice: number; taxRate: TaxRate }
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate name
  if (!lineItem.name || lineItem.name.trim().length === 0) {
    errors.push(
      createValidationError(
        'INVALID_LINE_ITEM',
        'Line item name is required',
        'name'
      )
    );
  }

  // Validate unit
  if (!lineItem.unit || lineItem.unit.trim().length === 0) {
    errors.push(
      createValidationError(
        'INVALID_UNIT',
        'Line item unit is required',
        'unit'
      )
    );
  }

  // Validate quantityMilli
  const qtyError = validateQuantityMilli(lineItem.quantityMilli);
  if (qtyError) {
    errors.push(qtyError);
  }

  // Validate unitPrice
  const priceError = validateUnitPrice(lineItem.unitPrice);
  if (priceError) {
    errors.push(priceError);
  }

  // Validate taxRate (0 or 10 only)
  if (lineItem.taxRate !== 0 && lineItem.taxRate !== 10) {
    errors.push(
      createValidationError(
        'INVALID_LINE_ITEM',
        'Tax rate must be 0 or 10',
        'taxRate'
      )
    );
  }

  // Validate calculation safety
  const calcError = validateLineItemCalculation(
    lineItem.quantityMilli,
    lineItem.unitPrice
  );
  if (calcError) {
    errors.push(calcError);
  }

  return errors;
}
