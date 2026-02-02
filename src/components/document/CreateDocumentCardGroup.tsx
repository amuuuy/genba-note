/**
 * CreateDocumentCardGroup Component
 *
 * Container component that displays two document creation cards
 * side by side (estimate and invoice).
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { CreateDocumentCard } from './CreateDocumentCard';

/** Primary blue color for estimate card */
const ESTIMATE_COLOR = '#007AFF';

/** Secondary orange color for invoice card */
const INVOICE_COLOR = '#FF9500';

export interface CreateDocumentCardGroupProps {
  /** Callback when estimate card is pressed */
  onCreateEstimate: () => void;
  /** Callback when invoice card is pressed */
  onCreateInvoice: () => void;
  /** Whether the cards are disabled (e.g., read-only mode) */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Horizontal layout container for document creation cards
 */
export const CreateDocumentCardGroup: React.FC<CreateDocumentCardGroupProps> =
  memo(({ onCreateEstimate, onCreateInvoice, disabled = false, testID }) => {
    return (
      <View style={styles.container} testID={testID}>
        <CreateDocumentCard
          type="estimate"
          title="見積書作成"
          icon="document-text-outline"
          backgroundColor={ESTIMATE_COLOR}
          onPress={onCreateEstimate}
          disabled={disabled}
          testID="create-estimate-card"
        />
        <CreateDocumentCard
          type="invoice"
          title="請求書作成"
          icon="receipt-outline"
          backgroundColor={INVOICE_COLOR}
          onPress={onCreateInvoice}
          disabled={disabled}
          testID="create-invoice-card"
        />
      </View>
    );
  });

CreateDocumentCardGroup.displayName = 'CreateDocumentCardGroup';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});
