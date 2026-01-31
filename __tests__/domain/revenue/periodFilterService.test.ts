/**
 * Period Filter Service Tests
 *
 * TDD: Tests are written first, implementation follows.
 * Tests cover period date range calculations per SPEC 2.6.2.
 */

import {
  getPeriodDateRange,
  isDateInPeriod,
  isValidPeriodType,
} from '@/domain/revenue/periodFilterService';
import type { PeriodType } from '@/domain/revenue/types';

describe('periodFilterService', () => {
  // === isValidPeriodType ===

  describe('isValidPeriodType', () => {
    it('should return true for "this-month"', () => {
      expect(isValidPeriodType('this-month')).toBe(true);
    });

    it('should return true for "last-3-months"', () => {
      expect(isValidPeriodType('last-3-months')).toBe(true);
    });

    it('should return true for "this-year"', () => {
      expect(isValidPeriodType('this-year')).toBe(true);
    });

    it('should return false for invalid strings', () => {
      expect(isValidPeriodType('invalid')).toBe(false);
      expect(isValidPeriodType('this-week')).toBe(false);
      expect(isValidPeriodType('last-month')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidPeriodType('')).toBe(false);
    });
  });

  // === getPeriodDateRange - this-month ===

  describe('getPeriodDateRange - this-month', () => {
    it('should return first and last day of current month', () => {
      const range = getPeriodDateRange('this-month', '2026-01-15');
      expect(range.startDate).toBe('2026-01-01');
      expect(range.endDate).toBe('2026-01-31');
    });

    it('should handle month with 30 days', () => {
      const range = getPeriodDateRange('this-month', '2026-04-15');
      expect(range.startDate).toBe('2026-04-01');
      expect(range.endDate).toBe('2026-04-30');
    });

    it('should handle February in non-leap year (28 days)', () => {
      const range = getPeriodDateRange('this-month', '2025-02-15');
      expect(range.startDate).toBe('2025-02-01');
      expect(range.endDate).toBe('2025-02-28');
    });

    it('should handle February in leap year (29 days)', () => {
      const range = getPeriodDateRange('this-month', '2024-02-15');
      expect(range.startDate).toBe('2024-02-01');
      expect(range.endDate).toBe('2024-02-29');
    });

    it('should handle December (31 days)', () => {
      const range = getPeriodDateRange('this-month', '2026-12-25');
      expect(range.startDate).toBe('2026-12-01');
      expect(range.endDate).toBe('2026-12-31');
    });

    it('should work when reference date is first day of month', () => {
      const range = getPeriodDateRange('this-month', '2026-03-01');
      expect(range.startDate).toBe('2026-03-01');
      expect(range.endDate).toBe('2026-03-31');
    });

    it('should work when reference date is last day of month', () => {
      const range = getPeriodDateRange('this-month', '2026-03-31');
      expect(range.startDate).toBe('2026-03-01');
      expect(range.endDate).toBe('2026-03-31');
    });
  });

  // === getPeriodDateRange - last-3-months ===

  describe('getPeriodDateRange - last-3-months', () => {
    it('should return 3-month range (current month + 2 previous)', () => {
      // March: includes Jan, Feb, Mar
      const range = getPeriodDateRange('last-3-months', '2026-03-15');
      expect(range.startDate).toBe('2026-01-01');
      expect(range.endDate).toBe('2026-03-31');
    });

    it('should handle mid-year reference', () => {
      // June: includes Apr, May, Jun
      const range = getPeriodDateRange('last-3-months', '2026-06-20');
      expect(range.startDate).toBe('2026-04-01');
      expect(range.endDate).toBe('2026-06-30');
    });

    it('should handle year boundary - January reference', () => {
      // Jan 2026: includes Nov 2025, Dec 2025, Jan 2026
      const range = getPeriodDateRange('last-3-months', '2026-01-15');
      expect(range.startDate).toBe('2025-11-01');
      expect(range.endDate).toBe('2026-01-31');
    });

    it('should handle year boundary - February reference', () => {
      // Feb 2026: includes Dec 2025, Jan 2026, Feb 2026
      const range = getPeriodDateRange('last-3-months', '2026-02-10');
      expect(range.startDate).toBe('2025-12-01');
      expect(range.endDate).toBe('2026-02-28');
    });

    it('should handle December reference (no year boundary)', () => {
      // Dec: includes Oct, Nov, Dec
      const range = getPeriodDateRange('last-3-months', '2026-12-25');
      expect(range.startDate).toBe('2026-10-01');
      expect(range.endDate).toBe('2026-12-31');
    });

    it('should handle February end in leap year', () => {
      // Feb 2024 (leap year): includes Dec 2023, Jan 2024, Feb 2024
      const range = getPeriodDateRange('last-3-months', '2024-02-15');
      expect(range.startDate).toBe('2023-12-01');
      expect(range.endDate).toBe('2024-02-29');
    });
  });

  // === getPeriodDateRange - this-year ===

  describe('getPeriodDateRange - this-year', () => {
    it('should return Jan 1st to Dec 31st of reference year', () => {
      const range = getPeriodDateRange('this-year', '2026-06-15');
      expect(range.startDate).toBe('2026-01-01');
      expect(range.endDate).toBe('2026-12-31');
    });

    it('should work with January reference', () => {
      const range = getPeriodDateRange('this-year', '2026-01-01');
      expect(range.startDate).toBe('2026-01-01');
      expect(range.endDate).toBe('2026-12-31');
    });

    it('should work with December reference', () => {
      const range = getPeriodDateRange('this-year', '2026-12-31');
      expect(range.startDate).toBe('2026-01-01');
      expect(range.endDate).toBe('2026-12-31');
    });

    it('should work with different years', () => {
      const range2025 = getPeriodDateRange('this-year', '2025-07-15');
      expect(range2025.startDate).toBe('2025-01-01');
      expect(range2025.endDate).toBe('2025-12-31');

      const range2027 = getPeriodDateRange('this-year', '2027-03-10');
      expect(range2027.startDate).toBe('2027-01-01');
      expect(range2027.endDate).toBe('2027-12-31');
    });
  });

  // === isDateInPeriod ===

  describe('isDateInPeriod', () => {
    describe('with this-month period', () => {
      const REFERENCE = '2026-01-15';

      it('should return true for date within period', () => {
        expect(isDateInPeriod('2026-01-10', 'this-month', REFERENCE)).toBe(true);
        expect(isDateInPeriod('2026-01-20', 'this-month', REFERENCE)).toBe(true);
      });

      it('should return true for date on start boundary', () => {
        expect(isDateInPeriod('2026-01-01', 'this-month', REFERENCE)).toBe(true);
      });

      it('should return true for date on end boundary', () => {
        expect(isDateInPeriod('2026-01-31', 'this-month', REFERENCE)).toBe(true);
      });

      it('should return false for date before period', () => {
        expect(isDateInPeriod('2025-12-31', 'this-month', REFERENCE)).toBe(false);
      });

      it('should return false for date after period', () => {
        expect(isDateInPeriod('2026-02-01', 'this-month', REFERENCE)).toBe(false);
      });

      it('should return false for null date', () => {
        expect(isDateInPeriod(null, 'this-month', REFERENCE)).toBe(false);
      });
    });

    describe('with last-3-months period', () => {
      const REFERENCE = '2026-03-15';
      // Range: 2026-01-01 to 2026-03-31

      it('should return true for date in first month of range', () => {
        expect(isDateInPeriod('2026-01-15', 'last-3-months', REFERENCE)).toBe(true);
      });

      it('should return true for date in middle month of range', () => {
        expect(isDateInPeriod('2026-02-15', 'last-3-months', REFERENCE)).toBe(true);
      });

      it('should return true for date in last month of range', () => {
        expect(isDateInPeriod('2026-03-15', 'last-3-months', REFERENCE)).toBe(true);
      });

      it('should return true for start boundary', () => {
        expect(isDateInPeriod('2026-01-01', 'last-3-months', REFERENCE)).toBe(true);
      });

      it('should return true for end boundary', () => {
        expect(isDateInPeriod('2026-03-31', 'last-3-months', REFERENCE)).toBe(true);
      });

      it('should return false for date before range', () => {
        expect(isDateInPeriod('2025-12-31', 'last-3-months', REFERENCE)).toBe(false);
      });

      it('should return false for date after range', () => {
        expect(isDateInPeriod('2026-04-01', 'last-3-months', REFERENCE)).toBe(false);
      });
    });

    describe('with this-year period', () => {
      const REFERENCE = '2026-06-15';

      it('should return true for any date in same year', () => {
        expect(isDateInPeriod('2026-01-01', 'this-year', REFERENCE)).toBe(true);
        expect(isDateInPeriod('2026-06-15', 'this-year', REFERENCE)).toBe(true);
        expect(isDateInPeriod('2026-12-31', 'this-year', REFERENCE)).toBe(true);
      });

      it('should return false for date in previous year', () => {
        expect(isDateInPeriod('2025-12-31', 'this-year', REFERENCE)).toBe(false);
      });

      it('should return false for date in next year', () => {
        expect(isDateInPeriod('2027-01-01', 'this-year', REFERENCE)).toBe(false);
      });
    });

    describe('with year boundary (last-3-months)', () => {
      const REFERENCE = '2026-01-15';
      // Range: 2025-11-01 to 2026-01-31

      it('should include dates from previous year', () => {
        expect(isDateInPeriod('2025-11-15', 'last-3-months', REFERENCE)).toBe(true);
        expect(isDateInPeriod('2025-12-25', 'last-3-months', REFERENCE)).toBe(true);
      });

      it('should include dates from current year', () => {
        expect(isDateInPeriod('2026-01-15', 'last-3-months', REFERENCE)).toBe(true);
      });

      it('should exclude dates before 3-month range', () => {
        expect(isDateInPeriod('2025-10-31', 'last-3-months', REFERENCE)).toBe(false);
      });
    });
  });
});
