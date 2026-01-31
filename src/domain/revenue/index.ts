/**
 * Revenue Domain Module
 *
 * Exports revenue management services and types.
 * Used for revenue tracking and reporting (SPEC 2.6).
 */

// Types
export type {
  PeriodType,
  DateRange,
  RevenueSummary,
  RevenueServiceErrorCode,
  RevenueServiceError,
  RevenueResult,
} from './types';

export {
  successResult,
  errorResult,
  createRevenueServiceError,
} from './types';

// Period Filter Service (pure functions)
export {
  getPeriodDateRange,
  isDateInPeriod,
  isValidPeriodType,
} from './periodFilterService';

// Revenue Service
export {
  filterInvoicesByPeriod,
  calculateRevenueSummary,
  getRevenueSummary,
  verifyInvariant,
} from './revenueService';
