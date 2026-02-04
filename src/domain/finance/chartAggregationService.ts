/**
 * Chart Aggregation Service
 *
 * Aggregates finance entries for chart visualization.
 * Supports daily, weekly, and monthly aggregation periods.
 */

import type {
  FinanceEntry,
  ChartPeriod,
  ChartDataPoint,
  FinanceChartData,
} from './types';
import {
  getTodayString,
  getDaysAgo,
  addMonths,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  extractDateParts,
  formatDateToString,
  isDateInRange,
  parseLocalDate,
} from '@/utils/dateUtils';

/** Number of data points per period */
const PERIOD_COUNTS: Record<ChartPeriod, number> = {
  daily: 7,
  weekly: 4,
  monthly: 6,
};

/**
 * Get date range for a chart period
 *
 * @param period - Chart period type
 * @param referenceDate - Reference date (defaults to today)
 * @returns Start and end dates for the period
 */
export function getDateRangeForPeriod(
  period: ChartPeriod,
  referenceDate?: string
): { startDate: string; endDate: string } {
  const refDate = referenceDate ?? getTodayString();
  const refParts = extractDateParts(refDate);

  if (!refParts) {
    throw new Error(`Invalid reference date: ${refDate}`);
  }

  switch (period) {
    case 'daily': {
      // Last 7 days ending on reference date
      const endDate = refDate;
      const startDate = getDaysAgoFromDate(refDate, 6);
      return { startDate, endDate };
    }

    case 'weekly': {
      // Last 4 weeks (28 days) ending on reference date
      const endDate = refDate;
      const startDate = getDaysAgoFromDate(refDate, 27);
      return { startDate, endDate };
    }

    case 'monthly': {
      // Last 6 months including current month
      const { year, month } = refParts;
      const endDate = getLastDayOfMonth(year, month);

      // Go back 5 months (6 months total including current)
      const startYearMonth = addMonths(year, month, -5);
      const startDate = getFirstDayOfMonth(startYearMonth.year, startYearMonth.month);

      return { startDate, endDate };
    }

    default:
      throw new Error(`Unknown period: ${period}`);
  }
}

/**
 * Generate labels for chart X-axis
 *
 * @param period - Chart period type
 * @param referenceDate - Reference date (defaults to today)
 * @returns Array of labels for each data point
 */
export function generatePeriodLabels(
  period: ChartPeriod,
  referenceDate?: string
): string[] {
  const refDate = referenceDate ?? getTodayString();
  const labels: string[] = [];

  switch (period) {
    case 'daily': {
      // Generate labels for last 7 days
      for (let i = 6; i >= 0; i--) {
        const dateStr = getDaysAgoFromDate(refDate, i);
        const parts = extractDateParts(dateStr);
        if (parts) {
          labels.push(`${parts.month}/${parts.day}`);
        }
      }
      break;
    }

    case 'weekly': {
      // Generate W1, W2, W3, W4 labels
      for (let i = 1; i <= 4; i++) {
        labels.push(`W${i}`);
      }
      break;
    }

    case 'monthly': {
      // Generate month labels for last 6 months
      const refParts = extractDateParts(refDate);
      if (refParts) {
        for (let i = 5; i >= 0; i--) {
          const { month } = addMonths(refParts.year, refParts.month, -i);
          labels.push(`${month}月`);
        }
      }
      break;
    }
  }

  return labels;
}

/**
 * Aggregate finance entries into chart data
 *
 * @param entries - Array of finance entries
 * @param period - Chart period type
 * @param referenceDate - Reference date (defaults to today)
 * @returns Aggregated chart data
 */
