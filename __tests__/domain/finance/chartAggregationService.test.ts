/**
 * Chart Aggregation Service Tests
 *
 * TDD: Tests are written first, implementation follows.
 * Tests cover chart data aggregation for finance visualization.
 */

import {
  getDateRangeForPeriod,
  generatePeriodLabels,
  aggregateFinanceData,
} from '@/domain/finance/chartAggregationService';
import type { FinanceEntry, ChartPeriod } from '@/domain/finance/types';

// Helper to create test finance entries
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

describe('chartAggregationService', () => {
  // === getDateRangeForPeriod ===

  describe('getDateRangeForPeriod', () => {
    describe('daily period (last 7 days)', () => {
      it('should return 7-day range ending on reference date', () => {
        const range = getDateRangeForPeriod('daily', '2026-01-15');
        expect(range.startDate).toBe('2026-01-09');
        expect(range.endDate).toBe('2026-01-15');
      });

      it('should handle month boundary', () => {
        const range = getDateRangeForPeriod('daily', '2026-02-03');
        expect(range.startDate).toBe('2026-01-28');
        expect(range.endDate).toBe('2026-02-03');
      });

      it('should handle year boundary', () => {
        const range = getDateRangeForPeriod('daily', '2026-01-05');
        expect(range.startDate).toBe('2025-12-30');
        expect(range.endDate).toBe('2026-01-05');
      });
    });

    describe('weekly period (last 4 weeks)', () => {
      it('should return 4-week range ending on reference date', () => {
        const range = getDateRangeForPeriod('weekly', '2026-01-28');
        expect(range.startDate).toBe('2026-01-01');
        expect(range.endDate).toBe('2026-01-28');
      });

      it('should handle month boundary', () => {
        const range = getDateRangeForPeriod('weekly', '2026-02-14');
        expect(range.startDate).toBe('2026-01-18');
        expect(range.endDate).toBe('2026-02-14');
      });

      it('should handle year boundary', () => {
        const range = getDateRangeForPeriod('weekly', '2026-01-10');
        expect(range.startDate).toBe('2025-12-14');
        expect(range.endDate).toBe('2026-01-10');
      });
    });

    describe('monthly period (last 6 months)', () => {
      it('should return 6-month range including current month', () => {
        const range = getDateRangeForPeriod('monthly', '2026-06-15');
        expect(range.startDate).toBe('2026-01-01');
        expect(range.endDate).toBe('2026-06-30');
      });

      it('should handle year boundary', () => {
        const range = getDateRangeForPeriod('monthly', '2026-02-15');
        expect(range.startDate).toBe('2025-09-01');
        expect(range.endDate).toBe('2026-02-28');
      });

      it('should handle leap year February', () => {
        const range = getDateRangeForPeriod('monthly', '2024-02-15');
        expect(range.startDate).toBe('2023-09-01');
        expect(range.endDate).toBe('2024-02-29');
      });

      it('should handle December reference', () => {
        const range = getDateRangeForPeriod('monthly', '2026-12-15');
        expect(range.startDate).toBe('2026-07-01');
        expect(range.endDate).toBe('2026-12-31');
      });
    });
  });

  // === generatePeriodLabels ===

  describe('generatePeriodLabels', () => {
    describe('daily labels', () => {
      it('should generate 7 day labels', () => {
        const labels = generatePeriodLabels('daily', '2026-01-15');
        expect(labels).toHaveLength(7);
        expect(labels[0]).toBe('1/9');
        expect(labels[6]).toBe('1/15');
      });

      it('should handle month boundary in labels', () => {
        const labels = generatePeriodLabels('daily', '2026-02-03');
        expect(labels).toHaveLength(7);
        expect(labels[0]).toBe('1/28');
        expect(labels[6]).toBe('2/3');
      });
    });

    describe('weekly labels', () => {
      it('should generate 4 week labels', () => {
        const labels = generatePeriodLabels('weekly', '2026-01-28');
        expect(labels).toHaveLength(4);
        expect(labels[0]).toBe('W1');
        expect(labels[3]).toBe('W4');
      });
    });

    describe('monthly labels', () => {
      it('should generate 6 month labels', () => {
        const labels = generatePeriodLabels('monthly', '2026-06-15');
        expect(labels).toHaveLength(6);
        expect(labels[0]).toBe('1月');
        expect(labels[5]).toBe('6月');
      });

      it('should handle year boundary', () => {
        const labels = generatePeriodLabels('monthly', '2026-02-15');
        expect(labels).toHaveLength(6);
        expect(labels[0]).toBe('9月');
        expect(labels[5]).toBe('2月');
      });
    });
  });

  // === aggregateFinanceData ===

  describe('aggregateFinanceData', () => {
    describe('empty entries', () => {
      it('should return zeroed data for empty entries', () => {
        const result = aggregateFinanceData([], 'daily', '2026-01-15');
        expect(result.totalIncome).toBe(0);
        expect(result.totalExpense).toBe(0);
        expect(result.currentBalance).toBe(0);
        expect(result.dataPoints).toHaveLength(7);
        result.dataPoints.forEach((point) => {
          expect(point.income).toBe(0);
          expect(point.expense).toBe(0);
          expect(point.balance).toBe(0);
        });
      });
    });

    describe('daily aggregation', () => {
      it('should aggregate entries by day', () => {
        const entries: FinanceEntry[] = [
          createEntry('income', 10000, '2026-01-15'),
          createEntry('expense', 3000, '2026-01-15'),
          createEntry('income', 5000, '2026-01-14'),
        ];

        const result = aggregateFinanceData(entries, 'daily', '2026-01-15');

        expect(result.totalIncome).toBe(15000);
        expect(result.totalExpense).toBe(3000);
        expect(result.currentBalance).toBe(12000);

        // Last day (2026-01-15)
        const lastDay = result.dataPoints[6];
        expect(lastDay.income).toBe(10000);
        expect(lastDay.expense).toBe(3000);

        // Second to last day (2026-01-14)
        const secondLastDay = result.dataPoints[5];
        expect(secondLastDay.income).toBe(5000);
        expect(secondLastDay.expense).toBe(0);
      });

      it('should calculate cumulative balance correctly', () => {
        const entries: FinanceEntry[] = [
          createEntry('income', 10000, '2026-01-10'),
          createEntry('expense', 3000, '2026-01-12'),
          createEntry('income', 5000, '2026-01-15'),
        ];

        const result = aggregateFinanceData(entries, 'daily', '2026-01-15');

        // Balance should accumulate over time
        // Day 1 (1/9): 0
        // Day 2 (1/10): +10000 = 10000
        // Day 3 (1/11): 10000
        // Day 4 (1/12): 10000 - 3000 = 7000
        // Day 5 (1/13): 7000
        // Day 6 (1/14): 7000
        // Day 7 (1/15): 7000 + 5000 = 12000
        expect(result.dataPoints[0].balance).toBe(0); // 1/9
        expect(result.dataPoints[1].balance).toBe(10000); // 1/10
        expect(result.dataPoints[2].balance).toBe(10000); // 1/11
        expect(result.dataPoints[3].balance).toBe(7000); // 1/12
        expect(result.dataPoints[6].balance).toBe(12000); // 1/15
      });

      it('should exclude entries outside the date range', () => {
        const entries: FinanceEntry[] = [
          createEntry('income', 10000, '2026-01-15'),
          createEntry('income', 50000, '2026-01-01'), // Outside 7-day range
          createEntry('income', 50000, '2026-01-20'), // Future date
        ];

        const result = aggregateFinanceData(entries, 'daily', '2026-01-15');

        expect(result.totalIncome).toBe(10000);
        expect(result.currentBalance).toBe(10000);
      });
    });

    describe('weekly aggregation', () => {
      it('should aggregate entries by week', () => {
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
        expect(result.dataPoints).toHaveLength(4);
      });
    });

    describe('monthly aggregation', () => {
      it('should aggregate entries by month', () => {
        const entries: FinanceEntry[] = [
          createEntry('income', 100000, '2026-06-15'), // June
          createEntry('expense', 30000, '2026-05-10'), // May
          createEntry('income', 80000, '2026-04-01'), // April
          createEntry('income', 50000, '2026-01-15'), // January (out of range for some)
        ];

        const result = aggregateFinanceData(entries, 'monthly', '2026-06-15');

        expect(result.dataPoints).toHaveLength(6);
        expect(result.totalIncome).toBe(230000);
        expect(result.totalExpense).toBe(30000);
        expect(result.currentBalance).toBe(200000);
      });

      it('should handle year boundary correctly', () => {
        const entries: FinanceEntry[] = [
          createEntry('income', 100000, '2026-02-15'), // Feb 2026
          createEntry('income', 50000, '2025-12-15'), // Dec 2025
          createEntry('expense', 20000, '2025-10-15'), // Oct 2025
        ];

        const result = aggregateFinanceData(entries, 'monthly', '2026-02-15');

        expect(result.totalIncome).toBe(150000);
        expect(result.totalExpense).toBe(20000);
        expect(result.currentBalance).toBe(130000);
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

      it('should maintain data point count for each period', () => {
        const entries: FinanceEntry[] = [];

        expect(aggregateFinanceData(entries, 'daily', '2026-01-15').dataPoints).toHaveLength(7);
        expect(aggregateFinanceData(entries, 'weekly', '2026-01-28').dataPoints).toHaveLength(4);
        expect(aggregateFinanceData(entries, 'monthly', '2026-06-15').dataPoints).toHaveLength(6);
      });
    });
  });
});
