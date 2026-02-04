/**
 * CreateFinanceCardGroup Component
 *
 * Container component that displays two finance creation cards
 * side by side (income and expense).
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { CreateFinanceCard } from './CreateFinanceCard';

export interface CreateFinanceCardGroupProps {
  /** Callback when income card is pressed */
  onCreateIncome: () => void;
  /** Callback when expense card is pressed */
  onCreateExpense: () => void;
  /** Whether the cards are disabled (e.g., read-only mode) */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Horizontal layout container for finance creation cards
 */
export const CreateFinanceCardGroup: React.FC<CreateFinanceCardGroupProps> = memo(
  ({ onCreateIncome, onCreateExpense, disabled = false, testID }) => {
    return (
      <View style={styles.container} testID={testID}>
        <CreateFinanceCard
          type="income"
          title="収入追加"
          icon="trending-up-outline"
          onPress={onCreateIncome}
          disabled={disabled}
          testID="create-income-card"
        />
        <CreateFinanceCard
          type="expense"
          title="支出追加"
          icon="trending-down-outline"
          onPress={onCreateExpense}
          disabled={disabled}
          testID="create-expense-card"
        />
      </View>
    );
  }
);

CreateFinanceCardGroup.displayName = 'CreateFinanceCardGroup';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});
