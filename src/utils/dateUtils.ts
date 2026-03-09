/**
 * Date utilities for ポチッと事務
 *
 * CRITICAL CONSTRAINTS (from SPEC.md 2.1.4):
 *
 * 1. All dates are stored as 'YYYY-MM-DD' strings
 * 2. NEVER use `new Date('YYYY-MM-DD')` for parsing
 *    - This is interpreted as UTC, causing timezone shifts
 *    - Example: '2026-01-30' at UTC becomes '2026-01-29 15:00' in JST
 * 3. Parse dates by splitting and using new Date(year, month-1, day)
 * 4. Use null for unset optional dates (never empty string)
 * 5. String comparison works for YYYY-MM-DD format ('2026-01-30' > '2026-01-01')
 */

/** Date string format 'YYYY-MM-DD' */
export type DateString = string;

/**
 * Get today's date as 'YYYY-MM-DD' string in local timezone
 *
 * @example
 * // If local time is 2026-01-30 09:00 JST
 * getTodayString() // '2026-01-30'
 */
export function getTodayString(): DateString {
  const now = new Date();
  return formatDateToString(now);
}

/**
 * Format a Date object to 'YYYY-MM-DD' string
 * Uses local timezone (not UTC)
 *
 * @param date - Date object to format
 * @returns 'YYYY-MM-DD' string
 */
export function formatDateToString(date: Date): DateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse 'YYYY-MM-DD' string to Date object (local timezone)
 *
 * IMPORTANT: This is the ONLY correct way to parse date strings in this app.
 * Never use new Date('YYYY-MM-DD') directly.
 *
 * @param dateString - Date string in 'YYYY-MM-DD' format
 * @returns Date object in local timezone, or null if invalid
 *
 * @example
 * // Correct: parses as local date
 * parseLocalDate('2026-01-30') // Date representing 2026-01-30 00:00:00 local
 *
 * // WRONG (do not do this): parses as UTC
 * new Date('2026-01-30') // Date representing 2026-01-30 00:00:00 UTC
 */
