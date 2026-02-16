/**
 * Offline Validation Service Tests
 *
 * TDD tests for 4-value offline Pro validation per SPEC 2.8.4-2.8.11.
 *
 * Pro allowed only when ALL 4 conditions are met:
 * 1. entitlement_active === true
 * 2. entitlement_expiration === null OR > currentTime (0 = inactive = FAIL)
 * 3. currentUptime >= last_verified_uptime AND elapsed <= 7 days
 * 4. currentTime >= last_verified_at AND elapsed <= 7 days
 */

import {
  validateProOffline,
  isCacheValid,
} from '@/subscription/offlineValidationService';
import type { SubscriptionCache } from '@/types/subscription';
import { GRACE_PERIOD_MS } from '@/types/subscription';
import {
  createValidCache,
  createLifetimeCache,
  createInactiveCache,
  createExpiredCache,
  createGracePeriodExpiredCache,
  createValidationInput,
} from './helpers';

describe('offlineValidationService', () => {
  // Fixed test time values
  const NOW = 1700000000000;
  const CURRENT_UPTIME = 1000000000; // 1000000 seconds

  describe('validateProOffline', () => {
    describe('cache missing/invalid', () => {
      it('should return cache_missing when cache is null', () => {
        const result = validateProOffline({
          cache: null,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(false);
        expect(result.reason).toBe('cache_missing');
        expect(result.requiresOnlineVerification).toBe(true);
      });

      it('should return cache_invalid when entitlementActive is not boolean', () => {
        const cache = createValidCache({
          entitlementActive: 'true' as unknown as boolean,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(false);
        expect(result.reason).toBe('cache_invalid');
        expect(result.requiresOnlineVerification).toBe(true);
      });

      it('should return cache_invalid when lastVerifiedAt is NaN', () => {
        const cache = createValidCache({
          lastVerifiedAt: NaN,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(false);
        expect(result.reason).toBe('cache_invalid');
      });

      it('should return cache_invalid when lastVerifiedUptime is negative', () => {
        const cache = createValidCache({
          lastVerifiedUptime: -1,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(false);
        expect(result.reason).toBe('cache_invalid');
      });

      it('should return cache_invalid when lastVerifiedAt is Infinity', () => {
        const cache = createValidCache({
          lastVerifiedAt: Infinity,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(false);
        expect(result.reason).toBe('cache_invalid');
      });

      it('should return cache_invalid when lastVerifiedUptime is Infinity', () => {
        const cache = createValidCache({
          lastVerifiedUptime: Infinity,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(false);
        expect(result.reason).toBe('cache_invalid');
      });
    });

    describe('condition 1: entitlement_active check', () => {
      it('should return entitlement_inactive when entitlementActive is false', () => {
        const cache = createInactiveCache();

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(false);
        expect(result.reason).toBe('entitlement_inactive');
        expect(result.requiresOnlineVerification).toBe(true);
      });

      it('should pass when entitlementActive is true', () => {
        const cache = createValidCache({
          entitlementActive: true,
          lastVerifiedAt: NOW - 1000,
          lastVerifiedUptime: CURRENT_UPTIME - 1000,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        // Should pass condition 1, check other conditions determine final result
        expect(result.reason).not.toBe('entitlement_inactive');
      });
    });

    describe('condition 2: entitlement_expiration check', () => {
      it('should return entitlement_expired when expiration is 0 (explicitly inactive)', () => {
        const cache = createValidCache({
          entitlementActive: true, // Active but expiration = 0
          entitlementExpiration: 0,
          lastVerifiedAt: NOW - 1000,
          lastVerifiedUptime: CURRENT_UPTIME - 1000,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(false);
        expect(result.reason).toBe('entitlement_expired');
      });

      it('should return entitlement_expired when expiration < currentTime', () => {
        const cache = createValidCache({
          entitlementExpiration: NOW - 1000, // expired 1 second ago
          lastVerifiedAt: NOW - 1000,
          lastVerifiedUptime: CURRENT_UPTIME - 1000,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(false);
        expect(result.reason).toBe('entitlement_expired');
      });

      it('should PASS when expiration is null (lifetime)', () => {
        const cache = createLifetimeCache({
          lastVerifiedAt: NOW - 1000,
          lastVerifiedUptime: CURRENT_UPTIME - 1000,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        // Lifetime should pass condition 2
        expect(result.reason).not.toBe('entitlement_expired');
      });

      it('should PASS when expiration > currentTime', () => {
        const cache = createValidCache({
          entitlementExpiration: NOW + 30 * 24 * 60 * 60 * 1000, // 30 days from now
          lastVerifiedAt: NOW - 1000,
          lastVerifiedUptime: CURRENT_UPTIME - 1000,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.reason).not.toBe('entitlement_expired');
      });
    });

    describe('condition 3: uptime rollback detection (app restart)', () => {
      it('should deny Pro on uptime rollback (fail-closed)', () => {
        // After app restart, currentUptime < lastVerifiedUptime
        // Fail-closed: deny Pro and require online re-verification
        const cache = createValidCache({
          lastVerifiedAt: NOW - 1000, // Recent wall-clock (within grace period)
          lastVerifiedUptime: CURRENT_UPTIME + 1000, // Higher than current (reboot detected)
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(false);
        expect(result.reason).toBe('uptime_rollback');
        expect(result.requiresOnlineVerification).toBe(true);
      });

      it('should deny on uptime rollback even when wall-clock is within grace period', () => {
        // Uptime rollback is checked first and fails immediately (fail-closed)
        const cache = createValidCache({
          lastVerifiedAt: NOW - 100, // Very recent wall-clock
          lastVerifiedUptime: CURRENT_UPTIME + 1000, // Reboot detected
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(false);
        expect(result.reason).toBe('uptime_rollback');
        expect(result.requiresOnlineVerification).toBe(true);
      });

      it('should PASS with requiresOnlineVerification=false when no rollback', () => {
        const cache = createValidCache({
          lastVerifiedAt: NOW - 1000,
          lastVerifiedUptime: CURRENT_UPTIME - 1000, // Lower than current (normal)
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        // Same session, uptime elapsed within grace → allowed, no online verification needed
        expect(result.isProAllowed).toBe(true);
        expect(result.requiresOnlineVerification).toBe(false);
      });
    });

    describe('condition 3: uptime grace period', () => {
      it('should PASS when uptime elapsed <= 7 days', () => {
        const sixDaysMs = 6 * 24 * 60 * 60 * 1000;
        const cache = createValidCache({
          lastVerifiedAt: NOW - sixDaysMs,
          lastVerifiedUptime: CURRENT_UPTIME - sixDaysMs,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.reason).not.toBe('grace_period_exceeded');
      });

      it('should return grace_period_exceeded when uptime elapsed > 7 days', () => {
        const eightDaysMs = 8 * 24 * 60 * 60 * 1000;
        const cache = createValidCache({
          lastVerifiedAt: NOW - eightDaysMs,
          lastVerifiedUptime: CURRENT_UPTIME - eightDaysMs,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(false);
        expect(result.reason).toBe('grace_period_exceeded');
      });
    });

    describe('condition 4: wall clock manipulation', () => {
      it('should return clock_manipulation when currentTime < last_verified_at', () => {
        const cache = createValidCache({
          lastVerifiedAt: NOW + 1000, // In the future (time manipulation)
          lastVerifiedUptime: CURRENT_UPTIME - 1000,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(false);
        expect(result.reason).toBe('clock_manipulation');
        expect(result.requiresOnlineVerification).toBe(true);
      });

      it('should PASS when currentTime >= last_verified_at', () => {
        const cache = createValidCache({
          lastVerifiedAt: NOW - 1000,
          lastVerifiedUptime: CURRENT_UPTIME - 1000,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.reason).not.toBe('clock_manipulation');
      });
    });

    describe('condition 4: wall clock grace period', () => {
      it('should PASS when wall clock elapsed <= 7 days', () => {
        const sixDaysMs = 6 * 24 * 60 * 60 * 1000;
        const cache = createValidCache({
          lastVerifiedAt: NOW - sixDaysMs,
          lastVerifiedUptime: CURRENT_UPTIME - sixDaysMs,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        // Should pass all conditions
        expect(result.isProAllowed).toBe(true);
        expect(result.reason).toBe('offline_grace_period');
      });

      it('should return grace_period_exceeded when wall clock elapsed > 7 days', () => {
        const eightDaysMs = 8 * 24 * 60 * 60 * 1000;
        const cache = createValidCache({
          lastVerifiedAt: NOW - eightDaysMs,
          lastVerifiedUptime: CURRENT_UPTIME - eightDaysMs,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(false);
        expect(result.reason).toBe('grace_period_exceeded');
      });
    });

    describe('all conditions pass', () => {
      it('should return offline_grace_period with isProAllowed=true when all pass', () => {
        const cache = createValidCache({
          entitlementActive: true,
          entitlementExpiration: NOW + 30 * 24 * 60 * 60 * 1000, // 30 days
          lastVerifiedAt: NOW - 1000,
          lastVerifiedUptime: CURRENT_UPTIME - 1000,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(true);
        expect(result.reason).toBe('offline_grace_period');
        expect(result.requiresOnlineVerification).toBe(false);
      });

      it('should allow Pro with lifetime subscription', () => {
        const cache = createLifetimeCache({
          lastVerifiedAt: NOW - 1000,
          lastVerifiedUptime: CURRENT_UPTIME - 1000,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(true);
        expect(result.reason).toBe('offline_grace_period');
      });

      it('should allow Pro at exactly 7 days (boundary)', () => {
        const sevenDaysMs = GRACE_PERIOD_MS; // exactly 7 days
        const cache = createValidCache({
          lastVerifiedAt: NOW - sevenDaysMs,
          lastVerifiedUptime: CURRENT_UPTIME - sevenDaysMs,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(true);
        expect(result.reason).toBe('offline_grace_period');
      });

      it('should deny Pro at 7 days + 1ms (just past boundary)', () => {
        const justPastSevenDays = GRACE_PERIOD_MS + 1;
        const cache = createValidCache({
          lastVerifiedAt: NOW - justPastSevenDays,
          lastVerifiedUptime: CURRENT_UPTIME - justPastSevenDays,
        });

        const result = validateProOffline({
          cache,
          currentTime: NOW,
          currentUptime: CURRENT_UPTIME,
        });

        expect(result.isProAllowed).toBe(false);
        expect(result.reason).toBe('grace_period_exceeded');
      });
    });
  });

  describe('isCacheValid', () => {
    it('should return false for null', () => {
      expect(isCacheValid(null)).toBe(false);
    });

    it('should return true for valid SubscriptionCache', () => {
      const cache = createValidCache();
      expect(isCacheValid(cache)).toBe(true);
    });

    it('should return false for cache with invalid types', () => {
      const cache = {
        entitlementActive: 'true', // should be boolean
        entitlementExpiration: 123,
        lastVerifiedAt: 123,
        lastVerifiedUptime: 123,
      } as unknown as SubscriptionCache;

      expect(isCacheValid(cache)).toBe(false);
    });

    it('should return true for lifetime cache (null expiration)', () => {
      const cache = createLifetimeCache();
      expect(isCacheValid(cache)).toBe(true);
    });

    it('should return true for inactive cache (expiration = 0)', () => {
      const cache = createValidCache({ entitlementExpiration: 0 });
      expect(isCacheValid(cache)).toBe(true);
    });

    it('should return false for cache with negative lastVerifiedUptime', () => {
      const cache = createValidCache({ lastVerifiedUptime: -1 });
      expect(isCacheValid(cache)).toBe(false);
    });
  });
});
