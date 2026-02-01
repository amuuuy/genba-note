import { PixelRatio } from 'react-native';
import {
  FONT_SIZES,
  getFontScale,
  getScaledFontSize,
  getScaledFontSizeByKey,
  createScaledTextStyle,
  isLargeFontScale,
  getLineHeight,
} from '../../src/utils/typography';

// Mock PixelRatio
jest.mock('react-native', () => ({
  PixelRatio: {
    getFontScale: jest.fn(),
  },
}));

const mockGetFontScale = PixelRatio.getFontScale as jest.Mock;

describe('typography', () => {
  beforeEach(() => {
    mockGetFontScale.mockReset();
  });

  describe('FONT_SIZES', () => {
    it('defines standard font sizes', () => {
      expect(FONT_SIZES.xs).toBe(11);
      expect(FONT_SIZES.sm).toBe(12);
      expect(FONT_SIZES.md).toBe(13);
      expect(FONT_SIZES.base).toBe(14);
      expect(FONT_SIZES.lg).toBe(15);
      expect(FONT_SIZES.xl).toBe(16);
      expect(FONT_SIZES['2xl']).toBe(17);
      expect(FONT_SIZES['3xl']).toBe(20);
      expect(FONT_SIZES['4xl']).toBe(24);
    });
  });

  describe('getFontScale', () => {
    it('returns font scale when <= 1.5', () => {
      mockGetFontScale.mockReturnValue(1.0);
      expect(getFontScale()).toBe(1.0);

      mockGetFontScale.mockReturnValue(1.25);
      expect(getFontScale()).toBe(1.25);

      mockGetFontScale.mockReturnValue(1.5);
      expect(getFontScale()).toBe(1.5);
    });

    it('clamps font scale to 1.5 when > 1.5', () => {
      mockGetFontScale.mockReturnValue(1.75);
      expect(getFontScale()).toBe(1.5);

      mockGetFontScale.mockReturnValue(2.0);
      expect(getFontScale()).toBe(1.5);
    });
  });

  describe('getScaledFontSize', () => {
    it('returns base size when scale is 1.0', () => {
      mockGetFontScale.mockReturnValue(1.0);
      expect(getScaledFontSize(14)).toBe(14);
      expect(getScaledFontSize(16)).toBe(16);
    });

    it('scales font size based on system setting', () => {
      mockGetFontScale.mockReturnValue(1.25);
      expect(getScaledFontSize(16)).toBe(20); // 16 * 1.25 = 20
      expect(getScaledFontSize(14)).toBe(18); // 14 * 1.25 = 17.5 -> 18
    });

    it('clamps maximum scale to 1.5x', () => {
      mockGetFontScale.mockReturnValue(2.0);
      expect(getScaledFontSize(16)).toBe(24); // 16 * 1.5 = 24
      expect(getScaledFontSize(14)).toBe(21); // 14 * 1.5 = 21
    });

    it('rounds to nearest integer', () => {
      mockGetFontScale.mockReturnValue(1.1);
      expect(getScaledFontSize(15)).toBe(17); // 15 * 1.1 = 16.5 -> 17
    });
  });

  describe('getScaledFontSizeByKey', () => {
    it('returns scaled font size for each size key', () => {
      mockGetFontScale.mockReturnValue(1.0);
      expect(getScaledFontSizeByKey('xs')).toBe(11);
      expect(getScaledFontSizeByKey('base')).toBe(14);
      expect(getScaledFontSizeByKey('xl')).toBe(16);
    });

    it('applies scaling to keyed sizes', () => {
      mockGetFontScale.mockReturnValue(1.25);
      expect(getScaledFontSizeByKey('base')).toBe(18); // 14 * 1.25 = 17.5 -> 18
    });
  });

  describe('createScaledTextStyle', () => {
    it('creates text style with scaled font size', () => {
      mockGetFontScale.mockReturnValue(1.0);
      const style = createScaledTextStyle(14);
      expect(style).toEqual({ fontSize: 14 });
    });

    it('merges additional styles', () => {
      mockGetFontScale.mockReturnValue(1.0);
      const style = createScaledTextStyle(14, {
        fontWeight: '500',
        color: '#000',
      });
      expect(style).toEqual({
        fontSize: 14,
        fontWeight: '500',
        color: '#000',
      });
    });

    it('applies scaling', () => {
      mockGetFontScale.mockReturnValue(1.25);
      const style = createScaledTextStyle(16, { fontWeight: 'bold' });
      expect(style).toEqual({
        fontSize: 20,
        fontWeight: 'bold',
      });
    });
  });

  describe('isLargeFontScale', () => {
    it('returns false when scale is 1.0', () => {
      mockGetFontScale.mockReturnValue(1.0);
      expect(isLargeFontScale()).toBe(false);
    });

    it('returns true when scale is greater than 1.0', () => {
      mockGetFontScale.mockReturnValue(1.1);
      expect(isLargeFontScale()).toBe(true);

      mockGetFontScale.mockReturnValue(1.5);
      expect(isLargeFontScale()).toBe(true);
    });

    it('returns false when scale is less than 1.0', () => {
      mockGetFontScale.mockReturnValue(0.9);
      expect(isLargeFontScale()).toBe(false);
    });
  });

  describe('getLineHeight', () => {
    it('calculates line height with default multiplier 1.4', () => {
      expect(getLineHeight(14)).toBe(20); // 14 * 1.4 = 19.6 -> 20
      expect(getLineHeight(16)).toBe(22); // 16 * 1.4 = 22.4 -> 22
    });

    it('uses custom multiplier when provided', () => {
      expect(getLineHeight(14, 1.5)).toBe(21); // 14 * 1.5 = 21
      expect(getLineHeight(16, 1.2)).toBe(19); // 16 * 1.2 = 19.2 -> 19
    });

    it('rounds to nearest integer', () => {
      expect(getLineHeight(15, 1.3)).toBe(20); // 15 * 1.3 = 19.5 -> 20
    });
  });
});
