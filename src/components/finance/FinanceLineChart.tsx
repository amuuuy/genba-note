/**
 * FinanceLineChart Component
 *
 * Line chart visualization for income, expense, and balance trends.
 * Uses react-native-chart-kit for rendering.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import type { FinanceChartData } from '@/domain/finance';
import { formatYAxisLabel } from '@/utils/currencyFormat';

export interface FinanceLineChartProps {
  /** Aggregated chart data */
  data: FinanceChartData | null;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Test ID for testing */
  testID?: string;
}

/** iOS green for income */
const INCOME_COLOR = '#34C759';
/** iOS red for expense */
const EXPENSE_COLOR = '#FF3B30';
/** iOS blue for balance */
const BALANCE_COLOR = '#007AFF';

/** Chart configuration */
const chartConfig = {
  backgroundColor: '#fff',
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
  labelColor: () => '#6B7280', // Darker gray for better readability
  style: {
    borderRadius: 12,
  },
  propsForDots: {
    r: '5', // Slightly larger dots for visibility
    strokeWidth: '2',
  },
  propsForBackgroundLines: {
    strokeDasharray: '5, 5', // Dashed lines for cleaner look
    stroke: '#E5E5EA',
  },
};

/** Chart padding */
const CHART_PADDING = 16;

/**
 * Get screen width for responsive chart
 */
function getChartWidth(): number {
  return Dimensions.get('window').width - CHART_PADDING * 2;
}

/**
 * Line chart component
 */
export const FinanceLineChart: React.FC<FinanceLineChartProps> = memo(
  ({ data, isLoading, error, testID }) => {
    // Loading state
    if (isLoading) {
      return (
        <View style={styles.container} testID={testID}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BALANCE_COLOR} />
            <Text style={styles.loadingText}>データを読み込み中...</Text>
          </View>
        </View>
      );
    }

    // Error state
    if (error) {
      return (
        <View style={styles.container} testID={testID}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </View>
      );
    }

    // Empty state
    if (!data || data.dataPoints.length === 0) {
      return (
        <View style={styles.container} testID={testID}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>データがありません</Text>
            <Text style={styles.emptyHint}>収入・支出を登録するとグラフが表示されます</Text>
          </View>
        </View>
      );
    }

    // Prepare chart data
    const labels = data.dataPoints.map((p) => p.label);
    const incomeData = data.dataPoints.map((p) => p.income);
    const expenseData = data.dataPoints.map((p) => p.expense);
    const balanceData = data.dataPoints.map((p) => p.balance);

    // Check if all values are zero
    const hasData =
      incomeData.some((v) => v > 0) ||
      expenseData.some((v) => v > 0) ||
      balanceData.some((v) => v !== 0);

    if (!hasData) {
      return (
        <View style={styles.container} testID={testID}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>この期間のデータがありません</Text>
            <Text style={styles.emptyHint}>収入・支出を登録するとグラフが表示されます</Text>
          </View>
        </View>
      );
    }

    const chartData = {
      labels,
      datasets: [
        {
          data: balanceData,
          color: () => BALANCE_COLOR,
          strokeWidth: 3,
        },
        {
          data: incomeData,
          color: () => INCOME_COLOR,
          strokeWidth: 2,
        },
        {
          data: expenseData,
          color: () => EXPENSE_COLOR,
          strokeWidth: 2,
        },
      ],
      legend: ['収支（累積）', '収入', '支出'],
    };

    return (
      <View style={styles.container} testID={testID}>
        <LineChart
          data={chartData}
          width={getChartWidth()}
          height={250}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLabels
          withVerticalLabels
          yAxisSuffix=""
          segments={5}
          formatYLabel={formatYAxisLabel}
        />
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: BALANCE_COLOR }]} />
            <Text style={styles.legendText}>収支</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: INCOME_COLOR }]} />
            <Text style={styles.legendText}>収入</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: EXPENSE_COLOR }]} />
            <Text style={styles.legendText}>支出</Text>
          </View>
        </View>
      </View>
    );
  }
);

FinanceLineChart.displayName = 'FinanceLineChart';

const styles = StyleSheet.create({
  container: {
    marginHorizontal: CHART_PADDING,
    marginVertical: 8,
  },
  chart: {
    borderRadius: 12,
  },
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
  errorContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF2F2',
    borderRadius: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
  },
  emptyContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 12,
    color: '#AEAEB2',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
