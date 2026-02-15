/**
 * Currency Formatting Utilities
 *
 * Functions for formatting monetary values in Japanese style.
 */

/**
 * Format currency with thousand separators for display.
 * @param value - Amount in yen
 * @returns Formatted string with commas (e.g., "1,234,567")
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('ja-JP');
}

/**
 * Format a numeric string for Y-axis labels in Japanese currency display.
 * Handles negative values and large amounts.
 *
 * @param value - The raw Y-axis value as string
 * @returns Formatted label (e.g., "-3千万", "1.5億")
 *
 * @example
 * formatYAxisLabel('10000000') // '1千万'
 * formatYAxisLabel('-30000000') // '-3千万'
 * formatYAxisLabel('100000000') // '1億'
 */
export function formatYAxisLabel(value: string): string {
  const num = parseFloat(value);

  if (isNaN(num)) return '0';
  if (num === 0) return '0';

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  // Helper to format with optional decimal (removes trailing .0)
  const formatWithDecimal = (val: number): string => {
    const rounded = Math.round(val * 10) / 10; // Round to 1 decimal place
    return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
  };

  // 1億以上 (100,000,000+)
  if (absNum >= 100000000) {
    return `${sign}${formatWithDecimal(absNum / 100000000)}億`;
  }
  // 1000万以上 (10,000,000+)
  if (absNum >= 10000000) {
    return `${sign}${formatWithDecimal(absNum / 10000000)}千万`;
  }
  // 1万以上 (10,000+)
  if (absNum >= 10000) {
    return `${sign}${formatWithDecimal(absNum / 10000)}万`;
  }
  // 1000以上
  if (absNum >= 1000) {
    return `${sign}${formatWithDecimal(absNum / 1000)}千`;
  }

  const rounded = Math.round(absNum);
  if (rounded === 0) return '0';
  return `${sign}${rounded}`;
}
