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
