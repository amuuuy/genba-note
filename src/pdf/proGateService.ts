/**
 * Pro Gate Service (Placeholder)
 *
 * Provides a placeholder implementation for Pro feature checking.
 * This will be replaced with RevenueCat integration in Milestone 12.
 *
 * For now, this always returns isPro: false, but can be overridden for testing.
 */

import type { ProGateResult, ProGateReason } from './types';

// Internal state for test override
let proStatusOverride: boolean | null = null;

/**
 * Check if Pro features are allowed (placeholder)
 *
 * Default behavior: Always returns isPro: false
 * Can be overridden with setProStatusOverride() for testing
 *
 * @returns ProGateResult with isPro status and reason
 */
export function checkProStatus(): ProGateResult {
  if (proStatusOverride !== null) {
    return {
      isPro: proStatusOverride,
      reason: proStatusOverride ? 'placeholder_always_true' : 'placeholder_always_false',
    };
  }

  // Default: Not Pro
  return {
    isPro: false,
    reason: 'placeholder_always_false',
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
