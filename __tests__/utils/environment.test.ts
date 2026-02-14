/**
 * Tests for Environment Utilities
 *
 * Tests development mode detection logic.
 */

describe('environment', () => {
  // Save original values
  const originalDEV = (global as any).__DEV__;
  const originalEnv = process.env.EXPO_PUBLIC_APP_ENV;

  beforeEach(() => {
    // Reset module cache to get fresh imports
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original values
    (global as any).__DEV__ = originalDEV;
    process.env.EXPO_PUBLIC_APP_ENV = originalEnv;
  });

  describe('isDevelopmentMode', () => {
    it('returns true when __DEV__ is true', () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_APP_ENV = 'production';

      const { isDevelopmentMode } = require('@/utils/environment');
      expect(isDevelopmentMode()).toBe(true);
    });

    it('returns true when __DEV__ is true and APP_ENV is development', () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_APP_ENV = 'development';

      const { isDevelopmentMode } = require('@/utils/environment');
      expect(isDevelopmentMode()).toBe(true);
    });

    it('returns true when __DEV__ is true and APP_ENV is staging', () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_APP_ENV = 'staging';

      const { isDevelopmentMode } = require('@/utils/environment');
      expect(isDevelopmentMode()).toBe(true);
    });

    it('returns false when __DEV__ is false and APP_ENV is production', () => {
      (global as any).__DEV__ = false;
      process.env.EXPO_PUBLIC_APP_ENV = 'production';

      const { isDevelopmentMode } = require('@/utils/environment');
      expect(isDevelopmentMode()).toBe(false);
    });

    it('returns false when __DEV__ is false and APP_ENV is undefined', () => {
      (global as any).__DEV__ = false;
      delete process.env.EXPO_PUBLIC_APP_ENV;

      const { isDevelopmentMode } = require('@/utils/environment');
      expect(isDevelopmentMode()).toBe(false);
    });

    it('returns false when __DEV__ is undefined and APP_ENV is production', () => {
      delete (global as any).__DEV__;
      process.env.EXPO_PUBLIC_APP_ENV = 'production';

      const { isDevelopmentMode } = require('@/utils/environment');
      expect(isDevelopmentMode()).toBe(false);
    });

    it('returns false when __DEV__ is false even if APP_ENV is development (misconfigured build)', () => {
      (global as any).__DEV__ = false;
      process.env.EXPO_PUBLIC_APP_ENV = 'development';

      const { isDevelopmentMode } = require('@/utils/environment');
      expect(isDevelopmentMode()).toBe(false);
    });

    it('returns false when __DEV__ is false even if APP_ENV is staging (misconfigured build)', () => {
      (global as any).__DEV__ = false;
      process.env.EXPO_PUBLIC_APP_ENV = 'staging';

      const { isDevelopmentMode } = require('@/utils/environment');
      expect(isDevelopmentMode()).toBe(false);
    });
  });

  describe('isProductionMode', () => {
    it('returns true when not in development mode', () => {
      (global as any).__DEV__ = false;
      process.env.EXPO_PUBLIC_APP_ENV = 'production';

      const { isProductionMode } = require('@/utils/environment');
      expect(isProductionMode()).toBe(true);
    });

    it('returns false when in development mode', () => {
      (global as any).__DEV__ = true;
      process.env.EXPO_PUBLIC_APP_ENV = 'production';

      const { isProductionMode } = require('@/utils/environment');
      expect(isProductionMode()).toBe(false);
    });
  });
});
