/**
 * MaterialSearchModal Rakuten Search Limit Tests
 *
 * Tests the exported functions that implement Rakuten search limit logic:
 * - shouldCheckRakutenLimit(): gate based on Pro status loading state
 * - checkRakutenSearchLimit(): daily limit check with block/allow result
 * - executeRakutenSearch(): async flow including reload, search, increment
 * - createGuardedRakutenSearch(): re-entry prevention (double-tap protection)
 *
 * Mirrors MaterialSearchModal.aiLimit.test.ts for Rakuten search.
 */

import {
  shouldCheckRakutenLimit,
  checkRakutenSearchLimit,
  executeRakutenSearch,
  createGuardedRakutenSearch,
} from '@/components/unitPrice/materialSearchLimitUtils';
import {
  canSearchRakuten,
  FREE_RAKUTEN_SEARCH_DAILY_LIMIT,
} from '@/subscription/freeTierLimitsService';

describe('shouldCheckRakutenLimit', () => {
  it('returns false when Pro status is still loading', () => {
    expect(shouldCheckRakutenLimit(true, false)).toBe(false);
  });

  it('returns false when user is Pro (even if loaded)', () => {
    expect(shouldCheckRakutenLimit(false, true)).toBe(false);
  });

  it('returns true only when loaded AND user is Free', () => {
    expect(shouldCheckRakutenLimit(false, false)).toBe(true);
  });

  it('returns false when both loading and Pro', () => {
    expect(shouldCheckRakutenLimit(true, true)).toBe(false);
  });
});

describe('checkRakutenSearchLimit', () => {
  it('returns null (allowed) when free user is below limit', () => {
    expect(checkRakutenSearchLimit(0, false)).toBeNull();
    expect(checkRakutenSearchLimit(4, false)).toBeNull();
  });

  it('returns { limit } when free user hits limit', () => {
    const result = checkRakutenSearchLimit(5, false);
    expect(result).not.toBeNull();
    expect(result!.limit).toBe(FREE_RAKUTEN_SEARCH_DAILY_LIMIT);
  });

  it('returns { limit } when free user exceeds limit', () => {
    const result = checkRakutenSearchLimit(10, false);
    expect(result).not.toBeNull();
    expect(result!.limit).toBe(FREE_RAKUTEN_SEARCH_DAILY_LIMIT);
  });

  it('returns null for Pro user regardless of count', () => {
    expect(checkRakutenSearchLimit(0, true)).toBeNull();
    expect(checkRakutenSearchLimit(100, true)).toBeNull();
  });
});

describe('executeRakutenSearch', () => {
  const makeDeps = (overrides: Partial<Parameters<typeof executeRakutenSearch>[0]> = {}) => ({
    isProLoading: false,
    isPro: false,
    reload: jest.fn().mockResolvedValue({ rakutenSearchCount: 0 }),
    search: jest.fn().mockResolvedValue(true),
    incrementRakuten: jest.fn().mockResolvedValue(undefined),
    onBlocked: jest.fn(),
    ...overrides,
  });

  describe('free user below limit', () => {
    it('reloads, searches, and increments on success', async () => {
      const deps = makeDeps();
      const result = await executeRakutenSearch(deps);

      expect(deps.reload).toHaveBeenCalledTimes(1);
      expect(deps.search).toHaveBeenCalledTimes(1);
      expect(deps.incrementRakuten).toHaveBeenCalledTimes(1);
      expect(deps.onBlocked).not.toHaveBeenCalled();
      expect(result).toEqual({ outcome: 'searched', searchSuccess: true, incremented: true });
    });
  });

  describe('free user at limit', () => {
    it('reloads, detects limit, calls onBlocked, does NOT search', async () => {
      const deps = makeDeps({
        reload: jest.fn().mockResolvedValue({ rakutenSearchCount: 5 }),
      });
      const result = await executeRakutenSearch(deps);

      expect(deps.reload).toHaveBeenCalledTimes(1);
      expect(deps.search).not.toHaveBeenCalled();
      expect(deps.incrementRakuten).not.toHaveBeenCalled();
      expect(deps.onBlocked).toHaveBeenCalledWith(FREE_RAKUTEN_SEARCH_DAILY_LIMIT);
      expect(result).toEqual({ outcome: 'blocked', incremented: false });
    });
  });

  describe('search failure → no increment', () => {
    it('does not increment when search returns false', async () => {
      const deps = makeDeps({
        search: jest.fn().mockResolvedValue(false),
      });
      const result = await executeRakutenSearch(deps);

      expect(deps.search).toHaveBeenCalledTimes(1);
      expect(deps.incrementRakuten).not.toHaveBeenCalled();
      expect(result).toEqual({ outcome: 'searched', searchSuccess: false, incremented: false });
    });
  });

  describe('Pro user skips limit check', () => {
    it('does not reload or check limit, searches directly', async () => {
      const deps = makeDeps({ isPro: true });
      const result = await executeRakutenSearch(deps);

      expect(deps.reload).not.toHaveBeenCalled();
      expect(deps.search).toHaveBeenCalledTimes(1);
      expect(deps.incrementRakuten).not.toHaveBeenCalled();
      expect(deps.onBlocked).not.toHaveBeenCalled();
      expect(result).toEqual({ outcome: 'searched', searchSuccess: true, incremented: false });
    });
  });

  describe('Pro loading state skips limit check', () => {
    it('does not reload or check limit during loading', async () => {
      const deps = makeDeps({ isProLoading: true });
      const result = await executeRakutenSearch(deps);

      expect(deps.reload).not.toHaveBeenCalled();
      expect(deps.search).toHaveBeenCalledTimes(1);
      expect(deps.incrementRakuten).not.toHaveBeenCalled();
      expect(result).toEqual({ outcome: 'searched', searchSuccess: true, incremented: false });
    });
  });

  describe('increment failure → incremented stays false', () => {
    it('returns incremented: false when incrementRakuten rejects', async () => {
      const deps = makeDeps({
        incrementRakuten: jest.fn().mockRejectedValue(new Error('storage error')),
      });
      const result = await executeRakutenSearch(deps);

      expect(deps.search).toHaveBeenCalledTimes(1);
      expect(deps.incrementRakuten).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ outcome: 'searched', searchSuccess: true, incremented: false });
    });
  });

  describe('date rollover via reload', () => {
    it('uses fresh count from reload, not stale state', async () => {
      const deps = makeDeps({
        reload: jest.fn().mockResolvedValue({ rakutenSearchCount: 0 }),
      });
      const result = await executeRakutenSearch(deps);

      expect(deps.search).toHaveBeenCalledTimes(1);
      expect(result.outcome).toBe('searched');
    });
  });
});

