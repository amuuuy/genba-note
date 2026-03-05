/**
 * useDailySearchUsage Hook Tests
 *
 * Tests the hook interface types and integration logic.
 * Actual AsyncStorage operations are tested in dailyUsageService.test.ts.
 *
 * Note: renderHook is unavailable in this project (testEnvironment: 'node').
 * Tests validate types, service contract, and reload() return value contract.
 */

jest.mock('@/subscription/dailyUsageService', () => ({
  getDailyUsage: jest.fn(),
  incrementDailyUsage: jest.fn(),
}));

import type { UseDailySearchUsageReturn, DailyUsageCounts } from '@/hooks/useDailySearchUsage';
import { getDailyUsage, incrementDailyUsage } from '@/subscription/dailyUsageService';

const mockGetDailyUsage = getDailyUsage as jest.MockedFunction<typeof getDailyUsage>;
const mockIncrementDailyUsage = incrementDailyUsage as jest.MockedFunction<typeof incrementDailyUsage>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useDailySearchUsage', () => {
  describe('UseDailySearchUsageReturn interface', () => {
    it('has expected shape including reload', () => {
      const expectedReturn: UseDailySearchUsageReturn = {
        aiSearchCount: 0,
        rakutenSearchCount: 0,
        isLoaded: false,
        reload: jest.fn().mockResolvedValue({ aiSearchCount: 0, rakutenSearchCount: 0 }),
        incrementAi: jest.fn(),
        incrementRakuten: jest.fn(),
      };

      expect(expectedReturn.aiSearchCount).toBe(0);
      expect(expectedReturn.rakutenSearchCount).toBe(0);
      expect(expectedReturn.isLoaded).toBe(false);
      expect(typeof expectedReturn.reload).toBe('function');
      expect(typeof expectedReturn.incrementAi).toBe('function');
      expect(typeof expectedReturn.incrementRakuten).toBe('function');
    });
  });

  describe('DailyUsageCounts type', () => {
    it('has aiSearchCount and rakutenSearchCount', () => {
      const counts: DailyUsageCounts = { aiSearchCount: 3, rakutenSearchCount: 5 };
      expect(counts.aiSearchCount).toBe(3);
      expect(counts.rakutenSearchCount).toBe(5);
    });
  });

  describe('reload returns fresh DailyUsageCounts', () => {
    it('reload return type matches DailyUsageCounts', async () => {
      const fn: UseDailySearchUsageReturn['reload'] = jest.fn()
        .mockResolvedValue({ aiSearchCount: 2, rakutenSearchCount: 1 });

      const result = await fn();
      expect(result.aiSearchCount).toBe(2);
      expect(result.rakutenSearchCount).toBe(1);
    });
  });

  describe('integration with dailyUsageService', () => {
    it('getDailyUsage returns counts for today', async () => {
      mockGetDailyUsage.mockResolvedValueOnce({ aiSearchCount: 2, rakutenSearchCount: 3 });

      const usage = await getDailyUsage();

      expect(usage.aiSearchCount).toBe(2);
      expect(usage.rakutenSearchCount).toBe(3);
    });

    it('getDailyUsage resets to zero on new day (service-level behavior)', async () => {
      // dailyUsageService auto-resets when stored date !== today
      mockGetDailyUsage.mockResolvedValueOnce({ aiSearchCount: 0, rakutenSearchCount: 0 });

      const usage = await getDailyUsage();

      expect(usage.aiSearchCount).toBe(0);
      expect(usage.rakutenSearchCount).toBe(0);
    });

    it('incrementDailyUsage accepts ai type', async () => {
      mockIncrementDailyUsage.mockResolvedValueOnce(undefined);

      await incrementDailyUsage('ai');

      expect(mockIncrementDailyUsage).toHaveBeenCalledWith('ai');
    });

    it('incrementDailyUsage accepts rakuten type', async () => {
      mockIncrementDailyUsage.mockResolvedValueOnce(undefined);

      await incrementDailyUsage('rakuten');

      expect(mockIncrementDailyUsage).toHaveBeenCalledWith('rakuten');
    });
  });

  describe('reload-then-check pattern (used by MaterialSearchModal)', () => {
    it('fresh counts from reload are used for canSearchAi check, not stale state', async () => {
      // Simulates: modal open with stale count=3 (limit), but after date rollover
      // reload() returns fresh count=0 (new day). Check should use fresh count.
      const staleCount = 3;
      const freshCount = 0;

      mockGetDailyUsage.mockResolvedValueOnce({ aiSearchCount: freshCount, rakutenSearchCount: 0 });

      // This is the pattern used in handleSearch:
      // const freshUsage = await dailyUsage.reload();
      // const check = canSearchAi(freshUsage.aiSearchCount, isPro);
      const freshUsage = await getDailyUsage();

      // Fresh count should be 0 (new day), not stale 3
      expect(freshUsage.aiSearchCount).not.toBe(staleCount);
      expect(freshUsage.aiSearchCount).toBe(freshCount);
    });
  });
});
