/**
 * Validation service for UnitPrice domain
 *
 * Pure functions for validating unit price fields.
 * Returns errors or null for each validation.
 */

import type { UnitPrice } from '@/types/unitPrice';
import type { TaxRate } from '@/types/document';
import { MAX_UNIT_PRICE, MIN_UNIT_PRICE } from '@/utils/constants';
import {
  type UnitPriceValidationError,
  createValidationError,
} from './types';

/**
 * Input type for unit price creation/update (without id, timestamps)
 */
export interface UnitPriceInput {
  name: string;
  unit: string;
  defaultPrice: number;
  defaultTaxRate: TaxRate;
  category?: string | null;
  notes?: string | null;
  packQty?: number | null;
  packPrice?: number | null;
}

/**
 * Validate name field
 * @param name - Unit price name to validate
 * @returns UnitPriceValidationError if invalid, null if valid
 */
export function validateName(name: string): UnitPriceValidationError | null {
  if (!name || name.trim().length === 0) {
    return createValidationError(
      'INVALID_NAME',
      'Name is required and cannot be empty',
      'name'
    );
  }
  return null;
}

/**
 * Validate unit field
 * @param unit - Unit of measurement to validate
 * @returns UnitPriceValidationError if invalid, null if valid
 */
export function validateUnit(unit: string): UnitPriceValidationError | null {
  if (!unit || unit.trim().length === 0) {
    return createValidationError(
      'INVALID_UNIT',
      'Unit is required and cannot be empty',
      'unit'
    );
  }
  return null;
}

/**
 * Validate defaultPrice field
 * @param defaultPrice - Default price in yen to validate
 * @returns UnitPriceValidationError if invalid, null if valid
 */
export function validateDefaultPrice(
  defaultPrice: number
): UnitPriceValidationError | null {
  if (!Number.isInteger(defaultPrice)) {
    return createValidationError(
      'INVALID_DEFAULT_PRICE',
      'Default price must be an integer',
      'defaultPrice',
      { value: defaultPrice }
    );
  }

  if (defaultPrice < MIN_UNIT_PRICE || defaultPrice > MAX_UNIT_PRICE) {
    return createValidationError(
      'INVALID_DEFAULT_PRICE',
      `Default price must be between ${MIN_UNIT_PRICE} and ${MAX_UNIT_PRICE}`,
      'defaultPrice',
      { value: defaultPrice, min: MIN_UNIT_PRICE, max: MAX_UNIT_PRICE }
    );
  }

  return null;
}

/**
 * Validate defaultTaxRate field
 * @param defaultTaxRate - Default tax rate to validate
 * @returns UnitPriceValidationError if invalid, null if valid
 */
export function validateDefaultTaxRate(
  defaultTaxRate: number
): UnitPriceValidationError | null {
  if (defaultTaxRate !== 0 && defaultTaxRate !== 10) {
    return createValidationError(
      'INVALID_DEFAULT_TAX_RATE',
      'Default tax rate must be 0 or 10',
      'defaultTaxRate',
      { value: defaultTaxRate, allowed: [0, 10] }
    );
  }
  return null;
}

/**
 * Validate packQty field (optional)
 * @param packQty - Pack quantity to validate
 * @returns UnitPriceValidationError if invalid, null if valid or not provided
 */
export function validatePackQty(
  packQty: number | null | undefined
): UnitPriceValidationError | null {
  // Optional field - null or undefined is valid
  if (packQty === null || packQty === undefined) {
    return null;
  }

  if (!Number.isInteger(packQty) || packQty < 1) {
    return createValidationError(
      'INVALID_PACK_QTY',
      'Pack quantity must be a positive integer (1 or greater)',
      'packQty',
      { value: packQty }
    );
  }

  return null;
}

/**
 * Validate packPrice field (optional)
 * @param packPrice - Pack price to validate
 * @returns UnitPriceValidationError if invalid, null if valid or not provided
 */
export function validatePackPrice(
  packPrice: number | null | undefined
): UnitPriceValidationError | null {
  // Optional field - null or undefined is valid
  if (packPrice === null || packPrice === undefined) {
    return null;
  }

  if (!Number.isInteger(packPrice)) {
    return createValidationError(
      'INVALID_PACK_PRICE',
      'Pack price must be an integer',
      'packPrice',
      { value: packPrice }
    );
  }

  if (packPrice < MIN_UNIT_PRICE || packPrice > MAX_UNIT_PRICE) {
    return createValidationError(
      'INVALID_PACK_PRICE',
      `Pack price must be between ${MIN_UNIT_PRICE} and ${MAX_UNIT_PRICE}`,
      'packPrice',
      { value: packPrice, min: MIN_UNIT_PRICE, max: MAX_UNIT_PRICE }
    );
  }

  return null;
}

/**
 * Validate a complete UnitPrice object
 * @param unitPrice - UnitPrice or UnitPriceInput to validate
 * @returns Array of UnitPriceValidationErrors (empty if valid)
 */
export function validateUnitPrice(
  unitPrice: UnitPrice | UnitPriceInput
): UnitPriceValidationError[] {
  const errors: UnitPriceValidationError[] = [];

  const nameError = validateName(unitPrice.name);
  if (nameError) errors.push(nameError);

  const unitError = validateUnit(unitPrice.unit);
  if (unitError) errors.push(unitError);

  const priceError = validateDefaultPrice(unitPrice.defaultPrice);
  if (priceError) errors.push(priceError);

  const taxRateError = validateDefaultTaxRate(unitPrice.defaultTaxRate);
  if (taxRateError) errors.push(taxRateError);

  // Validate optional pack fields
  const packQtyError = validatePackQty(unitPrice.packQty);
  if (packQtyError) errors.push(packQtyError);

  const packPriceError = validatePackPrice(unitPrice.packPrice);
  if (packPriceError) errors.push(packPriceError);

  // Validate pack consistency: both must be set or both must be null/undefined
  const packConsistencyError = validatePackConsistency(
    unitPrice.packQty,
    unitPrice.packPrice
  );
  if (packConsistencyError) errors.push(packConsistencyError);

  return errors;
}

/**
 * Validate pack consistency: both packQty and packPrice must be set together or both null
 * @param packQty - Pack quantity
 * @param packPrice - Pack price
 * @returns UnitPriceValidationError if inconsistent, null if valid
 */
export function validatePackConsistency(
  packQty: number | null | undefined,
  packPrice: number | null | undefined
): UnitPriceValidationError | null {
  const hasQty = packQty !== null && packQty !== undefined;
  const hasPrice = packPrice !== null && packPrice !== undefined;

  // Both set or both unset is valid
  if (hasQty === hasPrice) {
    return null;
  }

  // One set, one unset is invalid
  return createValidationError(
    'INVALID_PACK_CONSISTENCY',
    'Pack quantity and pack price must both be set or both be null',
    'packQty',
    { packQty, packPrice }
  );
}

/**
 * Normalize optional string fields (empty string -> null)
 * @param value - String value to normalize
 * @returns null if empty/whitespace only, trimmed string otherwise
 */
export function normalizeOptionalString(
  value: string | null | undefined
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
}
