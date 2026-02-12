/**
 * Tests for Pro Access Service
 *
 * Tests Pro feature checking with subscription service integration.
 * Override functionality is maintained for testing purposes.
 */

// Mock subscription service before imports
jest.mock('@/subscription/subscriptionService');
jest.mock('expo-secure-store');

const mockGetProStatus = jest.fn();
jest.mock('@/subscription/subscriptionService', () => ({
  getProStatus: () => mockGetProStatus(),
}));

// Mock environment utility
const mockIsDevelopmentMode = jest.fn();
jest.mock('@/utils/environment', () => ({
  isDevelopmentMode: () => mockIsDevelopmentMode(),
}));

import {
  checkProStatus,
  setProStatusOverride,
  resetProStatusOverride,
} from '@/subscription/proAccessService';

describe('proAccessService', () => {
  beforeEach(() => {
    // Default: not in development mode (production behavior)
    mockIsDevelopmentMode.mockReturnValue(false);
  });

  afterEach(() => {
    resetProStatusOverride();
    jest.clearAllMocks();
  });

  describe('checkProStatus', () => {
    it('returns Pro status from subscription service when no override', async () => {
      mockGetProStatus.mockResolvedValue({
        isProAllowed: true,
        reason: 'online_verified',
        requiresOnlineVerification: false,
      });

      const result = await checkProStatus();

      expect(result.isPro).toBe(true);
      expect(result.reason).toBe('online_verified');
    });

    it('returns not Pro when subscription service returns inactive', async () => {
      mockGetProStatus.mockResolvedValue({
        isProAllowed: false,
        reason: 'entitlement_inactive',
        requiresOnlineVerification: true,
      });

      const result = await checkProStatus();

      expect(result.isPro).toBe(false);
      expect(result.reason).toBe('entitlement_inactive');
    });

    it('returns offline_grace_period when in grace period', async () => {
      mockGetProStatus.mockResolvedValue({
        isProAllowed: true,
        reason: 'offline_grace_period',
        requiresOnlineVerification: false,
      });

      const result = await checkProStatus();

      expect(result.isPro).toBe(true);
      expect(result.reason).toBe('offline_grace_period');
    });
  });

  describe('setProStatusOverride', () => {
    it('can be overridden to true for testing', async () => {
      setProStatusOverride(true);
      const result = await checkProStatus();

      expect(result.isPro).toBe(true);
      expect(result.reason).toBe('placeholder_always_true');
      // Should not call subscription service when override is set
      expect(mockGetProStatus).not.toHaveBeenCalled();
    });

    it('can be overridden to false explicitly', async () => {
      setProStatusOverride(true);
      setProStatusOverride(false);
      const result = await checkProStatus();

      expect(result.isPro).toBe(false);
      expect(result.reason).toBe('placeholder_always_false');
    });
  });

  describe('resetProStatusOverride', () => {
    it('resets override to use real subscription service', async () => {
      setProStatusOverride(true);
      expect((await checkProStatus()).isPro).toBe(true);

      resetProStatusOverride();
      mockGetProStatus.mockResolvedValue({
        isProAllowed: false,
        reason: 'cache_missing',
        requiresOnlineVerification: true,
      });

      const result = await checkProStatus();
      expect(result.isPro).toBe(false);
      expect(result.reason).toBe('cache_missing');
    });
  });

  describe('development mode bypass', () => {
    it('returns isPro=true with reason=development_mode when in dev mode', async () => {
      mockIsDevelopmentMode.mockReturnValue(true);

      const result = await checkProStatus();

      expect(result.isPro).toBe(true);
      expect(result.reason).toBe('development_mode');
      // Should not call subscription service when in development mode
      expect(mockGetProStatus).not.toHaveBeenCalled();
    });

    it('uses real subscription service when not in dev mode', async () => {
      mockIsDevelopmentMode.mockReturnValue(false);
      mockGetProStatus.mockResolvedValue({
        isProAllowed: false,
        reason: 'entitlement_inactive',
        requiresOnlineVerification: true,
      });

      const result = await checkProStatus();

      expect(result.isPro).toBe(false);
      expect(result.reason).toBe('entitlement_inactive');
      expect(mockGetProStatus).toHaveBeenCalled();
    });

    it('test override takes precedence over development mode', async () => {
      mockIsDevelopmentMode.mockReturnValue(true);
      setProStatusOverride(false);

      const result = await checkProStatus();

      expect(result.isPro).toBe(false);
      expect(result.reason).toBe('placeholder_always_false');
    });
  });
});
