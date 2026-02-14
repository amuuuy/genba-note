/**
 * Uptime Service
 *
 * Abstraction layer for device/app uptime to enable testing.
 * Uses performance.now() (monotonic clock) for uptime measurement.
 *
 * SPEC 2.8.4: Device uptime (monotonic, non-decreasing counter) is used
 * as primary verification method for offline Pro validation.
 *
 * SECURITY: Uses performance.now() instead of Date.now() because:
 * - performance.now() is monotonic (cannot go backwards)
 * - Date.now() is wall-clock time (user can manipulate system clock)
 * - In React Native, performance.now() returns ms since JS context creation
 *   (approximately app startup), making it ideal for uptime measurement.
 */

import type { UptimeResult } from './types';

// Internal state for test override
let uptimeOverrideMs: number | null = null;

/**
 * Get current app uptime in milliseconds (time since app started)
 *
 * Uses performance.now() which is a monotonic clock that cannot be
 * manipulated by changing the system time.
 *
 * This value:
 * - Increases monotonically during an app session
 * - Resets to 0 when app restarts (including device reboot)
 *
 * @returns UptimeResult with uptime value or error
 */
export async function getDeviceUptime(): Promise<UptimeResult> {
  // Check for test override first
  if (uptimeOverrideMs !== null) {
    return {
      success: true,
      uptimeMs: uptimeOverrideMs,
    };
  }

  try {
    // performance.now() returns ms since JS context creation (monotonic, non-decreasing)
    const uptimeMs = performance.now();

    return {
      success: true,
      uptimeMs,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UPTIME_READ_ERROR',
        message: error instanceof Error ? error.message : 'Failed to read app uptime',
      },
    };
  }
}

/**
 * Override uptime for testing
 *
 * SECURITY: This function is only available in test environment (NODE_ENV === 'test').
 * In production, it silently does nothing to prevent Pro gate bypass.
 *
 * @param uptimeMs - Uptime to return in milliseconds, or null to reset
 */
export function setUptimeOverride(uptimeMs: number | null): void {
  // Only allow override in test environment
  if (process.env.NODE_ENV !== 'test') {
    return;
  }
  uptimeOverrideMs = uptimeMs;
}

/**
 * Reset uptime override to use real DeviceInfo
 *
 * SECURITY: This function is only available in test environment (NODE_ENV === 'test').
 * In production, it silently does nothing to prevent Pro gate bypass.
 */
export function resetUptimeOverride(): void {
  // Only allow override in test environment
  if (process.env.NODE_ENV !== 'test') {
    return;
  }
  uptimeOverrideMs = null;
}
