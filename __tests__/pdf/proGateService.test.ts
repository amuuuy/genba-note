/**
 * Tests for Pro Gate Service (Placeholder)
 *
 * This service provides a placeholder implementation for Pro feature checking.
 * It will be replaced with RevenueCat integration in Milestone 12.
 */

import {
  checkProStatus,
  setProStatusOverride,
  resetProStatusOverride,
} from '@/pdf/proGateService';

describe('proGateService (placeholder)', () => {
  afterEach(() => {
    resetProStatusOverride();
  });

  describe('checkProStatus', () => {
    it('returns isPro: false by default', () => {
      const result = checkProStatus();

      expect(result.isPro).toBe(false);
      expect(result.reason).toBe('placeholder_always_false');
    });
  });

  describe('setProStatusOverride', () => {
    it('can be overridden to true for testing', () => {
      setProStatusOverride(true);
      const result = checkProStatus();

      expect(result.isPro).toBe(true);
      expect(result.reason).toBe('placeholder_always_true');
    });

    it('can be overridden to false explicitly', () => {
      setProStatusOverride(true);
      setProStatusOverride(false);
      const result = checkProStatus();

      expect(result.isPro).toBe(false);
      expect(result.reason).toBe('placeholder_always_false');
    });
  });

  describe('resetProStatusOverride', () => {
    it('resets override to default behavior', () => {
      setProStatusOverride(true);
      expect(checkProStatus().isPro).toBe(true);

      resetProStatusOverride();
      expect(checkProStatus().isPro).toBe(false);
    });
  });
});
