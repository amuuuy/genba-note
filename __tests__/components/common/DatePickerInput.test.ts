/**
 * DatePickerInput Pure Functions Tests
 *
 * Tests the date formatting and parsing logic.
 * Component rendering is verified manually.
 */

import {
  formatDateForDisplay,
  parseDateInput,
} from '@/components/common/dateInputHelpers';

describe('DatePickerInput', () => {
  describe('formatDateForDisplay', () => {
    it('formats valid date to Japanese format', () => {
      expect(formatDateForDisplay('2026-01-31')).toBe('2026年1月31日');
      expect(formatDateForDisplay('2026-12-01')).toBe('2026年12月1日');
    });

    it('returns empty string for null', () => {
      expect(formatDateForDisplay(null)).toBe('');
    });

    it('returns empty string for invalid date', () => {
      expect(formatDateForDisplay('invalid')).toBe('');
      expect(formatDateForDisplay('2026-13-01')).toBe(''); // invalid month
      expect(formatDateForDisplay('2026-02-30')).toBe(''); // invalid day
    });

    it('strips leading zeros from month and day', () => {
      expect(formatDateForDisplay('2026-01-01')).toBe('2026年1月1日');
      expect(formatDateForDisplay('2026-09-05')).toBe('2026年9月5日');
    });
  });

  describe('parseDateInput', () => {
    it('parses ISO format (YYYY-MM-DD)', () => {
      expect(parseDateInput('2026-01-31')).toBe('2026-01-31');
      expect(parseDateInput('2026-12-01')).toBe('2026-12-01');
    });

    it('parses slash format (YYYY/MM/DD)', () => {
      expect(parseDateInput('2026/01/31')).toBe('2026-01-31');
      expect(parseDateInput('2026/12/01')).toBe('2026-12-01');
    });

    it('parses compact format (YYYYMMDD)', () => {
      expect(parseDateInput('20260131')).toBe('2026-01-31');
      expect(parseDateInput('20261201')).toBe('2026-12-01');
    });

    it('returns null for empty string', () => {
      expect(parseDateInput('')).toBeNull();
      expect(parseDateInput('   ')).toBeNull();
    });

    it('returns null for invalid date', () => {
      expect(parseDateInput('invalid')).toBeNull();
      expect(parseDateInput('2026-13-01')).toBeNull(); // invalid month
      expect(parseDateInput('2026-02-30')).toBeNull(); // invalid day
      expect(parseDateInput('20261301')).toBeNull(); // invalid month compact
    });

    it('returns null for partial input', () => {
      expect(parseDateInput('2026')).toBeNull();
      expect(parseDateInput('2026-01')).toBeNull();
      expect(parseDateInput('202601')).toBeNull();
    });

    it('trims whitespace before parsing', () => {
      expect(parseDateInput('  2026-01-31  ')).toBe('2026-01-31');
      expect(parseDateInput('\t20260131\n')).toBe('2026-01-31');
    });
  });
});
