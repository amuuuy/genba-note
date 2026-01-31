/**
 * Subscription status cache stored in expo-secure-store
 *
 * Keys:
 * - entitlement_active: string ('true' | 'false')
 * - entitlement_expiration: string (epoch ms number, '0' for non-subscriber, null string for lifetime)
 * - last_verified_at: string (epoch ms)
 * - last_verified_uptime: string (ms)
 */
export interface SubscriptionCache {
  /** Whether Pro entitlement was active at last verification */
  entitlementActive: boolean;

  /**
   * Entitlement expiration (epoch ms)
   * - number > 0: subscription expiration date
   * - 0: non-subscriber (explicitly inactive)
   * - null: lifetime subscription (no expiration)
   */
  entitlementExpiration: number | null;

  /** Server time at last verification (epoch ms, from RevenueCat request_date) */
  lastVerifiedAt: number;

  /** Device uptime at last verification (ms, from react-native-device-info) */
  lastVerifiedUptime: number;
}

/**
 * Grace period for offline Pro validation (7 days in ms)
 */
export const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Pro validation result
 */
export interface ProValidationResult {
  /** Whether Pro features are allowed */
  isProAllowed: boolean;

  /** Reason for the decision */
  reason:
    | 'online_verified'
    | 'offline_grace_period'
    | 'cache_missing'
    | 'cache_invalid'
    | 'entitlement_inactive'
    | 'entitlement_expired'
    | 'uptime_rollback'
    | 'grace_period_exceeded'
    | 'clock_manipulation';

  /** Whether online re-verification is required */
  requiresOnlineVerification: boolean;
}

/**
 * Secure store keys for subscription data
 */
export const SUBSCRIPTION_STORE_KEYS = {
  ENTITLEMENT_ACTIVE: 'entitlement_active',
  ENTITLEMENT_EXPIRATION: 'entitlement_expiration',
  LAST_VERIFIED_AT: 'last_verified_at',
  LAST_VERIFIED_UPTIME: 'last_verified_uptime',
} as const;
