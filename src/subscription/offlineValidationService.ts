/**
 * Offline Validation Service
 *
 * Implements the 4-value offline Pro validation per SPEC 2.8.4-2.8.11.
 * This is a pure validation service - it reads cache but does not write.
 *
 * Pro allowed only when ALL 4 conditions are met:
 * 1. entitlement_active === true
 * 2. entitlement_expiration === null OR > currentTime (0 = inactive = FAIL)
 * 3. currentUptime >= last_verified_uptime AND elapsed <= 7 days
 * 4. currentTime >= last_verified_at AND elapsed <= 7 days
 */

import type { SubscriptionCache, ProValidationResult } from '@/types/subscription';
import { GRACE_PERIOD_MS } from '@/types/subscription';

/**
 * Input for offline Pro validation
 */
export interface ValidationInput {
  /** Cached subscription data (may be null if not available) */
  cache: SubscriptionCache | null;
  /** Current wall clock time (Date.now()) */
  currentTime: number;
  /** Current app uptime (from uptimeService) */
  currentUptime: number;
}

/**
 * Check if cache values are valid (non-null, proper types)
 *
 * @param cache - Cache to validate
 * @returns true if cache structure is valid
 */
export function isCacheValid(cache: SubscriptionCache | null): cache is SubscriptionCache {
  if (cache === null) {
    return false;
  }

  // Check required fields exist and have correct types
  if (typeof cache.entitlementActive !== 'boolean') {
    return false;
  }

  // entitlementExpiration can be number (including 0) or null (lifetime)
  if (cache.entitlementExpiration !== null) {
    if (typeof cache.entitlementExpiration !== 'number' || !Number.isFinite(cache.entitlementExpiration)) {
      return false;
    }
  }

  // lastVerifiedAt must be a finite number
  if (typeof cache.lastVerifiedAt !== 'number' || !Number.isFinite(cache.lastVerifiedAt)) {
    return false;
  }

  // lastVerifiedUptime must be a finite non-negative number
  if (
    typeof cache.lastVerifiedUptime !== 'number' ||
    !Number.isFinite(cache.lastVerifiedUptime) ||
    cache.lastVerifiedUptime < 0
  ) {
    return false;
  }

  return true;
}

/**
 * Validate Pro status offline using cached 4-value data
 *
 * Implements SPEC 2.8.9 Final Offline Pro Permission Formula:
 *
 * Condition 1: entitlement_active === true
 * Condition 2: entitlement_expiration === null OR > currentTime
 *              (0 = explicitly inactive = FAIL)
 * Condition 3: currentUptime >= last_verified_uptime AND elapsed <= 7 days
 * Condition 4: currentTime >= last_verified_at AND elapsed <= 7 days
 *
 * @param input - Validation input with cache and current values
 * @returns ProValidationResult with decision and reason
 */
export function validateProOffline(input: ValidationInput): ProValidationResult {
  const { cache, currentTime, currentUptime } = input;

  // Check cache existence
  if (cache === null) {
    return {
      isProAllowed: false,
      reason: 'cache_missing',
      requiresOnlineVerification: true,
    };
  }

  // Check cache validity
  if (!isCacheValid(cache)) {
    return {
      isProAllowed: false,
      reason: 'cache_invalid',
      requiresOnlineVerification: true,
    };
  }

  // Condition 1: entitlement_active === true
  if (!cache.entitlementActive) {
    return {
      isProAllowed: false,
      reason: 'entitlement_inactive',
      requiresOnlineVerification: true,
    };
  }

  // Condition 2: entitlement_expiration === null OR > currentTime
  // IMPORTANT: 0 means explicitly inactive (not lifetime), so it fails
  if (cache.entitlementExpiration !== null) {
    if (cache.entitlementExpiration === 0 || cache.entitlementExpiration <= currentTime) {
      return {
        isProAllowed: false,
        reason: 'entitlement_expired',
        requiresOnlineVerification: true,
      };
    }
  }
  // null = lifetime, passes condition 2

  // Condition 3: Uptime check
  // performance.now() resets to 0 on app restart, so rollback is expected after restart.
  // Fail-closed: rollback detected → deny Pro and require online re-verification.
  // This prevents offline grace period extension via repeated app restarts.
  if (currentUptime >= cache.lastVerifiedUptime) {
    // Same session: check uptime grace period
    const uptimeElapsed = currentUptime - cache.lastVerifiedUptime;
    if (uptimeElapsed > GRACE_PERIOD_MS) {
      return {
        isProAllowed: false,
        reason: 'grace_period_exceeded',
        requiresOnlineVerification: true,
      };
    }
  } else {
    // Uptime rollback (app restart) detected - fail-closed
    return {
      isProAllowed: false,
      reason: 'uptime_rollback',
      requiresOnlineVerification: true,
    };
  }

  // Condition 4a: Wall clock manipulation detection
  // currentTime >= last_verified_at
  if (currentTime < cache.lastVerifiedAt) {
    return {
      isProAllowed: false,
      reason: 'clock_manipulation',
      requiresOnlineVerification: true,
    };
  }

  // Condition 4b: Wall clock grace period (elapsed <= 7 days)
  const wallClockElapsed = currentTime - cache.lastVerifiedAt;
  if (wallClockElapsed > GRACE_PERIOD_MS) {
    return {
      isProAllowed: false,
      reason: 'grace_period_exceeded',
      requiresOnlineVerification: true,
    };
  }

  // All conditions passed - same session, within grace period
  return {
    isProAllowed: true,
    reason: 'offline_grace_period',
    requiresOnlineVerification: false,
  };
}
