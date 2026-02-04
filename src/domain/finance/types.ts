/**
 * Finance Domain Types
 *
 * Type definitions for income and expense entries.
 */

/** Finance entry type */
export type FinanceType = 'income' | 'expense';

/**
 * Finance entry data structure
 */
export interface FinanceEntry {
  /** Unique identifier (UUID) */
  id: string;
  /** Entry type: income or expense */
  type: FinanceType;
  /** Amount in yen */
  amount: number;
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Description or memo */
  description: string;
  /** Optional category */
  category?: string;
  /** Photo IDs associated with this entry */
  photoIds?: string[];
  /** Creation timestamp (ISO8601) */
  createdAt: string;
  /** Last update timestamp (ISO8601) */
  updatedAt: string;
}

/**
 * Finance summary for a period
 */
export interface FinanceSummary {
  /** Total income amount */
  totalIncome: number;
  /** Total expense amount */
  totalExpense: number;
  /** Net balance (totalIncome - totalExpense) */
  balance: number;
}

/**
 * Chart period options
 */
export type ChartPeriod = 'daily' | 'weekly' | 'monthly';

/**
 * Single data point for chart visualization
 */
export interface ChartDataPoint {
  /** Display label (e.g., "1/15", "W1", "1月") */
  label: string;
  /** Reference date (YYYY-MM-DD) */
  date: string;
  /** Aggregated income for this period */
  income: number;
  /** Aggregated expense for this period */
  expense: number;
  /** Cumulative balance (income - expense) */
  balance: number;
}

/**
 * Complete chart data for visualization
 */
export interface FinanceChartData {
  /** Data points for the chart */
  dataPoints: ChartDataPoint[];
  /** Selected period */
  period: ChartPeriod;
  /** Total income across all data points */
  totalIncome: number;
  /** Total expense across all data points */
  totalExpense: number;
  /** Current balance (totalIncome - totalExpense) */
  currentBalance: number;
}
