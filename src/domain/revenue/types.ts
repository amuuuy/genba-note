/**
 * Revenue Domain Types
 *
 * This module defines error types, result types, and interfaces
 * for the revenue management domain (SPEC 2.6).
 */

// === Period Type ===

/**
 * Period filter options for revenue aggregation
 * - 'this-month': Current month (1st 00:00:00 to month-end 23:59:59)
 * - 'last-3-months': Current month + 2 previous months
 * - 'this-year': Jan 1st to Dec 31st of current year
 */
export type PeriodType = 'this-month' | 'last-3-months' | 'this-year';

// === Date Range Interface ===

/**
 * Date range for period filtering
 * Both dates are inclusive (YYYY-MM-DD format)
 */
export interface DateRange {
  /** Start date (inclusive) - YYYY-MM-DD */
  startDate: string;
  /** End date (inclusive) - YYYY-MM-DD */
  endDate: string;
}

// === Revenue Summary Interface ===

/**
 * Revenue summary with aggregated amounts
 *
 * INVARIANT: total === paid + unpaid (MUST always be true)
 */
export interface RevenueSummary {
  /** Total revenue (tax-inclusive) from sent + paid invoices */
  total: number;
  /** Amount from paid invoices */
  paid: number;
  /** Amount from sent (unpaid) invoices */
  unpaid: number;
  /** Count of invoices (sent + paid only, excludes draft) */
  invoiceCount: number;
}

// === Error Codes ===

export type RevenueServiceErrorCode =
  | 'STORAGE_ERROR' // Storage operation failed
  | 'CALCULATION_ERROR'; // Calculation failed

// === Error Interface ===

export interface RevenueServiceError {
  code: RevenueServiceErrorCode;
  message: string;
  originalError?: Error;
}

// === Result Type ===

export interface RevenueResult<T, E = RevenueServiceError> {
  success: boolean;
  data?: T;
  error?: E;
}

// === Result Helper Functions ===

/**
 * Create a successful result with data
 */
export function successResult<T>(data: T): RevenueResult<T, never> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function errorResult<E>(error: E): RevenueResult<never, E> {
  return { success: false, error };
}

/**
 * Create a revenue service error object
 */
export function createRevenueServiceError(
  code: RevenueServiceErrorCode,
  message: string,
  originalError?: Error
): RevenueServiceError {
  return { code, message, originalError };
}
