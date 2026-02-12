/**
 * Pro Access Service
 *
 * Provides Pro feature checking using the subscription service.
 * Integrates with RevenueCat for online verification and supports offline grace period.
 *
 * Test override functionality is maintained for testing purposes.
 */

import type { ProGateResult, ProGateReason } from './types';
import { getProStatus } from './subscriptionService';
import { isDevelopmentMode } from '@/utils/environment';

// Internal state for test override
let proStatusOverride: boolean | null = null;

/**
 * Check if Pro features are allowed
 *
 * Flow:
 * 1. If test override is set, return override status
 * 2. If in development mode (__DEV__ or APP_ENV=development/staging), return Pro=true
 * 3. Otherwise, use subscription service to check Pro status
 *    - Tries online verification first
 *    - Falls back to offline validation with 7-day grace period
 *
 * @returns Promise<ProGateResult> with isPro status and reason
 */
export async function checkProStatus(): Promise<ProGateResult> {
  // Check for test override first
  if (proStatusOverride !== null) {
    return {
      isPro: proStatusOverride,
      reason: proStatusOverride ? 'placeholder_always_true' : 'placeholder_always_false',
    };
  }

  // Development mode bypass
  // SECURITY: isDevelopmentMode() returns false in production builds
  if (isDevelopmentMode()) {
    return {
      isPro: true,
      reason: 'development_mode',
    };
  }

  // Use real subscription service
  const result = await getProStatus();

  return {
    isPro: result.isProAllowed,
    reason: result.reason as ProGateReason,
  };
}

/**
 * Override Pro status for testing
 *
 * SECURITY: This function is only available in test environment (NODE_ENV === 'test').
 * In production, it silently does nothing to prevent Pro gate bypass.
 *
 * @param isPro - true to enable Pro, false to disable, null to reset
 */
export function setProStatusOverride(isPro: boolean | null): void {
  // Only allow override in test environment
  if (process.env.NODE_ENV !== 'test') {
    return;
  }
  proStatusOverride = isPro;
}

/**
 * Reset Pro status override to default behavior
 *
 * SECURITY: This function is only available in test environment (NODE_ENV === 'test').
 * In production, it silently does nothing to prevent Pro gate bypass.
 */
export function resetProStatusOverride(): void {
  // Only allow override in test environment
  if (process.env.NODE_ENV !== 'test') {
    return;
  }
  proStatusOverride = null;
}
