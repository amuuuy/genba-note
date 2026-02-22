/**
 * Monitoring Service Types
 *
 * Error types and result types for the Sentry crash reporting service.
 */

/**
 * Error codes for Sentry service
 */
export type SentryErrorCode = 'SENTRY_NOT_CONFIGURED' | 'SENTRY_INIT_FAILED';

/**
 * Sentry service error
 */
export interface SentryServiceError {
  code: SentryErrorCode;
  message: string;
  originalError?: Error;
}

/**
 * Generic result type for Sentry service operations
 */
export interface SentryResult<T> {
  success: boolean;
  data?: T;
  error?: SentryServiceError;
}

/**
 * Create a success result
 */
export function successResult<T>(data: T): SentryResult<T> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function errorResult<T>(error: SentryServiceError): SentryResult<T> {
  return { success: false, error };
}

/**
 * Create a Sentry service error
 */
export function createSentryError(
  code: SentryErrorCode,
  message: string,
  originalError?: Error
): SentryServiceError {
  return { code, message, originalError };
}
