/**
 * ReadOnlyBanner Configuration
 *
 * Configuration for the read-only mode banner display.
 * Uses READ_ONLY_MODE_MESSAGES from constants as single source of truth.
 * Extracted as pure function for testability.
 */

import { READ_ONLY_MODE_MESSAGES } from '@/constants/errorMessages';

/**
 * Configuration interface for the ReadOnlyBanner component
 */
export interface ReadOnlyBannerConfig {
  /** Banner title */
  title: string;
  /** Default message when no custom message provided */
  defaultMessage: string;
  /** Optional custom message (e.g., migration error details) */
  customMessage?: string;
  /** Retry button text */
  retryButtonText: string;
  /** Text shown during retry */
  retryingText: string;
  /** Banner background color */
  backgroundColor: string;
  /** Banner border color */
  borderColor: string;
  /** Text color */
  textColor: string;
  /** Icon color */
  iconColor: string;
  /** Message shown on successful retry */
  retrySuccessMessage: string;
  /** Message shown on failed retry */
  retryFailureMessage: string;
}

// Warning color scheme (amber/yellow)
const BANNER_COLORS = {
  backgroundColor: '#FFF3CD',
  borderColor: '#FFCA28',
  textColor: '#856404',
  iconColor: '#FF9800',
} as const;

/**
 * Get configuration for the read-only banner
 * @param customMessage - Optional custom error message to display
 * @returns Banner configuration object
 */
export function getReadOnlyBannerConfig(customMessage?: string): ReadOnlyBannerConfig {
  return {
    // Text content from single source (constants/errorMessages.ts)
    title: READ_ONLY_MODE_MESSAGES.BANNER_TITLE,
    defaultMessage: READ_ONLY_MODE_MESSAGES.BANNER_MESSAGE,
    customMessage,
    retryButtonText: READ_ONLY_MODE_MESSAGES.RETRY_BUTTON,
    retryingText: '復旧中...',
    retrySuccessMessage: READ_ONLY_MODE_MESSAGES.RETRY_SUCCESS,
    retryFailureMessage: READ_ONLY_MODE_MESSAGES.RETRY_FAILURE,

    // Colors
    ...BANNER_COLORS,
  };
}
