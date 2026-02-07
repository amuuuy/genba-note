/**
 * Customer Domain Types
 *
 * Domain-specific types for customer operations
 */

/**
 * Customer service error codes
 */
export type CustomerServiceErrorCode =
  | 'VALIDATION_ERROR'
  | 'CUSTOMER_NOT_FOUND'
  | 'STORAGE_ERROR'
  | 'DUPLICATE_NAME'
  | 'PHOTO_COUNT_LIMIT_EXCEEDED'
  | 'PHOTO_SIZE_LIMIT_EXCEEDED'
  | 'FILE_NOT_FOUND'
  | 'DUPLICATE_WORK_DATE'
  | 'WORK_LOG_ENTRY_NOT_FOUND'
  | 'READONLY_MODE';

/**
 * Customer service error
 */
export interface CustomerServiceError {
  code: CustomerServiceErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Domain result type for customer operations
 */
export interface CustomerDomainResult<T> {
  success: boolean;
  data?: T;
  error?: CustomerServiceError;
}

/**
 * Create a success result
 */
export function successResult<T>(data: T): CustomerDomainResult<T> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function errorResult<T>(error: CustomerServiceError): CustomerDomainResult<T> {
  return { success: false, error };
}

/**
 * Create a customer service error
 */
export function createCustomerServiceError(
  code: CustomerServiceErrorCode,
  message: string,
  details?: Record<string, unknown>
): CustomerServiceError {
  return { code, message, details };
}
