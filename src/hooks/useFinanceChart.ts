/**
 * useFinanceChart Hook
 *
 * Manages chart data loading, aggregation, and refresh for finance visualization.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ChartPeriod, FinanceChartData } from '@/domain/finance/types';
import { getAllFinanceEntries, aggregateFinanceData } from '@/domain/finance';

/**
 * Chart state
 */
interface FinanceChartState {
  chartData: FinanceChartData | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook return type
 */
export interface UseFinanceChartReturn {
  /** Aggregated chart data */
  chartData: FinanceChartData | null;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh the chart data */
  refresh: () => Promise<void>;
}

/**
 * Hook for managing finance chart data
 *
 * @param period - Chart period (daily, weekly, monthly)
 * @param referenceDate - Optional reference date for aggregation (defaults to today)
 */
export function useFinanceChart(
  period: ChartPeriod,
  referenceDate?: string
): UseFinanceChartReturn {
  const [state, setState] = useState<FinanceChartState>({
    chartData: null,
    isLoading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await getAllFinanceEntries();

      if (!result.success || !result.data) {
        setState({
          chartData: null,
          isLoading: false,
          error: result.error?.message ?? 'データの読み込みに失敗しました',
        });
        return;
      }

      const chartData = aggregateFinanceData(result.data, period, referenceDate);

      setState({
        chartData,
        isLoading: false,
        error: null,
      });
    } catch {
      setState({
        chartData: null,
        isLoading: false,
        error: 'データの読み込みに失敗しました',
      });
    }
  }, [period, referenceDate]);

  // Load data on mount and when period/referenceDate changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    chartData: state.chartData,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
  };
}
