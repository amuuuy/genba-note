/**
 * Domain Error Types for Document Management
 *
 * This module defines error types and Result patterns for the document domain.
 * All domain services use these types for consistent error handling.
 */

import type { DocumentStatus } from '@/types/document';

// === Validation Error Codes ===

export type ValidationErrorCode =
  | 'INVALID_CLIENT_NAME' // clientName is empty or whitespace only
  | 'INVALID_ISSUE_DATE' // issueDate format invalid
  | 'INVALID_VALID_UNTIL' // validUntil < issueDate or invalid format
  | 'INVALID_DUE_DATE' // dueDate < issueDate or invalid format
  | 'INVALID_PAID_AT' // paidAt constraint violation
  | 'INVALID_LINE_ITEMS' // lineItems empty or exceeds limit
  | 'INVALID_LINE_ITEM' // individual lineItem validation error
  | 'INVALID_QUANTITY' // quantityMilli out of range
  | 'INVALID_UNIT_PRICE' // unitPrice out of range
  | 'INVALID_UNIT' // unit is empty or whitespace only
  | 'INVALID_TOTAL' // total amount exceeds limit
  | 'PAID_AT_REQUIRED' // status=paid but paidAt is null
  | 'PAID_AT_FORBIDDEN' // status!=paid but paidAt is set
  | 'PAID_AT_FUTURE' // paidAt is a future date
  | 'PAID_AT_BEFORE_ISSUE' // paidAt < issueDate
  | 'CALCULATION_OVERFLOW' // quantityMilli * unitPrice exceeds safe integer
  | 'TYPE_FIELD_MISMATCH' // field not allowed for document type (e.g., dueDate on estimate)
  | 'EDIT_NOT_ALLOWED' // editing forbidden field in current status
  | 'INVALID_CARRIED_FORWARD'; // carriedForwardAmount is negative, non-integer, or exceeds limit

// === Status Transition Error Codes ===

export type StatusTransitionErrorCode =
  | 'INVALID_TRANSITION' // transition not allowed
  | 'ESTIMATE_CANNOT_BE_PAID' // estimate type cannot have paid status
  | 'DIRECT_DRAFT_TO_PAID'; // draft -> paid is forbidden

// === Numbering Error Codes ===

export type NumberingErrorCode =
  | 'SETTINGS_READ_ERROR' // failed to read settings
  | 'SETTINGS_WRITE_ERROR' // failed to write settings
  | 'INVALID_PREFIX'; // prefix does not match pattern

// === Document Service Error Codes ===

export type DocumentServiceErrorCode =
  | 'DOCUMENT_NOT_FOUND' // document with given ID not found
  | 'STORAGE_ERROR' // storage operation failed
  | 'VALIDATION_ERROR' // validation failed
  | 'TRANSITION_ERROR' // status transition failed
  | 'NUMBERING_ERROR' // numbering failed
  | 'EDIT_FORBIDDEN' // editing forbidden field in paid status
  | 'SNAPSHOT_ERROR' // issuer snapshot operation failed
  | 'FREE_TIER_LIMIT_EXCEEDED'; // free tier document creation limit reached

// === Error Interfaces ===

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  field?: string; // field name that caused the error
  details?: unknown; // additional context
}

export interface StatusTransitionError {
  code: StatusTransitionErrorCode;
  message: string;
  fromStatus: DocumentStatus;
  toStatus: DocumentStatus;
}

export interface NumberingError {
  code: NumberingErrorCode;
  message: string;
  originalError?: Error;
}

export interface DocumentServiceError {
  code: DocumentServiceErrorCode;
  message: string;
  originalError?: Error;
  validationErrors?: ValidationError[];
  transitionError?: StatusTransitionError;
}

// === Result Type ===

/**
 * Generic result type for domain operations.
 * Success case contains data, error case contains error.
 */
export interface DomainResult<T, E = DocumentServiceError> {
  success: boolean;
  data?: T;
  error?: E;
}

// === Result Helper Functions ===

/**
 * Create a successful result with data
 */
export function successResult<T>(data: T): DomainResult<T, never> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function errorResult<E>(error: E): DomainResult<never, E> {
  return { success: false, error };
}

/**
 * Create a validation error object
 */
export function createValidationError(
  code: ValidationErrorCode,
  message: string,
  field?: string,
  details?: unknown
): ValidationError {
  return { code, message, field, details };
}

/**
 * Create a status transition error object
 */
export function createTransitionError(
  code: StatusTransitionErrorCode,
  message: string,
  fromStatus: DocumentStatus,
  toStatus: DocumentStatus
): StatusTransitionError {
  return { code, message, fromStatus, toStatus };
}

/**
 * Create a numbering error object
 */
export function createNumberingError(
  code: NumberingErrorCode,
  message: string,
  originalError?: Error
): NumberingError {
  return { code, message, originalError };
}

/**
 * Create a document service error object
 */
export function createDocumentServiceError(
  code: DocumentServiceErrorCode,
  message: string,
  options?: {
    originalError?: Error;
    validationErrors?: ValidationError[];
    transitionError?: StatusTransitionError;
  }
): DocumentServiceError {
  return {
    code,
    message,
    ...options,
  };
}
