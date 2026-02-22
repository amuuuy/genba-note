/**
 * Sentry Service
 *
 * Wraps @sentry/react-native SDK for crash reporting.
 * Provides a thin, testable layer over Sentry's API with
 * graceful degradation when Sentry is unavailable.
 */

import type React from 'react';
import * as Sentry from '@sentry/react-native';
import type { SentryResult } from './types';
import { successResult, errorResult, createSentryError } from './types';

let _initialized = false;

/**
 * Initialize Sentry SDK
 *
 * Must be called at app startup before any other Sentry operations.
 * Idempotent — calling multiple times after success is a no-op.
 *
 * @param dsn - Sentry Data Source Name
 * @returns SentryResult indicating success or failure
 */
export function initializeSentry(dsn: string): SentryResult<void> {
  if (_initialized) {
    return successResult(undefined);
  }

  if (!dsn) {
    return errorResult(
      createSentryError('SENTRY_NOT_CONFIGURED', 'Sentry DSN is empty')
    );
  }

  try {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.2,
      sendDefaultPii: false,
      beforeSend(event) {
        // Strip user IP addresses that Sentry may auto-collect
        if (event.user) {
          delete event.user.ip_address;
        }
        return event;
      },
    });
    _initialized = true;
    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createSentryError(
        'SENTRY_INIT_FAILED',
        'Failed to initialize Sentry SDK',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Check if Sentry has been initialized successfully
 */
export function isSentryInitialized(): boolean {
  return _initialized;
}

/**
 * Capture an exception and send to Sentry
 *
 * No-op if Sentry is not initialized. Never throws.
 *
 * @param error - The error to capture
 * @param context - Optional extra data to attach to the event
 */
export function captureException(
  error: Error,
  context?: Record<string, string>
): void {
  if (!_initialized) return;

  try {
    if (context) {
      Sentry.withScope((scope) => {
        for (const [key, value] of Object.entries(context)) {
          scope.setExtra(key, value);
        }
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  } catch {
    // Sentry itself failed — swallow to avoid cascading errors
  }
}

/**
 * Capture a message and send to Sentry
 *
 * No-op if Sentry is not initialized. Never throws.
 *
 * @param message - The message to capture
 * @param level - Severity level (defaults to 'error')
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'error'
): void {
  if (!_initialized) return;

  try {
    Sentry.captureMessage(message, level);
  } catch {
    // Sentry itself failed — swallow
  }
}

/**
 * Wrap the root React component with Sentry's error tracking HOC.
 *
 * Pass-through if Sentry is not initialized.
 *
 * @param component - The root component to wrap
 * @returns Wrapped component (or original if Sentry unavailable)
 */
export function wrapRootComponent(
  component: React.ComponentType<Record<string, unknown>>
): React.ComponentType<Record<string, unknown>> {
  if (!_initialized) return component;
  return Sentry.wrap(component);
}

/**
 * Reset internal state for testing only
 * @internal
 */
export function _resetForTesting(): void {
  _initialized = false;
}
