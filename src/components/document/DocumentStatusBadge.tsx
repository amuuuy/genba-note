/**
 * DocumentStatusBadge Component
 *
 * Displays a color-coded badge for document status:
 * - draft (下書き): gray
 * - sent (送付済): orange
 * - paid (入金済): green
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { DocumentStatus } from '../../types';
import { getStatusConfig } from './statusConfig';

// Re-export for convenience
export { getStatusConfig } from './statusConfig';
export type { StatusConfig } from './statusConfig';

export interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  /** Optional test ID for testing */
  testID?: string;
}

/**
 * Status badge component for documents
 */
export const DocumentStatusBadge: React.FC<DocumentStatusBadgeProps> = React.memo(
  ({ status, testID }) => {
    const config = getStatusConfig(status);

    return (
      <View
        style={[styles.badge, { backgroundColor: config.backgroundColor }]}
        testID={testID}
        accessibilityRole="text"
        accessibilityLabel={`ステータス: ${config.label}`}
      >
        <Text style={[styles.label, { color: config.textColor }]}>
          {config.label}
        </Text>
      </View>
    );
  }
);

DocumentStatusBadge.displayName = 'DocumentStatusBadge';

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
