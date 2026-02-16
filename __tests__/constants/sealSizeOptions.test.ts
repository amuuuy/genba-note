import { SEAL_SIZE_OPTIONS } from '../../src/constants/sealSizeOptions';
import { SEAL_SIZES } from '../../src/types/settings';

describe('SEAL_SIZE_OPTIONS', () => {
  it('has exactly 3 options', () => {
    expect(SEAL_SIZE_OPTIONS).toHaveLength(3);
  });

  it('covers all SealSize values', () => {
    const values = SEAL_SIZE_OPTIONS.map((o) => o.value);
    expect(values).toEqual([...SEAL_SIZES]);
  });

  it('has correct labels (小, 中, 大)', () => {
    expect(SEAL_SIZE_OPTIONS[0].label).toBe('小');
    expect(SEAL_SIZE_OPTIONS[1].label).toBe('中');
    expect(SEAL_SIZE_OPTIONS[2].label).toBe('大');
  });

  it('has non-empty description for each option', () => {
    SEAL_SIZE_OPTIONS.forEach((option) => {
      expect(option.description.length).toBeGreaterThan(0);
    });
  });
});