export function parseLocalDate(dateString: DateString | null): Date | null {
  if (dateString === null) {
    return null;
  }

  // Validate format first
  if (!isValidDateString(dateString)) {
    return null;
  }

  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // JavaScript months are 0-indexed
  const day = parseInt(dayStr, 10);

  // Create date in local timezone
  const date = new Date(year, month, day);

  // Verify the date is valid (handles invalid dates like 2026-02-30)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Validate date string format 'YYYY-MM-DD'
 * Does NOT validate if the date itself is valid (e.g., 2026-02-30)
 *
 * @param dateString - String to validate
 * @returns true if format is valid
 */
export function isValidDateFormat(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

/**
 * Validate date string is both correct format AND a valid date
 *
 * @param dateString - String to validate
 * @returns true if valid date string
 */
export function isValidDateString(dateString: string): boolean {
  if (!isValidDateFormat(dateString)) {
    return false;
  }

  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Basic range checks
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Create date and verify it matches input
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Compare two date strings
 *
 * @param a - First date string (or null)
 * @param b - Second date string (or null)
 * @returns negative if a < b, 0 if equal, positive if a > b
 *          null values are considered "less than" any date
 *
 * @example
 * compareDates('2026-01-30', '2026-01-01') // positive (a > b)
 * compareDates('2026-01-01', '2026-01-30') // negative (a < b)
 * compareDates('2026-01-15', '2026-01-15') // 0 (equal)
 * compareDates(null, '2026-01-01') // negative (null < date)
 */
export function compareDates(
  a: DateString | null,
  b: DateString | null
): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;

  // String comparison works for YYYY-MM-DD format
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Check if date A is on or after date B
 * Used for validation: validUntil >= issueDate, dueDate >= issueDate
 *
 * @param dateA - Date to check
 * @param dateB - Reference date
 * @returns true if dateA >= dateB, false if either is null
 */
export function isDateOnOrAfter(
  dateA: DateString | null,
  dateB: DateString | null
): boolean {
  if (dateA === null || dateB === null) {
    return false;
  }
  return compareDates(dateA, dateB) >= 0;
}

/**
 * Check if date A is on or before date B
 * Used for validation: paidAt <= today
 *
 * @param dateA - Date to check
 * @param dateB - Reference date
 * @returns true if dateA <= dateB, false if either is null
 */
export function isDateOnOrBefore(
  dateA: DateString | null,
  dateB: DateString | null
): boolean {
  if (dateA === null || dateB === null) {
    return false;
  }
  return compareDates(dateA, dateB) <= 0;
}

/**
 * Check if a date is in the past or today
 * Used for paidAt validation (cannot be future date)
 *
 * @param dateString - Date to check
 * @returns true if date <= today
 */
export function isDateTodayOrPast(dateString: DateString | null): boolean {
  if (dateString === null) return false;
  return isDateOnOrBefore(dateString, getTodayString());
}

/**
 * Check if a date is in the future
 *
 * @param dateString - Date to check
 * @returns true if date > today
 */
export function isDateFuture(dateString: DateString | null): boolean {
  if (dateString === null) return false;
  return compareDates(dateString, getTodayString()) > 0;
}

/**
 * Get the first day of a month
 * @param year - Year
 * @param month - Month (1-12)
 * @returns 'YYYY-MM-01'
 */
export function getFirstDayOfMonth(year: number, month: number): DateString {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

/**
 * Get the last day of a month
 * @param year - Year
 * @param month - Month (1-12)
 * @returns 'YYYY-MM-DD' where DD is the last day
 */
export function getLastDayOfMonth(year: number, month: number): DateString {
  // Create date for first day of NEXT month, then subtract 1 day
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const lastDay = new Date(nextYear, nextMonth - 1, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Get current year and month
 * @returns { year, month } where month is 1-12
 */
export function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

/**
 * Check if date falls within a range (inclusive)
 * @param date - Date to check
 * @param startDate - Range start
 * @param endDate - Range end
 * @returns true if startDate <= date <= endDate
 */
export function isDateInRange(
  date: DateString | null,
  startDate: DateString,
  endDate: DateString
): boolean {
  if (date === null) return false;
  return compareDates(date, startDate) >= 0 && compareDates(date, endDate) <= 0;
}

/**
 * Add months to a year/month pair
 * @param year - Starting year
 * @param month - Starting month (1-12)
 * @param months - Months to add (can be negative)
 * @returns { year, month }
 */
export function addMonths(
  year: number,
  month: number,
  months: number
): { year: number; month: number } {
  const totalMonths = year * 12 + (month - 1) + months;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;
  return { year: newYear, month: newMonth };
}

/**
 * Get date string for a specific number of days ago
 * @param days - Number of days ago (positive integer)
 * @returns 'YYYY-MM-DD'
 */
export function getDaysAgo(days: number): DateString {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDateToString(date);
}

/**
 * Extract year, month, day from date string
 * @param dateString - Date in 'YYYY-MM-DD' format
 * @returns { year, month, day } or null if invalid
 */
export function extractDateParts(
  dateString: DateString | null
): {
  year: number;
  month: number;
  day: number;
} | null {
  if (dateString === null || !isValidDateString(dateString)) {
    return null;
  }

  const [yearStr, monthStr, dayStr] = dateString.split('-');
  return {
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr, 10),
    day: parseInt(dayStr, 10),
  };
}

/**
 * Check if a date falls within a given year-month
 * @param date - Date string in 'YYYY-MM-DD' format (or null)
 * @param yearMonth - Year-month string in 'YYYY-MM' format
 * @returns true if the date's year and month match, false if inputs are invalid
 */
export function isInMonth(date: string | null, yearMonth: string): boolean {
  if (date === null) return false;
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) return false;
  if (!isValidDateString(date)) return false;
  return date.startsWith(yearMonth + '-');
}
