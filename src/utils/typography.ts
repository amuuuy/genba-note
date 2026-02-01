/**
 * Typography Utilities
 *
 * Provides scalable font sizes following system accessibility settings.
 * Uses PixelRatio.getFontScale() for system-aware scaling.
 *
 * SPEC 3.5 Requirement: Font size follows system settings
 */

import { PixelRatio, TextStyle } from 'react-native';

/**
 * Base font sizes (design spec)
 * These values represent the default sizes before system scaling is applied.
 */
export const FONT_SIZES = {
  /** 11px - Extra small (tax rates, minor labels) */
  xs: 11,
  /** 12px - Small (badges, secondary info) */
  sm: 12,
  /** 13px - Medium (date, prices) */
  md: 13,
  /** 14px - Base (body text, labels) */
  base: 14,
  /** 15px - Large (item names) */
  lg: 15,
  /** 16px - Extra large (input text, client names) */
  xl: 16,
  /** 17px - 2x large (modal titles) */
  '2xl': 17,
  /** 20px - 3x large (headers) */
  '3xl': 20,
  /** 24px - 4x large (large headers) */
  '4xl': 24,
} as const;

export type FontSizeKey = keyof typeof FONT_SIZES;

/**
 * Maximum font scale multiplier.
 * Limits scaling to prevent layout issues at very large font sizes.
 */
const MAX_FONT_SCALE = 1.5;

/**
 * Get the current system font scale, clamped to MAX_FONT_SCALE.
 *
 * @returns The clamped font scale value (1.0 to MAX_FONT_SCALE)
 */
export function getFontScale(): number {
  const fontScale = PixelRatio.getFontScale();
  return Math.min(fontScale, MAX_FONT_SCALE);
}

/**
 * Get scaled font size based on system settings.
 * Respects user's accessibility font size preferences while
 * preventing extreme scaling that could break layouts.
 *
 * @param baseSize - The base font size in pixels
 * @returns The scaled font size, rounded to nearest integer
 *
 * @example
 * // With system font scale at 1.0
 * getScaledFontSize(14) // returns 14
 *
 * // With system font scale at 1.25
 * getScaledFontSize(14) // returns 18
 *
 * // With system font scale at 2.0 (clamped to 1.5)
 * getScaledFontSize(14) // returns 21
 */
export function getScaledFontSize(baseSize: number): number {
  const clampedScale = getFontScale();
  return Math.round(baseSize * clampedScale);
}

/**
 * Get a scaled font size using a predefined size key.
 *
 * @param sizeKey - Key from FONT_SIZES
 * @returns The scaled font size
 *
 * @example
 * getScaledFontSizeByKey('base') // returns scaled 14px
 * getScaledFontSizeByKey('lg')   // returns scaled 15px
 */
export function getScaledFontSizeByKey(sizeKey: FontSizeKey): number {
  return getScaledFontSize(FONT_SIZES[sizeKey]);
}

/**
 * Create a text style object with scaled font size.
 * Useful for inline style composition.
 *
 * @param baseSize - The base font size in pixels
 * @param additionalStyles - Optional additional text styles to merge
 * @returns A TextStyle object with the scaled fontSize
 *
 * @example
 * const styles = StyleSheet.create({
 *   label: {
 *     ...createScaledTextStyle(14, { fontWeight: '500', color: '#000' }),
 *   },
 * });
 */
export function createScaledTextStyle(
  baseSize: number,
  additionalStyles?: Partial<TextStyle>
): TextStyle {
  return {
    fontSize: getScaledFontSize(baseSize),
    ...additionalStyles,
  };
}

/**
 * Check if the system font scale is larger than default.
 * Useful for conditionally adjusting layouts for accessibility.
 *
 * @returns true if font scale is greater than 1.0
 */
export function isLargeFontScale(): boolean {
  return PixelRatio.getFontScale() > 1.0;
}

/**
 * Get a line height based on font size.
 * Uses a standard multiplier for comfortable reading.
 *
 * @param fontSize - The font size to calculate line height for
 * @param multiplier - Line height multiplier (default 1.4)
 * @returns The calculated line height
 */
export function getLineHeight(fontSize: number, multiplier: number = 1.4): number {
  return Math.round(fontSize * multiplier);
}
