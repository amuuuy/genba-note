import {
  getTodayString,
  formatDateToString,
  parseLocalDate,
  isValidDateFormat,
  isValidDateString,
  compareDates,
  isDateOnOrAfter,
  isDateOnOrBefore,
  isDateTodayOrPast,
  isDateFuture,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getCurrentYearMonth,
  isDateInRange,
  addMonths,
  getDaysAgo,
  extractDateParts,
  isInMonth,
} from '../../src/utils/dateUtils';

describe('dateUtils', () => {
  // We need to mock Date for consistent testing
  const FIXED_DATE = new Date(2026, 0, 30, 12, 0, 0); // 2026-01-30 12:00:00 local

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_DATE);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('getTodayString', () => {
    it('returns today in YYYY-MM-DD format', () => {
      const result = getTodayString();
      expect(result).toBe('2026-01-30');
    });

    it('pads single-digit month and day with zeros', () => {
      jest.setSystemTime(new Date(2026, 0, 5)); // Jan 5
      expect(getTodayString()).toBe('2026-01-05');
      jest.setSystemTime(FIXED_DATE); // Reset
    });
  });

  describe('formatDateToString', () => {
    it('formats Date object to YYYY-MM-DD', () => {
      const date = new Date(2026, 5, 15); // June 15, 2026
      expect(formatDateToString(date)).toBe('2026-06-15');
    });

    it('handles year boundaries correctly', () => {
      const date = new Date(2025, 11, 31); // Dec 31, 2025
      expect(formatDateToString(date)).toBe('2025-12-31');
    });
  });

  describe('parseLocalDate', () => {
    it('parses valid date string to local Date', () => {
      const result = parseLocalDate('2026-01-30');
      expect(result).not.toBeNull();
      expect(result!.getFullYear()).toBe(2026);
      expect(result!.getMonth()).toBe(0); // January
      expect(result!.getDate()).toBe(30);
    });

    it('returns null for null input', () => {
      expect(parseLocalDate(null)).toBeNull();
    });

    it('returns null for invalid format', () => {
      expect(parseLocalDate('2026/01/30')).toBeNull();
      expect(parseLocalDate('01-30-2026')).toBeNull();
      expect(parseLocalDate('2026-1-30')).toBeNull();
      expect(parseLocalDate('invalid')).toBeNull();
    });

    it('returns null for invalid dates', () => {
      expect(parseLocalDate('2026-02-30')).toBeNull(); // Feb 30 doesn't exist
      expect(parseLocalDate('2026-13-01')).toBeNull(); // Month 13
      expect(parseLocalDate('2026-00-15')).toBeNull(); // Month 0
    });

    it('does NOT interpret date as UTC (critical test)', () => {
      // This is the main reason for custom parsing
      // If we used new Date('2026-01-30'), it would be UTC
      // and could shift to previous day in certain timezones
      const result = parseLocalDate('2026-01-30');
      expect(result).not.toBeNull();

      // The date should be local, so getDate() returns 30
      expect(result!.getDate()).toBe(30);
    });
  });

  describe('isValidDateFormat', () => {
    it('returns true for valid format', () => {
      expect(isValidDateFormat('2026-01-30')).toBe(true);
      expect(isValidDateFormat('1999-12-31')).toBe(true);
    });

    it('returns false for invalid formats', () => {
      expect(isValidDateFormat('2026-1-30')).toBe(false);
      expect(isValidDateFormat('2026/01/30')).toBe(false);
      expect(isValidDateFormat('20260130')).toBe(false);
      expect(isValidDateFormat('')).toBe(false);
    });
  });

  describe('isValidDateString', () => {
    it('returns true for valid dates', () => {
      expect(isValidDateString('2026-01-30')).toBe(true);
      expect(isValidDateString('2024-02-29')).toBe(true); // Leap year
    });

    it('returns false for invalid dates', () => {
      expect(isValidDateString('2026-02-29')).toBe(false); // Not leap year
      expect(isValidDateString('2026-04-31')).toBe(false); // April has 30 days
      expect(isValidDateString('2026-13-01')).toBe(false);
    });
  });

  describe('compareDates', () => {
    it('returns negative when a < b', () => {
      expect(compareDates('2026-01-01', '2026-01-30')).toBeLessThan(0);
      expect(compareDates('2025-12-31', '2026-01-01')).toBeLessThan(0);
    });

    it('returns positive when a > b', () => {
      expect(compareDates('2026-01-30', '2026-01-01')).toBeGreaterThan(0);
      expect(compareDates('2026-01-01', '2025-12-31')).toBeGreaterThan(0);
    });

    it('returns 0 when equal', () => {
      expect(compareDates('2026-01-30', '2026-01-30')).toBe(0);
    });

    it('handles null values', () => {
      expect(compareDates(null, null)).toBe(0);
      expect(compareDates(null, '2026-01-30')).toBeLessThan(0);
      expect(compareDates('2026-01-30', null)).toBeGreaterThan(0);
    });
  });

  describe('isDateOnOrAfter', () => {
    it('returns true when dateA >= dateB', () => {
      expect(isDateOnOrAfter('2026-01-30', '2026-01-01')).toBe(true);
      expect(isDateOnOrAfter('2026-01-30', '2026-01-30')).toBe(true);
    });

    it('returns false when dateA < dateB', () => {
      expect(isDateOnOrAfter('2026-01-01', '2026-01-30')).toBe(false);
    });

    it('returns false when either is null', () => {
      expect(isDateOnOrAfter(null, '2026-01-30')).toBe(false);
      expect(isDateOnOrAfter('2026-01-30', null)).toBe(false);
    });
  });

  describe('isDateOnOrBefore', () => {
    it('returns true when dateA <= dateB', () => {
      expect(isDateOnOrBefore('2026-01-01', '2026-01-30')).toBe(true);
      expect(isDateOnOrBefore('2026-01-30', '2026-01-30')).toBe(true);
    });

    it('returns false when dateA > dateB', () => {
      expect(isDateOnOrBefore('2026-01-30', '2026-01-01')).toBe(false);
    });
  });

  describe('isDateTodayOrPast', () => {
    it('returns true for today', () => {
      expect(isDateTodayOrPast('2026-01-30')).toBe(true);
    });

    it('returns true for past dates', () => {
      expect(isDateTodayOrPast('2026-01-29')).toBe(true);
      expect(isDateTodayOrPast('2025-12-31')).toBe(true);
    });

    it('returns false for future dates', () => {
      expect(isDateTodayOrPast('2026-01-31')).toBe(false);
      expect(isDateTodayOrPast('2026-02-01')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isDateTodayOrPast(null)).toBe(false);
    });
  });

  describe('isDateFuture', () => {
    it('returns true for future dates', () => {
      expect(isDateFuture('2026-01-31')).toBe(true);
      expect(isDateFuture('2026-02-01')).toBe(true);
    });

    it('returns false for today and past', () => {
      expect(isDateFuture('2026-01-30')).toBe(false);
      expect(isDateFuture('2026-01-29')).toBe(false);
    });
  });

  describe('getFirstDayOfMonth', () => {
    it('returns first day of month', () => {
      expect(getFirstDayOfMonth(2026, 1)).toBe('2026-01-01');
      expect(getFirstDayOfMonth(2026, 12)).toBe('2026-12-01');
    });
  });

  describe('getLastDayOfMonth', () => {
    it('returns last day of month', () => {
      expect(getLastDayOfMonth(2026, 1)).toBe('2026-01-31');
      expect(getLastDayOfMonth(2026, 2)).toBe('2026-02-28'); // Non-leap year
      expect(getLastDayOfMonth(2024, 2)).toBe('2024-02-29'); // Leap year
      expect(getLastDayOfMonth(2026, 4)).toBe('2026-04-30');
    });
  });

  describe('getCurrentYearMonth', () => {
    it('returns current year and month', () => {
      const result = getCurrentYearMonth();
      expect(result.year).toBe(2026);
      expect(result.month).toBe(1);
    });
  });

  describe('isDateInRange', () => {
    it('returns true when date is within range', () => {
      expect(isDateInRange('2026-01-15', '2026-01-01', '2026-01-31')).toBe(true);
    });

    it('returns true when date equals range boundaries', () => {
      expect(isDateInRange('2026-01-01', '2026-01-01', '2026-01-31')).toBe(true);
      expect(isDateInRange('2026-01-31', '2026-01-01', '2026-01-31')).toBe(true);
    });

    it('returns false when date is outside range', () => {
      expect(isDateInRange('2025-12-31', '2026-01-01', '2026-01-31')).toBe(
        false
      );
      expect(isDateInRange('2026-02-01', '2026-01-01', '2026-01-31')).toBe(
        false
      );
    });

    it('returns false for null date', () => {
      expect(isDateInRange(null, '2026-01-01', '2026-01-31')).toBe(false);
    });
  });

  describe('addMonths', () => {
    it('adds months within same year', () => {
      expect(addMonths(2026, 1, 3)).toEqual({ year: 2026, month: 4 });
    });

    it('handles year rollover', () => {
      expect(addMonths(2026, 11, 3)).toEqual({ year: 2027, month: 2 });
    });

    it('handles negative months', () => {
      expect(addMonths(2026, 3, -2)).toEqual({ year: 2026, month: 1 });
      expect(addMonths(2026, 1, -2)).toEqual({ year: 2025, month: 11 });
    });
  });

  describe('getDaysAgo', () => {
    it('returns date for specified days ago', () => {
      expect(getDaysAgo(1)).toBe('2026-01-29');
      expect(getDaysAgo(30)).toBe('2025-12-31');
    });

    it('returns today for 0 days', () => {
      expect(getDaysAgo(0)).toBe('2026-01-30');
    });
  });

  describe('extractDateParts', () => {
    it('extracts year, month, day from valid date', () => {
      expect(extractDateParts('2026-01-30')).toEqual({
        year: 2026,
        month: 1,
        day: 30,
      });
    });

    it('returns null for invalid date', () => {
      expect(extractDateParts(null)).toBeNull();
      expect(extractDateParts('invalid')).toBeNull();
      expect(extractDateParts('2026-02-30')).toBeNull();
    });
  });

  describe('isInMonth', () => {
    it('returns true when date is in the given month', () => {
      expect(isInMonth('2026-01-15', '2026-01')).toBe(true);
      expect(isInMonth('2026-01-01', '2026-01')).toBe(true);
      expect(isInMonth('2026-01-31', '2026-01')).toBe(true);
    });

    it('returns false when date is in a different month', () => {
      expect(isInMonth('2026-02-15', '2026-01')).toBe(false);
      expect(isInMonth('2025-01-15', '2026-01')).toBe(false);
    });

    it('returns false for null date', () => {
      expect(isInMonth(null, '2026-01')).toBe(false);
    });

    it('returns false for invalid yearMonth format', () => {
      expect(isInMonth('2026-01-15', '')).toBe(false);
      expect(isInMonth('2026-01-15', '2026')).toBe(false);
      expect(isInMonth('2026-01-15', '2026-1')).toBe(false);
      expect(isInMonth('2026-01-15', 'invalid')).toBe(false);
      expect(isInMonth('2026-01-15', '2026-01-15')).toBe(false);
    });

    it('returns false for invalid date format', () => {
      expect(isInMonth('invalid', '2026-01')).toBe(false);
      expect(isInMonth('2026-1-15', '2026-01')).toBe(false);
      expect(isInMonth('20260115', '2026-01')).toBe(false);
    });

    it('returns false for non-existent date', () => {
      expect(isInMonth('2026-02-30', '2026-02')).toBe(false);
      expect(isInMonth('2026-04-31', '2026-04')).toBe(false);
    });
  });
});
