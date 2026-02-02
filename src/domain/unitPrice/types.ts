/**
 * Domain Error Types for UnitPrice Management
 *
 * This module defines error types and Result patterns for the unitPrice domain.
 * Follows the same pattern as document/types.ts for consistency.
 */

// === UnitPrice Validation Error Codes ===

export type UnitPriceValidationErrorCode =
  | 'INVALID_NAME' // name is empty or whitespace only
  | 'INVALID_UNIT' // unit is empty or whitespace only
  | 'INVALID_DEFAULT_PRICE' // defaultPrice out of range
  | 'INVALID_DEFAULT_TAX_RATE' // defaultTaxRate not 0 or 10
  | 'INVALID_PACK_QTY' // packQty is not a positive integer
  | 'INVALID_PACK_PRICE' // packPrice is out of range or not an integer
  | 'INVALID_PACK_CONSISTENCY'; // packQty and packPrice must both be set or both be null

// === UnitPrice Service Error Codes ===

export type UnitPriceServiceErrorCode =
  | 'UNIT_PRICE_NOT_FOUND' // unit price with given ID not found
  | 'STORAGE_ERROR' // storage operation failed
  | 'VALIDATION_ERROR'; // validation failed

// === Error Interfaces ===

export interface UnitPriceValidationError {
  code: UnitPriceValidationErrorCode;
  message: string;
  field?: string;
  details?: unknown;
}

export interface UnitPriceServiceError {
  code: UnitPriceServiceErrorCode;
  message: string;
  originalError?: Error;
  validationErrors?: UnitPriceValidationError[];
}

// === Result Type ===

/**
 * Generic result type for unitPrice domain operations.
 * Success case contains data, error case contains error.
 */
export interface UnitPriceResult<T, E = UnitPriceServiceError> {
  success: boolean;
  data?: T;
  error?: E;
}

// === Result Helper Functions ===

/**
 * Create a successful result with data
 */
export function successResult<T>(data: T): UnitPriceResult<T, never> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function errorResult<E>(error: E): UnitPriceResult<never, E> {
  return { success: false, error };
}

/**
 * Create a validation error object
 */
export function createValidationError(
  code: UnitPriceValidationErrorCode,
  message: string,
  field?: string,
  details?: unknown
): UnitPriceValidationError {
  return { code, message, field, details };
}

/**
 * Create a unit price service error object
 */
export function createServiceError(
  code: UnitPriceServiceErrorCode,
  message: string,
  options?: {
    originalError?: Error;
    validationErrors?: UnitPriceValidationError[];
  }
): UnitPriceServiceError {
  return {
    code,
    message,
    ...options,
  };
}
