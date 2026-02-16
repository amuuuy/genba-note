/**
 * TemplatePickerModal Logic Tests
 *
 * Tests the seal size section visibility logic and constants integration:
 * - Seal size section display condition (both props required)
 * - Chip labels and option values
 * - Independence from template options
 *
 * Note: The React component rendering is verified manually.
 * We test only the pure logic here, following the project pattern
 * (testEnvironment: 'node', no @testing-library/react-native available).
 */

import { SEAL_SIZE_OPTIONS } from '../../../src/constants/sealSizeOptions';
import { TEMPLATE_OPTIONS } from '../../../src/constants/templateOptions';
import type { SealSize } from '../../../src/types/settings';

/**
 * Pure function extracted from TemplatePickerModal for testability.
 * Determines whether the seal size section should be visible.
 *
 * In the component, this logic is:
 *   {currentSealSize != null && onSealSizeSelect && ( <> seal size UI </> )}
 */
function shouldShowSealSizeSection(
  currentSealSize: SealSize | undefined,
  onSealSizeSelect: ((s: SealSize) => void) | undefined,
): boolean {
  return currentSealSize != null && onSealSizeSelect != null;
}

describe('TemplatePickerModal seal size integration', () => {
  describe('seal size section visibility logic', () => {
    it('shows when both currentSealSize and onSealSizeSelect are provided', () => {
      const handler = (_s: SealSize) => {};
      expect(shouldShowSealSizeSection('MEDIUM', handler)).toBe(true);
      expect(shouldShowSealSizeSection('SMALL', handler)).toBe(true);
      expect(shouldShowSealSizeSection('LARGE', handler)).toBe(true);
    });

    it('hides when currentSealSize is undefined', () => {
      const handler = (_s: SealSize) => {};
      expect(shouldShowSealSizeSection(undefined, handler)).toBe(false);
    });

    it('hides when onSealSizeSelect is undefined', () => {
      expect(shouldShowSealSizeSection('MEDIUM', undefined)).toBe(false);
    });

    it('hides when both are undefined', () => {
      expect(shouldShowSealSizeSection(undefined, undefined)).toBe(false);
    });
  });

  describe('SEAL_SIZE_OPTIONS for chip display', () => {
    it('all options have single-character labels suitable for chip display', () => {
      SEAL_SIZE_OPTIONS.forEach((option) => {
        expect(option.label.length).toBe(1);
      });
    });

    it('SMALL label is 小', () => {
      expect(SEAL_SIZE_OPTIONS.find((o) => o.value === 'SMALL')?.label).toBe('小');
    });

    it('MEDIUM label is 中', () => {
      expect(SEAL_SIZE_OPTIONS.find((o) => o.value === 'MEDIUM')?.label).toBe('中');
    });

    it('LARGE label is 大', () => {
      expect(SEAL_SIZE_OPTIONS.find((o) => o.value === 'LARGE')?.label).toBe('大');
    });
  });

  describe('template options and seal size options are independent', () => {
    it('have no overlapping values', () => {
      const templateValues = TEMPLATE_OPTIONS.map((o) => o.value as string);
      const sealValues = SEAL_SIZE_OPTIONS.map((o) => o.value as string);
      const overlap = templateValues.filter((v) => sealValues.includes(v));
      expect(overlap).toHaveLength(0);
    });
  });
});
