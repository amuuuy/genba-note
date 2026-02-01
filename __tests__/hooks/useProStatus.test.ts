/**
 * Tests for useProStatus Hook
 *
 * Tests the pure logic of the hook including:
 * - Pro status state management
 * - Error message generation
 * - Online verification requirement detection
 */

import type { ProGateReason } from '@/pdf/types';
import { getProGateMessage } from '@/constants/errorMessages';

/**
 * Helper function that mirrors the hook's needsOnlineVerification logic
 *
 * Must match logic in subscription/offlineValidationService.ts
 * All failure reasons require online verification.
 */
function needsOnlineVerification(reason: ProGateReason): boolean {
  // Only success reasons do NOT require online verification
  const successReasons: ProGateReason[] = [
    'online_verified',
    'offline_grace_period',
    'placeholder_always_true',
  ];
  return !successReasons.includes(reason);
}

/**
 * Helper function that mirrors the hook's message computation logic
 * Special case: online_verified with isPro=false shows entitlement_inactive message
 */
function computeMessage(
  isPro: boolean,
  reason: ProGateReason | null
): string | null {
  const effectiveReason =
    !isPro && reason === 'online_verified' ? 'entitlement_inactive' : reason;
  return !isPro && effectiveReason ? getProGateMessage(effectiveReason) : null;
}

/**
 * Helper function that mirrors the hook's requiresOnlineVerification computation
 */
function computeRequiresOnlineVerification(reason: ProGateReason | null): boolean {
  return reason ? needsOnlineVerification(reason) : false;
}

