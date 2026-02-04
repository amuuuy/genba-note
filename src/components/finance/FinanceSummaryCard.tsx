/**
 * FinanceSummaryCard Component
 *
 * Displays summary of income, expense, and balance.
 * Balance is shown in green (positive) or red (negative).
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

export interface FinanceSummaryCardProps {
  /** Total income amount */
  totalIncome: number;
  /** Total expense amount */
  totalExpense: number;
  /** Current balance (income - expense) */
  currentBalance: number;
  /** Test ID for testing */
  testID?: string;
}

/** iOS green for positive balance */
const POSITIVE_COLOR = '#34C759';
/** iOS red for negative balance */
const NEGATIVE_COLOR = '#FF3B30';

/**
 * Format amount as yen with thousand separators
 */
function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

/**
 * Summary card component
 */
export const FinanceSummaryCard: React.FC<FinanceSummaryCardProps> = memo(
  ({ totalIncome, totalExpense, currentBalance, testID }) => {
    const balanceColor = currentBalance >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR;
    const balanceSign = currentBalance >= 0 ? '+' : '';

    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.row}>
          <View style={styles.item}>
            <Text style={styles.label}>収入</Text>
            <Text style={[styles.value, styles.incomeValue]} testID={`${testID}-income`}>
              {formatCurrency(totalIncome)}
            </Text>
          </View>
          <View style={styles.item}>
            <Text style={styles.label}>支出</Text>
            <Text style={[styles.value, styles.expenseValue]} testID={`${testID}-expense`}>
              {formatCurrency(totalExpense)}
            </Text>
          </View>
        </View>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>収支</Text>
          <Text
            style={[styles.balanceValue, { color: balanceColor }]}
            testID={`${testID}-balance`}
          >
            {balanceSign}{formatCurrency(currentBalance)}
          </Text>
        </View>
      </View>
    );
  }
);

FinanceSummaryCard.displayName = 'FinanceSummaryCard';

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  item: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '600',
  },
  incomeValue: {
    color: POSITIVE_COLOR,
  },
  expenseValue: {
    color: NEGATIVE_COLOR,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    gap: 12,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '700',
  },
});