export function aggregateFinanceData(
  entries: FinanceEntry[],
  period: ChartPeriod,
  referenceDate?: string
): FinanceChartData {
  const refDate = referenceDate ?? getTodayString();
  const { startDate, endDate } = getDateRangeForPeriod(period, refDate);
  const labels = generatePeriodLabels(period, refDate);
  const count = PERIOD_COUNTS[period];

  // Filter entries within date range
  const filteredEntries = entries.filter(
    (entry) => isDateInRange(entry.date, startDate, endDate)
  );

  // Initialize data points with zero values
  const dataPoints: ChartDataPoint[] = [];
  const bucketDates = generateBucketDates(period, refDate);

  for (let i = 0; i < count; i++) {
    dataPoints.push({
      label: labels[i],
      date: bucketDates[i],
      income: 0,
      expense: 0,
      balance: 0,
    });
  }

  // Aggregate entries into buckets
  for (const entry of filteredEntries) {
    const bucketIndex = getBucketIndex(entry.date, period, refDate);
    if (bucketIndex >= 0 && bucketIndex < count) {
      if (entry.type === 'income') {
        dataPoints[bucketIndex].income += entry.amount;
      } else {
        dataPoints[bucketIndex].expense += entry.amount;
      }
    }
  }

  // Calculate cumulative balance
  let cumulativeBalance = 0;
  for (const point of dataPoints) {
    cumulativeBalance += point.income - point.expense;
    point.balance = cumulativeBalance;
  }

  // Calculate totals
  const totalIncome = dataPoints.reduce((sum, p) => sum + p.income, 0);
  const totalExpense = dataPoints.reduce((sum, p) => sum + p.expense, 0);
  const currentBalance = totalIncome - totalExpense;

  return {
    dataPoints,
    period,
    totalIncome,
    totalExpense,
    currentBalance,
  };
}

/**
 * Generate bucket dates for each data point
 */
function generateBucketDates(period: ChartPeriod, referenceDate: string): string[] {
  const dates: string[] = [];
  const refParts = extractDateParts(referenceDate);

  if (!refParts) {
    return dates;
  }

  switch (period) {
    case 'daily': {
      for (let i = 6; i >= 0; i--) {
        dates.push(getDaysAgoFromDate(referenceDate, i));
      }
      break;
    }

    case 'weekly': {
      // Each week starts from week 1 (oldest) to week 4 (most recent)
      for (let i = 3; i >= 0; i--) {
        const weekEndOffset = i * 7;
        dates.push(getDaysAgoFromDate(referenceDate, weekEndOffset));
      }
      break;
    }

    case 'monthly': {
      for (let i = 5; i >= 0; i--) {
        const { year, month } = addMonths(refParts.year, refParts.month, -i);
        dates.push(getFirstDayOfMonth(year, month));
      }
      break;
    }
  }

  return dates;
}

/**
 * Get bucket index for a given date
 */
function getBucketIndex(
  date: string,
  period: ChartPeriod,
  referenceDate: string
): number {
  const refParts = extractDateParts(referenceDate);
  const dateParts = extractDateParts(date);

  if (!refParts || !dateParts) {
    return -1;
  }

  switch (period) {
    case 'daily': {
      // Calculate days difference
      const refDateObj = parseLocalDate(referenceDate);
      const dateObj = parseLocalDate(date);
      if (!refDateObj || !dateObj) return -1;

      const diffMs = refDateObj.getTime() - dateObj.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      // Index 0 = 6 days ago, Index 6 = reference date
      return 6 - diffDays;
    }

    case 'weekly': {
      // Calculate weeks difference
      const refDateObj = parseLocalDate(referenceDate);
      const dateObj = parseLocalDate(date);
      if (!refDateObj || !dateObj) return -1;

      const diffMs = refDateObj.getTime() - dateObj.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.floor(diffDays / 7);

      // Index 0 = oldest week (3 weeks ago), Index 3 = most recent week
      return 3 - diffWeeks;
    }

    case 'monthly': {
      // Calculate months difference
      const refMonths = refParts.year * 12 + refParts.month;
      const dateMonths = dateParts.year * 12 + dateParts.month;
      const diffMonths = refMonths - dateMonths;

      // Index 0 = 5 months ago, Index 5 = reference month
      return 5 - diffMonths;
    }

    default:
      return -1;
  }
}

/**
 * Get date string for N days ago from a reference date
 */
function getDaysAgoFromDate(referenceDate: string, daysAgo: number): string {
  const date = parseLocalDate(referenceDate);
  if (!date) {
    return referenceDate;
  }
  date.setDate(date.getDate() - daysAgo);
  return formatDateToString(date);
}
