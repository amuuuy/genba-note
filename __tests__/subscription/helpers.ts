/**
 * Test Helpers for Subscription Tests
 *
 * Factory functions for creating test data.
 */

import type { SubscriptionCache } from '@/types/subscription';
import { GRACE_PERIOD_MS } from '@/types/subscription';

/**
 * Create a valid subscription cache for testing
 */
export function createValidCache(overrides?: Partial<SubscriptionCache>): SubscriptionCache {
  const now = Date.now();
  const uptime = 1000000; // 1000 seconds

  return {
    entitlementActive: true,
    entitlementExpiration: now + 30 * 24 * 60 * 60 * 1000, // 30 days from now
    lastVerifiedAt: now - 1000, // 1 second ago
    lastVerifiedUptime: uptime - 1000, // 1 second ago in uptime
    ...overrides,
  };
}

/**
 * Create a cache for lifetime subscription
 */
export function createLifetimeCache(overrides?: Partial<SubscriptionCache>): SubscriptionCache {
  return createValidCache({
    entitlementExpiration: null, // null = lifetime
    ...overrides,
  });
}

/**
 * Create a cache that represents an inactive subscription
 */
export function createInactiveCache(overrides?: Partial<SubscriptionCache>): SubscriptionCache {
  return createValidCache({
    entitlementActive: false,
    entitlementExpiration: 0, // 0 = explicitly inactive
    ...overrides,
  });
}

/**
 * Create a cache with expired subscription
 */
export function createExpiredCache(overrides?: Partial<SubscriptionCache>): SubscriptionCache {
  const now = Date.now();
  return createValidCache({
    entitlementExpiration: now - 1000, // expired 1 second ago
    ...overrides,
  });
}

/**
 * Create a cache that has exceeded grace period
 */
export function createGracePeriodExpiredCache(overrides?: Partial<SubscriptionCache>): SubscriptionCache {
  const now = Date.now();
  const uptime = 1000000000; // 1000000 seconds
  const eightDaysMs = 8 * 24 * 60 * 60 * 1000;

  return createValidCache({
    lastVerifiedAt: now - eightDaysMs, // 8 days ago
    lastVerifiedUptime: uptime - eightDaysMs, // 8 days ago in uptime
    ...overrides,
  });
}

/**
 * Create test validation input
 */
export function createValidationInput(
  cache: SubscriptionCache | null,
  currentTime?: number,
  currentUptime?: number
) {
  return {
    cache,
    currentTime: currentTime ?? Date.now(),
    currentUptime: currentUptime ?? 1000000, // default 1000 seconds
  };
}

export { GRACE_PERIOD_MS };
