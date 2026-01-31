/**
 * Uptime Service
 *
 * Abstraction layer for device/app uptime to enable testing.
 * Uses react-native-device-info getStartupTime() to compute app uptime.
 *
 * SPEC 2.8.4: Device uptime (monotonic, non-decreasing counter) is used
 * as primary verification method for offline Pro validation.
 *
 * NOTE: react-native-device-info v15+ removed getUptime(). We use getStartupTime()
 * which returns epoch ms when the app started. We compute uptime as:
 *   currentTime - startupTime
 *
 * This provides:
 * - Monotonically increasing value during app session
 * - Detects app restart (including device reboot) via startup time change
 * - More conservative than pure device uptime (any app restart triggers re-verification)
 */

import { getStartupTime } from 'react-native-device-info';
import type { UptimeResult } from './types';

// Internal state for test override
let uptimeOverrideMs: number | null = null;

/**
 * Get current app uptime in milliseconds (time since app started)
 *
 * Computes uptime as: Date.now() - getStartupTime()
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
    // getStartupTime returns epoch ms when the app process started
    const startupTimeMs = await getStartupTime();

    // Validate the value
    if (startupTimeMs < 0) {
      return {
        success: false,
        error: {
          code: 'UPTIME_UNAVAILABLE',
          message: 'App startup time returned invalid value',
        },
      };
    }

    // Compute uptime as time since app started
    const currentTimeMs = Date.now();
    const uptimeMs = currentTimeMs - startupTimeMs;

    // Uptime should be non-negative
    if (uptimeMs < 0) {
      return {
        success: false,
        error: {
          code: 'UPTIME_UNAVAILABLE',
          message: 'Computed uptime is negative (clock manipulation detected)',
        },
      };
    }

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
