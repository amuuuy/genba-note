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
  | 'NETWORK_ERROR'
  | 'INVALID_SERVER_TIME';

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

// === Pro Access Types ===

/**
 * Reason codes for Pro status check
 *
 * Aligned with ProValidationResult.reason from subscription types.
 */
export type ProGateReason =
  // Success reasons
  | 'online_verified'
  | 'offline_grace_period'
  | 'development_mode'
  // Failure reasons (from offlineValidationService)
  | 'cache_missing'
  | 'cache_invalid'
  | 'entitlement_inactive'
  | 'entitlement_expired'
  | 'uptime_rollback'
  | 'grace_period_exceeded'
  | 'clock_manipulation'
  // Test-only: used by proStatusOverride in proAccessService.ts for development/testing.
  // These values are NOT used in production code paths.
  | 'placeholder_always_false'
  | 'placeholder_always_true';

/**
 * Result of Pro status check
 */
export interface ProGateResult {
  /** Whether Pro features are allowed */
  isPro: boolean;

  /** Reason for the result */
  reason: ProGateReason;
}