describe('createGuardedRakutenSearch', () => {
  const makeDeps = (overrides: Partial<Parameters<typeof executeRakutenSearch>[0]> = {}) => ({
    isProLoading: false,
    isPro: false,
    reload: jest.fn().mockResolvedValue({ rakutenSearchCount: 0 }),
    search: jest.fn().mockResolvedValue(true),
    incrementRakuten: jest.fn().mockResolvedValue(undefined),
    onBlocked: jest.fn(),
    ...overrides,
  });

  it('allows a single call to execute', async () => {
    const guard = createGuardedRakutenSearch();
    const deps = makeDeps();

    const result = await guard.execute(deps);

    expect(result.outcome).toBe('searched');
    expect(deps.search).toHaveBeenCalledTimes(1);
  });

  it('skips concurrent calls while first is in-flight', async () => {
    const guard = createGuardedRakutenSearch();

    let resolveSearch!: (value: boolean) => void;
    const pendingSearch = new Promise<boolean>((resolve) => {
      resolveSearch = resolve;
    });

    const deps1 = makeDeps({ search: jest.fn().mockReturnValue(pendingSearch) });
    const deps2 = makeDeps();

    const promise1 = guard.execute(deps1);

    expect(guard.isInFlight()).toBe(true);

    const result2 = await guard.execute(deps2);
    expect(result2.outcome).toBe('skipped');
    expect(deps2.search).not.toHaveBeenCalled();
    expect(deps2.reload).not.toHaveBeenCalled();

    resolveSearch(true);
    const result1 = await promise1;
    expect(result1.outcome).toBe('searched');
    expect(deps1.search).toHaveBeenCalledTimes(1);
  });

  it('resets guard after first call completes, allowing subsequent calls', async () => {
    const guard = createGuardedRakutenSearch();
    const deps1 = makeDeps();
    const deps2 = makeDeps();

    await guard.execute(deps1);
    expect(guard.isInFlight()).toBe(false);

    const result2 = await guard.execute(deps2);
    expect(result2.outcome).toBe('searched');
    expect(deps2.search).toHaveBeenCalledTimes(1);
  });

  it('resets guard even if search throws', async () => {
    const guard = createGuardedRakutenSearch();
    const deps1 = makeDeps({
      search: jest.fn().mockRejectedValue(new Error('network error')),
    });
    const deps2 = makeDeps();

    await guard.execute(deps1).catch(() => {});
    expect(guard.isInFlight()).toBe(false);

    const result2 = await guard.execute(deps2);
    expect(result2.outcome).toBe('searched');
  });
});

describe('remaining count computation (badge display)', () => {
  it('computes correct remaining for free user', () => {
    for (let count = 0; count <= 7; count++) {
      const check = canSearchRakuten(count, false);
      const remaining = Math.max(0, check.limit - check.current);
      expect(remaining).toBe(Math.max(0, FREE_RAKUTEN_SEARCH_DAILY_LIMIT - count));
    }
  });

  it('Pro user has Infinity remaining', () => {
    const check = canSearchRakuten(0, true);
    expect(check.limit).toBe(Infinity);
  });
});

describe('alert message', () => {
  it('contains limit count in Japanese', () => {
    const blocked = checkRakutenSearchLimit(5, false);
    const message = `無料プランでは1日${blocked!.limit}回まで楽天検索できます。`;
    expect(message).toContain('5回');
  });
});
