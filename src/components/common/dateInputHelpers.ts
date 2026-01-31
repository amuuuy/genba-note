/**
 * Date Input Helpers
 *
 * Pure functions for date formatting and parsing.
 * Used by DatePickerInput component.
 */

import { isValidDateString } from '@/utils/dateUtils';

/**
 * Format date for display (YYYY-MM-DD -> YYYY年MM月DD日)
 */
export function formatDateForDisplay(dateStr: string | null): string {
  if (!dateStr || !isValidDateString(dateStr)) {
    return '';
  }
  const [year, month, day] = dateStr.split('-');
  return `${year}年${parseInt(month, 10)}月${parseInt(day, 10)}日`;
}

/**
 * Parse user input to YYYY-MM-DD format
 * Handles various input formats:
 * - 2026-01-31 (ISO)
 * - 2026/01/31 (slash)
 * - 20260131 (compact)
 */
export function parseDateInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Try ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return isValidDateString(trimmed) ? trimmed : null;
  }

  // Try slash format (YYYY/MM/DD)
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
    const converted = trimmed.replace(/\//g, '-');
    return isValidDateString(converted) ? converted : null;
  }

  // Try compact format (YYYYMMDD)
  if (/^\d{8}$/.test(trimmed)) {
    const year = trimmed.slice(0, 4);
    const month = trimmed.slice(4, 6);
    const day = trimmed.slice(6, 8);
    const converted = `${year}-${month}-${day}`;
    return isValidDateString(converted) ? converted : null;
  }

  return null;
}
