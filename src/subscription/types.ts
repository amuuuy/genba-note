/**
 * Subscription Service Types
 *
 * Error types and result types for subscription-related services.
 */

// === Uptime Service Types ===

/**
 * Error codes for uptime service
 */
export type UptimeErrorCode = 'UPTIME_UNAVAILABLE' | 'UPTIME_READ_ERROR';

/**
 * Uptime service error
 */
export interface UptimeError {
  code: UptimeErrorCode;
  message: string;
}

/**
 * Result of uptime retrieval
 */
export interface UptimeResult {
  success: boolean;
  uptimeMs?: number;
  error?: UptimeError;
}

// === Subscription Service Types ===

/**
 * Error codes for subscription service
 */
export type SubscriptionServiceErrorCode =
  | 'RC_NOT_CONFIGURED'
  | 'RC_FETCH_ERROR'
  | 'RC_RESTORE_ERROR'
  | 'CACHE_WRITE_ERROR'
  | 'CACHE_READ_ERROR'
  | 'UPTIME_ERROR'
  | 'NETWORK_ERROR';

/**
 * Subscription service error
 */
export interface SubscriptionServiceError {
  code: SubscriptionServiceErrorCode;
  message: string;
  originalError?: Error;
}

/**
 * Generic result type for subscription service operations
 */
export interface SubscriptionResult<T> {
  success: boolean;
  data?: T;
  error?: SubscriptionServiceError;
}

/**
 * Result of online verification with RevenueCat
 */
export interface VerificationResult {
  /** Whether Pro entitlement is active */
  isProActive: boolean;
  /** Expiration timestamp (null = lifetime, 0 = inactive) */
  expirationDate: number | null;
  /** Server time from RevenueCat (epoch ms) */
  serverTime: number;
}

// === Helper Functions ===

/**
 * Create a success result
 */
export function successResult<T>(data: T): SubscriptionResult<T> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function errorResult<T>(error: SubscriptionServiceError): SubscriptionResult<T> {
  return { success: false, error };
}

/**
 * Create a subscription service error
 */
export function createSubscriptionError(
  code: SubscriptionServiceErrorCode,
  message: string,
  originalError?: Error
): SubscriptionServiceError {
  return { code, message, originalError };
}
