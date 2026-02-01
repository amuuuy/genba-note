/**
 * ReadOnlyBanner Component Tests
 *
 * Tests the read-only mode banner functionality:
 * - Banner configuration (colors, messages)
 * - Visibility logic
 * - Retry button behavior
 */

import {
  getReadOnlyBannerConfig,
  type ReadOnlyBannerConfig,
} from '@/components/common/readOnlyBannerConfig';

describe('ReadOnlyBanner', () => {
  describe('getReadOnlyBannerConfig', () => {
    it('returns default config when no error message provided', () => {
      const config = getReadOnlyBannerConfig();

      expect(config.title).toBe('読み取り専用モード');
      expect(config.defaultMessage).toBe('データベースエラーにより、変更を保存できません。');
      expect(config.retryButtonText).toBe('再試行');
      expect(config.retryingText).toBe('復旧中...');
    });

    it('returns correct color scheme for warning banner', () => {
      const config = getReadOnlyBannerConfig();

      // Warning color scheme (yellow/amber)
      expect(config.backgroundColor).toBe('#FFF3CD');
      expect(config.borderColor).toBe('#FFCA28');
      expect(config.textColor).toBe('#856404');
      expect(config.iconColor).toBe('#FF9800');
    });

    it('returns custom message when provided', () => {
      const customMessage = 'マイグレーションに失敗しました';
      const config = getReadOnlyBannerConfig(customMessage);

      expect(config.customMessage).toBe(customMessage);
    });

    it('provides success and failure messages for retry', () => {
      const config = getReadOnlyBannerConfig();

      expect(config.retrySuccessMessage).toBe('データベースが復旧しました。');
      expect(config.retryFailureMessage).toBe('復旧に失敗しました。後でもう一度お試しください。');
    });

    it('config has all required properties', () => {
      const config = getReadOnlyBannerConfig();

      // All required properties for the banner
      expect(config).toHaveProperty('title');
      expect(config).toHaveProperty('defaultMessage');
      expect(config).toHaveProperty('retryButtonText');
      expect(config).toHaveProperty('retryingText');
      expect(config).toHaveProperty('backgroundColor');
      expect(config).toHaveProperty('borderColor');
      expect(config).toHaveProperty('textColor');
      expect(config).toHaveProperty('iconColor');
      expect(config).toHaveProperty('retrySuccessMessage');
      expect(config).toHaveProperty('retryFailureMessage');
    });
  });

  describe('ReadOnlyBannerConfig type', () => {
    it('config conforms to interface', () => {
      const config: ReadOnlyBannerConfig = getReadOnlyBannerConfig();

      // Type check - if this compiles, the config matches the interface
      expect(typeof config.title).toBe('string');
      expect(typeof config.defaultMessage).toBe('string');
      expect(typeof config.retryButtonText).toBe('string');
      expect(typeof config.retryingText).toBe('string');
      expect(typeof config.backgroundColor).toBe('string');
      expect(typeof config.borderColor).toBe('string');
      expect(typeof config.textColor).toBe('string');
      expect(typeof config.iconColor).toBe('string');
      expect(typeof config.retrySuccessMessage).toBe('string');
      expect(typeof config.retryFailureMessage).toBe('string');
    });

    it('customMessage is optional', () => {
      const configWithoutCustom = getReadOnlyBannerConfig();
      const configWithCustom = getReadOnlyBannerConfig('Test message');

      expect(configWithoutCustom.customMessage).toBeUndefined();
      expect(configWithCustom.customMessage).toBe('Test message');
    });
  });
});
