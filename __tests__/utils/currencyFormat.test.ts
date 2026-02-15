/**
 * Tests for formatCurrency function
 *
 * Verifies that currency values are formatted with thousand separators.
 */

import { formatCurrency } from '@/utils/currencyFormat';

describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0');
  });

  it('formats small number without separator', () => {
    expect(formatCurrency(500)).toBe('500');
  });

  it('formats with thousand separator', () => {
    expect(formatCurrency(1234)).toBe('1,234');
  });

  it('formats large number with multiple separators', () => {
    expect(formatCurrency(1234567)).toBe('1,234,567');
  });

  it('formats negative number', () => {
    expect(formatCurrency(-9876)).toBe('-9,876');
  });
});
