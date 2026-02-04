/**
 * useFinanceChart Hook Tests
 *
 * Tests for the finance chart data hook.
 * Note: The hook is a thin wrapper around chartAggregationService,
 * which is comprehensively tested in chartAggregationService.test.ts.
 * These tests verify the hook's integration behavior.
 */

import type { FinanceEntry, ChartPeriod, FinanceChartData } from '@/domain/finance/types';

// We import from the aggregation service directly to test the underlying logic
import { aggregateFinanceData } from '@/domain/finance/chartAggregationService';

// Helper to create test entries
function createEntry(
  type: 'income' | 'expense',
  amount: number,
  date: string
): FinanceEntry {
  return {
    id: `test-${Date.now()}-${Math.random()}`,
    type,
    amount,
    date,
    description: 'Test entry',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('useFinanceChart - underlying logic', () => {
  describe('aggregation behavior', () => {
    it('should aggregate entries by period', () => {
      const entries: FinanceEntry[] = [
        createEntry('income', 10000, '2026-01-15'),
        createEntry('expense', 3000, '2026-01-14'),
      ];

      const result = aggregateFinanceData(entries, 'daily', '2026-01-15');

      expect(result.totalIncome).toBe(10000);
      expect(result.totalExpense).toBe(3000);
      expect(result.currentBalance).toBe(7000);
    });

    it('should handle empty entries', () => {
      const result = aggregateFinanceData([], 'daily', '2026-01-15');

      expect(result.totalIncome).toBe(0);
      expect(result.totalExpense).toBe(0);
      expect(result.currentBalance).toBe(0);
      expect(result.dataPoints).toHaveLength(7);
    });

    it('should return correct data point counts for each period', () => {
      const entries: FinanceEntry[] = [];

      const dailyResult = aggregateFinanceData(entries, 'daily', '2026-01-15');
      const weeklyResult = aggregateFinanceData(entries, 'weekly', '2026-01-28');
      const monthlyResult = aggregateFinanceData(entries, 'monthly', '2026-06-15');

      expect(dailyResult.dataPoints).toHaveLength(7);
      expect(weeklyResult.dataPoints).toHaveLength(4);
      expect(monthlyResult.dataPoints).toHaveLength(6);
    });

    it('should calculate cumulative balance correctly', () => {
      const entries: FinanceEntry[] = [
        createEntry('income', 10000, '2026-01-10'),
        createEntry('expense', 3000, '2026-01-12'),
        createEntry('income', 5000, '2026-01-15'),
      ];

      const result = aggregateFinanceData(entries, 'daily', '2026-01-15');

      // Final balance should be 10000 - 3000 + 5000 = 12000
      expect(result.currentBalance).toBe(12000);
      expect(result.dataPoints[6].balance).toBe(12000);
    });
  });

  describe('period-specific aggregation', () => {
    it('should aggregate by day for daily period', () => {
      const entries: FinanceEntry[] = [
        createEntry('income', 5000, '2026-01-15'),
        createEntry('income', 5000, '2026-01-15'), // Same day
        createEntry('income', 3000, '2026-01-14'),
      ];

      const result = aggregateFinanceData(entries, 'daily', '2026-01-15');

      // Last day should have 10000 (2 entries combined)
      expect(result.dataPoints[6].income).toBe(10000);
      // Second to last should have 3000
      expect(result.dataPoints[5].income).toBe(3000);
    });

    it('should aggregate by week for weekly period', () => {
      const entries: FinanceEntry[] = [
        createEntry('income', 10000, '2026-01-28'), // Week 4
        createEntry('income', 5000, '2026-01-21'), // Week 3
        createEntry('expense', 2000, '2026-01-14'), // Week 2
        createEntry('income', 8000, '2026-01-07'), // Week 1
      ];

      const result = aggregateFinanceData(entries, 'weekly', '2026-01-28');

      expect(result.totalIncome).toBe(23000);
      expect(result.totalExpense).toBe(2000);
      expect(result.currentBalance).toBe(21000);
    });

    it('should aggregate by month for monthly period', () => {
      const entries: FinanceEntry[] = [
        createEntry('income', 100000, '2026-06-15'), // June
        createEntry('expense', 30000, '2026-05-10'), // May
        createEntry('income', 80000, '2026-04-01'), // April
      ];

      const result = aggregateFinanceData(entries, 'monthly', '2026-06-15');

      expect(result.totalIncome).toBe(180000);
      expect(result.totalExpense).toBe(30000);
      expect(result.currentBalance).toBe(150000);
    });
  });

  describe('date range filtering', () => {
    it('should exclude entries outside the date range', () => {
      const entries: FinanceEntry[] = [
        createEntry('income', 10000, '2026-01-15'), // In range
        createEntry('income', 50000, '2026-01-01'), // Outside 7-day range
        createEntry('income', 50000, '2026-01-20'), // Future date
      ];

      const result = aggregateFinanceData(entries, 'daily', '2026-01-15');

      expect(result.totalIncome).toBe(10000);
      expect(result.currentBalance).toBe(10000);
    });
  });

  describe('invariants', () => {
    it('should maintain invariant: totalIncome - totalExpense = currentBalance', () => {
      const entries: FinanceEntry[] = [
        createEntry('income', 100000, '2026-01-15'),
        createEntry('expense', 30000, '2026-01-14'),
        createEntry('income', 50000, '2026-01-13'),
        createEntry('expense', 10000, '2026-01-12'),
      ];

      const result = aggregateFinanceData(entries, 'daily', '2026-01-15');
      expect(result.currentBalance).toBe(result.totalIncome - result.totalExpense);
    });
  });
});
