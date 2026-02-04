/**
 * Tests for formatYAxisLabel function
 *
 * Verifies that Y-axis labels are correctly formatted for Japanese currency display.
 */

import { formatYAxisLabel } from '@/utils/currencyFormat';

describe('formatYAxisLabel', () => {
  describe('positive values', () => {
    it('should format 1億 (100,000,000)', () => {
      expect(formatYAxisLabel('100000000')).toBe('1億');
    });

    it('should format 1.5億 (150,000,000)', () => {
      expect(formatYAxisLabel('150000000')).toBe('1.5億');
    });

    it('should format 10億 (1,000,000,000) without decimal', () => {
      expect(formatYAxisLabel('1000000000')).toBe('10億');
    });

    it('should format 1千万 (10,000,000)', () => {
      expect(formatYAxisLabel('10000000')).toBe('1千万');
    });

    it('should format 4.1千万 (41,000,000)', () => {
      expect(formatYAxisLabel('41000000')).toBe('4.1千万');
    });

    it('should format 1000万 (10,000,000) as 千万', () => {
      expect(formatYAxisLabel('10000000')).toBe('1千万');
    });

    it('should format 100万 (1,000,000) as 万', () => {
      expect(formatYAxisLabel('1000000')).toBe('100万');
    });

    it('should format 10万 (100,000) as 万', () => {
      expect(formatYAxisLabel('100000')).toBe('10万');
    });

    it('should format 1万 (10,000) as 万', () => {
      expect(formatYAxisLabel('10000')).toBe('1万');
    });

    it('should format 5千 (5,000)', () => {
      expect(formatYAxisLabel('5000')).toBe('5千');
    });

    it('should format 1.5千 (1,500)', () => {
      expect(formatYAxisLabel('1500')).toBe('1.5千');
    });

    it('should format small values as-is', () => {
      expect(formatYAxisLabel('500')).toBe('500');
      expect(formatYAxisLabel('100')).toBe('100');
      expect(formatYAxisLabel('0')).toBe('0');
    });
  });

  describe('negative values', () => {
    it('should format -3000万 (-30,000,000)', () => {
      expect(formatYAxisLabel('-30000000')).toBe('-3千万');
    });

    it('should format -4100万 (-41,000,000)', () => {
      expect(formatYAxisLabel('-41000000')).toBe('-4.1千万');
    });

    it('should format -1億 (-100,000,000)', () => {
      expect(formatYAxisLabel('-100000000')).toBe('-1億');
    });

    it('should format -100万 (-1,000,000)', () => {
      expect(formatYAxisLabel('-1000000')).toBe('-100万');
    });

    it('should format -1万 (-10,000)', () => {
      expect(formatYAxisLabel('-10000')).toBe('-1万');
    });

    it('should format -5千 (-5,000)', () => {
      expect(formatYAxisLabel('-5000')).toBe('-5千');
    });

    it('should format small negative values', () => {
      expect(formatYAxisLabel('-500')).toBe('-500');
      expect(formatYAxisLabel('-100')).toBe('-100');
    });
  });

  describe('edge cases', () => {
    it('should handle NaN (invalid string)', () => {
      expect(formatYAxisLabel('abc')).toBe('0');
    });

    it('should handle empty string', () => {
      expect(formatYAxisLabel('')).toBe('0');
    });

    it('should handle floating point string', () => {
      // parseFloat handles decimal values correctly
      expect(formatYAxisLabel('10000.5')).toBe('1万');
    });

    it('should handle zero', () => {
      expect(formatYAxisLabel('0')).toBe('0');
    });

    it('should handle negative zero', () => {
      expect(formatYAxisLabel('-0')).toBe('0');
    });

    it('should handle small negative decimal (-0.4) as zero', () => {
      expect(formatYAxisLabel('-0.4')).toBe('0');
    });

    it('should handle small positive decimal (0.4) as zero', () => {
      expect(formatYAxisLabel('0.4')).toBe('0');
    });

    it('should handle boundary value near 千 (999.6)', () => {
      // 999.6 < 1000, so it falls into the small values branch and rounds to 1000
      expect(formatYAxisLabel('999.6')).toBe('1000');
    });

    it('should handle boundary value near 万 (9999.5)', () => {
      // 9999.5 >= 1000 but < 10000, so it shows as 千
      expect(formatYAxisLabel('9999.5')).toBe('10千');
    });

    it('should handle exact 千 boundary (1000)', () => {
      expect(formatYAxisLabel('1000')).toBe('1千');
    });

    it('should handle exact 万 boundary (10000)', () => {
      expect(formatYAxisLabel('10000')).toBe('1万');
    });
  });
});
