/**
 * Status Configuration
 *
 * Pure functions for document status display configuration.
 * Separated from React component to enable unit testing without React Native.
 */

import type { DocumentStatus } from '../../types';

/**
 * Status configuration for display
 */
export interface StatusConfig {
  label: string;
  textColor: string;
  backgroundColor: string;
}

/**
 * Default/fallback status configuration for unknown statuses
 */
const DEFAULT_STATUS_CONFIG: StatusConfig = {
  label: '不明',
  textColor: '#666666',
  backgroundColor: '#E5E5EA',
};

/**
 * Get display configuration for a document status
 * Returns a default config for unknown status values to prevent runtime errors
 */
export function getStatusConfig(status: DocumentStatus): StatusConfig {
  switch (status) {
    case 'draft':
      return {
        label: '下書き',
        textColor: '#666666',
        backgroundColor: '#E5E5EA',
      };
    case 'sent':
      return {
        label: '送付済',
        textColor: '#FF9500',
        backgroundColor: '#FFF3E0',
      };
    case 'paid':
      return {
        label: '入金済',
        textColor: '#34C759',
        backgroundColor: '#E8F5E9',
      };
    case 'issued':
      return {
        label: '発行済',
        textColor: '#007AFF',
        backgroundColor: '#E3F2FD',
      };
    default:
      // Exhaustive check - if TypeScript catches this, a new status was added
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _exhaustiveCheck: never = status;
      return DEFAULT_STATUS_CONFIG;
  }
}
