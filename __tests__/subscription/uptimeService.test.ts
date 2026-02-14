/**
 * Uptime Service Tests
 *
 * TDD tests for app uptime retrieval and test override functionality.
 * Uses getStartupTime() from react-native-device-info and computes uptime.
 */

// Mock react-native-device-info before imports
const mockGetStartupTime = jest.fn<Promise<number>, []>();

jest.mock('react-native-device-info', () => ({
  __esModule: true,
  getStartupTime: () => mockGetStartupTime(),
}));

import {
  getDeviceUptime,
  setUptimeOverride,
  resetUptimeOverride,
} from '@/subscription/uptimeService';

describe('uptimeService', () => {
  // Mock performance.now for predictable tests (monotonic clock)
  const MOCK_PERFORMANCE_NOW = 12345000; // ms since app start
  let originalPerformanceNow: typeof performance.now;

  beforeAll(() => {
    originalPerformanceNow = performance.now;
  });

  afterAll(() => {
    performance.now = originalPerformanceNow;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetUptimeOverride();
    performance.now = jest.fn(() => MOCK_PERFORMANCE_NOW);
  });

  describe('getDeviceUptime', () => {
    it('should return uptime using performance.now() (monotonic clock)', async () => {
      const result = await getDeviceUptime();

      expect(result.success).toBe(true);
      expect(result.uptimeMs).toBe(MOCK_PERFORMANCE_NOW);
      expect(result.error).toBeUndefined();
      expect(performance.now).toHaveBeenCalled();
    });

    it('should not use Date.now() for uptime computation', async () => {
      const dateNowSpy = jest.spyOn(Date, 'now');

      await getDeviceUptime();

      expect(dateNowSpy).not.toHaveBeenCalled();
      dateNowSpy.mockRestore();
    });

    it('should return error when performance.now throws', async () => {
      performance.now = jest.fn(() => { throw new Error('Unavailable'); });

      const result = await getDeviceUptime();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('UPTIME_READ_ERROR');
    });

    it('should use override value in test environment', async () => {
      const overrideMs = 999000;
      setUptimeOverride(overrideMs);

      const result = await getDeviceUptime();

      expect(result.success).toBe(true);
      expect(result.uptimeMs).toBe(overrideMs);
      // Should not call getStartupTime when override is set
      expect(mockGetStartupTime).not.toHaveBeenCalled();
    });

    it('should use real implementation after override is reset', async () => {
      setUptimeOverride(999000);
      resetUptimeOverride();

      const result = await getDeviceUptime();

      expect(result.success).toBe(true);
      expect(result.uptimeMs).toBe(MOCK_PERFORMANCE_NOW);
      expect(performance.now).toHaveBeenCalled();
    });

    it('should handle uptime of 0 (app just started)', async () => {
      performance.now = jest.fn(() => 0);

      const result = await getDeviceUptime();

      expect(result.success).toBe(true);
      expect(result.uptimeMs).toBe(0);
    });
  });

  describe('setUptimeOverride', () => {
    it('should set override value in test environment', async () => {
      setUptimeOverride(123456);

      const result = await getDeviceUptime();
      expect(result.uptimeMs).toBe(123456);
    });

    it('should allow setting override to null to reset', async () => {
      setUptimeOverride(123456);
      setUptimeOverride(null);

      const result = await getDeviceUptime();

      expect(performance.now).toHaveBeenCalled();
      expect(result.uptimeMs).toBe(MOCK_PERFORMANCE_NOW);
    });
  });

  describe('resetUptimeOverride', () => {
    it('should reset override to use real implementation', async () => {
      setUptimeOverride(999);
      resetUptimeOverride();

      const result = await getDeviceUptime();

      expect(result.success).toBe(true);
      expect(result.uptimeMs).toBe(MOCK_PERFORMANCE_NOW);
    });
  });
});
