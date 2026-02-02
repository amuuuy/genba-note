/**
 * DocumentTotalsDisplay Component
 *
 * Displays the calculated totals: subtotal, tax breakdown, and total.
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LineItem, TaxRate } from '@/types/document';
import { calculateDocumentTotals } from '@/domain/lineItem';

export interface DocumentTotalsDisplayProps {
  /** Line items to calculate totals for */
  lineItems: LineItem[];
  /** Carried forward amount (yen) */
  carriedForwardAmount?: number | null;
  /** Test ID */
  testID?: string;
}

/**
 * Format number as currency (with thousand separators)
 */
function formatCurrency(value: number): string {
  return value.toLocaleString('ja-JP');
}

/**
 * Format tax rate for display
 */
function formatTaxRate(rate: TaxRate): string {
  return rate === 0 ? '非課税' : `${rate}%`;
}

/**
 * Document totals display
 */
function DocumentTotalsDisplayComponent({
  lineItems,
  carriedForwardAmount,
  testID,
}: DocumentTotalsDisplayProps) {
  const totals = useMemo(() => {
    return calculateDocumentTotals(lineItems);
  }, [lineItems]);

  const hasCarriedForward = carriedForwardAmount != null && carriedForwardAmount > 0;
  const grandTotal = totals.totalYen + (carriedForwardAmount ?? 0);

  if (lineItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.title}>合計金額</Text>
      <View style={styles.content}>
        {/* Subtotal */}
        <View style={styles.row}>
          <Text style={styles.label}>小計</Text>
          <Text style={styles.value}>¥{formatCurrency(totals.subtotalYen)}</Text>
        </View>

        {/* Tax breakdown */}
        {totals.taxBreakdown.map((breakdown) => (
          <View key={breakdown.rate} style={styles.row}>
            <Text style={styles.label}>
              消費税（{formatTaxRate(breakdown.rate)}）
            </Text>
            <Text style={styles.value}>¥{formatCurrency(breakdown.tax)}</Text>
          </View>
        ))}

        {/* Carried Forward Amount */}
        {hasCarriedForward && (
          <View style={styles.carriedForwardRow}>
            <Text style={styles.carriedForwardLabel}>繰越金額</Text>
            <Text style={styles.carriedForwardValue}>
              ¥{formatCurrency(carriedForwardAmount)}
            </Text>
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>合計（税込）</Text>
          <Text style={styles.totalValue}>¥{formatCurrency(grandTotal)}</Text>
        </View>
      </View>
    </View>
  );
}

export const DocumentTotalsDisplay = memo(DocumentTotalsDisplayComponent);

DocumentTotalsDisplay.displayName = 'DocumentTotalsDisplay';

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingLeft: 4,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 15,
    color: '#333',
  },
  carriedForwardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#F9F9F9',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  carriedForwardLabel: {
    fontSize: 14,
    color: '#888',
  },
  carriedForwardValue: {
    fontSize: 15,
    color: '#666',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5E5',
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
});
