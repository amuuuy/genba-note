/**
 * Tests for dailyUsageService
 *
 * Tests AsyncStorage-based daily usage counter for search features.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDailyUsage,
  incrementDailyUsage,
  resetForTest,
} from '@/subscription/dailyUsageService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

beforeEach(() => {
  jest.clearAllMocks();
  resetForTest();
});

describe('getDailyUsage', () => {
  it('returns zero counts when no data stored', async () => {
    mockGetItem.mockResolvedValueOnce(null);

    const usage = await getDailyUsage();

    expect(usage.aiSearchCount).toBe(0);
    expect(usage.rakutenSearchCount).toBe(0);
  });

  it('returns stored counts for today', async () => {
    const today = new Date().toISOString().slice(0, 10);
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({ date: today, aiSearchCount: 2, rakutenSearchCount: 3 })
    );

    const usage = await getDailyUsage();

    expect(usage.aiSearchCount).toBe(2);
    expect(usage.rakutenSearchCount).toBe(3);
  });

  it('returns zero counts when stored data is from yesterday', async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({ date: yesterday, aiSearchCount: 10, rakutenSearchCount: 20 })
    );

    const usage = await getDailyUsage();

    expect(usage.aiSearchCount).toBe(0);
    expect(usage.rakutenSearchCount).toBe(0);
  });

  it('returns zero counts when stored data is corrupted', async () => {
    mockGetItem.mockResolvedValueOnce('not valid json{{{');

    const usage = await getDailyUsage();

    expect(usage.aiSearchCount).toBe(0);
    expect(usage.rakutenSearchCount).toBe(0);
  });
});

describe('incrementDailyUsage', () => {
  it('increments AI search count', async () => {
    const today = new Date().toISOString().slice(0, 10);
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({ date: today, aiSearchCount: 1, rakutenSearchCount: 0 })
    );
    mockSetItem.mockResolvedValueOnce(undefined);

    await incrementDailyUsage('ai');

    expect(mockSetItem).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(mockSetItem.mock.calls[0][1]);
    expect(stored.aiSearchCount).toBe(2);
    expect(stored.rakutenSearchCount).toBe(0);
  });

  it('increments Rakuten search count', async () => {
    const today = new Date().toISOString().slice(0, 10);
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({ date: today, aiSearchCount: 0, rakutenSearchCount: 4 })
    );
    mockSetItem.mockResolvedValueOnce(undefined);

    await incrementDailyUsage('rakuten');

    const stored = JSON.parse(mockSetItem.mock.calls[0][1]);
    expect(stored.aiSearchCount).toBe(0);
    expect(stored.rakutenSearchCount).toBe(5);
  });

  it('starts fresh count on new day', async () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    mockGetItem.mockResolvedValueOnce(
      JSON.stringify({ date: yesterday, aiSearchCount: 99, rakutenSearchCount: 99 })
    );
    mockSetItem.mockResolvedValueOnce(undefined);

    await incrementDailyUsage('ai');

    const stored = JSON.parse(mockSetItem.mock.calls[0][1]);
    expect(stored.aiSearchCount).toBe(1);
    expect(stored.rakutenSearchCount).toBe(0);
  });
});
