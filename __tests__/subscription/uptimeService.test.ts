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
  // Mock Date.now for predictable tests
  const MOCK_NOW = 1700000000000; // Fixed timestamp
  let originalDateNow: typeof Date.now;

  beforeAll(() => {
    originalDateNow = Date.now;
  });

  afterAll(() => {
    Date.now = originalDateNow;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetUptimeOverride();
    // Reset Date.now to original for each test
    Date.now = jest.fn(() => MOCK_NOW);
  });

  describe('getDeviceUptime', () => {
    it('should return uptime in milliseconds when available', async () => {
      // App started 12345 seconds ago
      const startupTime = MOCK_NOW - 12345000;
      mockGetStartupTime.mockResolvedValue(startupTime);

      const result = await getDeviceUptime();

      expect(result.success).toBe(true);
      expect(result.uptimeMs).toBe(12345000); // currentTime - startupTime
      expect(result.error).toBeUndefined();
    });

    it('should return error when getStartupTime() fails', async () => {
      mockGetStartupTime.mockRejectedValue(new Error('Device info unavailable'));

      const result = await getDeviceUptime();

      expect(result.success).toBe(false);
      expect(result.uptimeMs).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('UPTIME_READ_ERROR');
    });

    it('should return error when getStartupTime returns invalid value', async () => {
      mockGetStartupTime.mockResolvedValue(-1);

      const result = await getDeviceUptime();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UPTIME_UNAVAILABLE');
    });

    it('should return error when computed uptime is negative (clock manipulation)', async () => {
      // startupTime is in the future (impossible normally)
      mockGetStartupTime.mockResolvedValue(MOCK_NOW + 1000);

      const result = await getDeviceUptime();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UPTIME_UNAVAILABLE');
      expect(result.error?.message).toContain('clock manipulation');
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

      // App started 5000 seconds ago
      const startupTime = MOCK_NOW - 5000000;
      mockGetStartupTime.mockResolvedValue(startupTime);

      const result = await getDeviceUptime();

      expect(result.success).toBe(true);
      expect(result.uptimeMs).toBe(5000000);
      expect(mockGetStartupTime).toHaveBeenCalled();
    });

    it('should handle uptime of 0 (app just started)', async () => {
      mockGetStartupTime.mockResolvedValue(MOCK_NOW);

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

      const startupTime = MOCK_NOW - 1000000;
      mockGetStartupTime.mockResolvedValue(startupTime);

      const result = await getDeviceUptime();

      expect(mockGetStartupTime).toHaveBeenCalled();
      expect(result.uptimeMs).toBe(1000000);
    });
  });

  describe('resetUptimeOverride', () => {
    it('should reset override to use real implementation', async () => {
      setUptimeOverride(999);
      resetUptimeOverride();

      const startupTime = MOCK_NOW - 2000000;
      mockGetStartupTime.mockResolvedValue(startupTime);

      const result = await getDeviceUptime();

      expect(result.success).toBe(true);
      expect(result.uptimeMs).toBe(2000000);
    });
  });
});
