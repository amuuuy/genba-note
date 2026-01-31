/**
 * Period Filter Service
 *
 * Pure functions for calculating period date ranges.
 * Uses existing dateUtils for date manipulation.
 * All dates in YYYY-MM-DD format.
 *
 * Period definitions (SPEC 2.6.2):
 * - this-month: Month 1st to month-end (local timezone)
 * - last-3-months: Current month + 2 previous months
 * - this-year: Jan 1st to Dec 31st of current year
 */

import type { PeriodType, DateRange } from './types';
import {
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getCurrentYearMonth,
  addMonths,
  isDateInRange,
  extractDateParts,
} from '@/utils/dateUtils';

/** Valid period type values */
const VALID_PERIOD_TYPES: readonly PeriodType[] = [
  'this-month',
  'last-3-months',
  'this-year',
];

/**
 * Validate period type
 *
 * @param value - Value to validate
 * @returns true if valid PeriodType
 */
export function isValidPeriodType(value: string): value is PeriodType {
  return VALID_PERIOD_TYPES.includes(value as PeriodType);
}

/**
 * Get date range for a given period type
 *
 * @param periodType - Period type to calculate range for
 * @param referenceDate - Optional reference date (defaults to today)
 *                        Used for testing with specific dates
 * @returns DateRange with startDate and endDate
 *
 * @example
 * // Reference: 2026-01-15
 * getPeriodDateRange('this-month', '2026-01-15')
 * // => { startDate: '2026-01-01', endDate: '2026-01-31' }
 *
 * getPeriodDateRange('last-3-months', '2026-03-15')
 * // => { startDate: '2026-01-01', endDate: '2026-03-31' }
 *
 * getPeriodDateRange('this-year', '2026-06-15')
 * // => { startDate: '2026-01-01', endDate: '2026-12-31' }
 */
export function getPeriodDateRange(
  periodType: PeriodType,
  referenceDate?: string
): DateRange {
  // Get reference year and month
  let year: number;
  let month: number;

  if (referenceDate) {
    const parts = extractDateParts(referenceDate);
    if (parts) {
      year = parts.year;
      month = parts.month;
    } else {
      // Fallback to current date if reference date is invalid
      const current = getCurrentYearMonth();
      year = current.year;
      month = current.month;
    }
  } else {
    const current = getCurrentYearMonth();
    year = current.year;
    month = current.month;
  }

  switch (periodType) {
    case 'this-month':
      return {
        startDate: getFirstDayOfMonth(year, month),
        endDate: getLastDayOfMonth(year, month),
      };

    case 'last-3-months': {
      // Go back 2 months to get the start
      const startYearMonth = addMonths(year, month, -2);
      return {
        startDate: getFirstDayOfMonth(startYearMonth.year, startYearMonth.month),
        endDate: getLastDayOfMonth(year, month),
      };
    }

    case 'this-year':
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      };

    default: {
      // TypeScript exhaustive check
      const _exhaustive: never = periodType;
      throw new Error(`Unknown period type: ${_exhaustive}`);
    }
  }
}

/**
 * Check if a date falls within a period
 *
 * @param dateString - Date to check (YYYY-MM-DD format)
 * @param periodType - Period type to check against
 * @param referenceDate - Optional reference date (defaults to today)
 * @returns true if date is within the period (inclusive), false otherwise
 *
 * @example
 * isDateInPeriod('2026-01-15', 'this-month', '2026-01-20')
 * // => true
 *
 * isDateInPeriod('2025-12-31', 'this-month', '2026-01-20')
 * // => false
 */
export function isDateInPeriod(
  dateString: string | null,
  periodType: PeriodType,
  referenceDate?: string
): boolean {
  if (dateString === null) {
    return false;
  }

  const range = getPeriodDateRange(periodType, referenceDate);
  return isDateInRange(dateString, range.startDate, range.endDate);
}