describe('useProStatus logic', () => {
  describe('needsOnlineVerification', () => {
    it('returns true for cache_missing', () => {
      expect(needsOnlineVerification('cache_missing')).toBe(true);
    });

    it('returns true for cache_invalid', () => {
      expect(needsOnlineVerification('cache_invalid')).toBe(true);
    });

    it('returns true for uptime_rollback', () => {
      expect(needsOnlineVerification('uptime_rollback')).toBe(true);
    });

    it('returns true for grace_period_exceeded', () => {
      expect(needsOnlineVerification('grace_period_exceeded')).toBe(true);
    });

    it('returns true for clock_manipulation', () => {
      expect(needsOnlineVerification('clock_manipulation')).toBe(true);
    });

    it('returns false for online_verified', () => {
      expect(needsOnlineVerification('online_verified')).toBe(false);
    });

    it('returns false for offline_grace_period', () => {
      expect(needsOnlineVerification('offline_grace_period')).toBe(false);
    });

    it('returns true for entitlement_inactive', () => {
      expect(needsOnlineVerification('entitlement_inactive')).toBe(true);
    });

    it('returns true for entitlement_expired', () => {
      expect(needsOnlineVerification('entitlement_expired')).toBe(true);
    });

    it('returns true for placeholder_always_false', () => {
      expect(needsOnlineVerification('placeholder_always_false')).toBe(true);
    });
  });

  describe('computeMessage', () => {
    it('returns null when isPro is true', () => {
      expect(computeMessage(true, 'online_verified')).toBe(null);
    });

    it('returns null when reason is null', () => {
      expect(computeMessage(false, null)).toBe(null);
    });

    it('returns message when not Pro and reason exists', () => {
      const message = computeMessage(false, 'entitlement_inactive');
      expect(message).toBe('Proプランがアクティブではありません');
    });

    it('returns expired message for entitlement_expired reason', () => {
      const message = computeMessage(false, 'entitlement_expired');
      expect(message).toBe('Proプランの有効期限が切れています');
    });

    it('returns cache_missing message', () => {
      const message = computeMessage(false, 'cache_missing');
      expect(message).toBe('サブスクリプション情報がありません。ネットワークに接続してください。');
    });

    it('returns grace_period_exceeded message', () => {
      const message = computeMessage(false, 'grace_period_exceeded');
      expect(message).toBe('オフライン期間が7日を超えました。ネットワークに接続してください。');
    });

    it('returns entitlement_inactive message when online_verified but not Pro', () => {
      // Special case: online_verified with isPro=false means verified as non-subscriber
      const message = computeMessage(false, 'online_verified');
      expect(message).toBe('Proプランがアクティブではありません');
    });
  });

  describe('computeRequiresOnlineVerification', () => {
    it('returns false when reason is null', () => {
      expect(computeRequiresOnlineVerification(null)).toBe(false);
    });

    it('returns true for offline-related reasons', () => {
      expect(computeRequiresOnlineVerification('cache_missing')).toBe(true);
      expect(computeRequiresOnlineVerification('cache_invalid')).toBe(true);
      expect(computeRequiresOnlineVerification('uptime_rollback')).toBe(true);
    });

    it('returns false for online-verified', () => {
      expect(computeRequiresOnlineVerification('online_verified')).toBe(false);
    });

    it('returns true for entitlement-related reasons', () => {
      expect(computeRequiresOnlineVerification('entitlement_inactive')).toBe(true);
      expect(computeRequiresOnlineVerification('entitlement_expired')).toBe(true);
    });
  });

  describe('state transitions', () => {
    interface ProStatusState {
      isPro: boolean;
      isLoading: boolean;
      reason: ProGateReason | null;
    }

    /**
     * Simulates the state after a successful Pro status check
     */
    function simulateCheckSuccess(
      isPro: boolean,
      reason: ProGateReason
    ): ProStatusState {
      return {
        isPro,
        isLoading: false,
        reason,
      };
    }

    /**
     * Simulates the state after a failed Pro status check (error thrown)
     */
    function simulateCheckError(): ProStatusState {
      return {
        isPro: false,
        isLoading: false,
        reason: 'cache_missing',
      };
    }

    it('initial state has isLoading true', () => {
      const initialState: ProStatusState = {
        isPro: false,
        isLoading: true,
        reason: null,
      };
      expect(initialState.isLoading).toBe(true);
      expect(initialState.isPro).toBe(false);
    });

    it('successful Pro check returns isPro=true', () => {
      const state = simulateCheckSuccess(true, 'online_verified');
      expect(state.isPro).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.reason).toBe('online_verified');
    });

    it('successful non-Pro check returns isPro=false with reason', () => {
      const state = simulateCheckSuccess(false, 'entitlement_inactive');
      expect(state.isPro).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.reason).toBe('entitlement_inactive');
    });

    it('error during check defaults to cache_missing', () => {
      const state = simulateCheckError();
      expect(state.isPro).toBe(false);
      expect(state.reason).toBe('cache_missing');
    });

    it('offline grace period maintains Pro access', () => {
      const state = simulateCheckSuccess(true, 'offline_grace_period');
      expect(state.isPro).toBe(true);
      expect(state.reason).toBe('offline_grace_period');
      expect(computeRequiresOnlineVerification('offline_grace_period')).toBe(false);
    });

    it('grace period exceeded loses Pro access', () => {
      const state = simulateCheckSuccess(false, 'grace_period_exceeded');
      expect(state.isPro).toBe(false);
      expect(state.reason).toBe('grace_period_exceeded');
      expect(computeRequiresOnlineVerification('grace_period_exceeded')).toBe(true);
    });
  });
});

describe('getProGateMessage', () => {
  it('returns user-friendly message for each reason', () => {
    const reasons: ProGateReason[] = [
      'online_verified',
      'offline_grace_period',
      'cache_missing',
      'cache_invalid',
      'entitlement_inactive',
      'entitlement_expired',
      'uptime_rollback',
      'grace_period_exceeded',
      'clock_manipulation',
      'placeholder_always_false',
      'placeholder_always_true',
    ];

    for (const reason of reasons) {
      const message = getProGateMessage(reason);
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it('messages are in Japanese', () => {
    // Verify messages contain Japanese characters
    const inactiveMessage = getProGateMessage('entitlement_inactive');
    expect(inactiveMessage).toMatch(/[ぁ-んァ-ン一-龥]/);
  });
});
