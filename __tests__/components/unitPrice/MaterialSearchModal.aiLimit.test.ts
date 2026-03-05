/**
 * MaterialSearchModal AI Search Limit Tests
 *
 * Tests the exported functions that implement AI search limit logic:
 * - shouldCheckAiLimit(): gate based on Pro status loading state
 * - checkAiSearchLimit(): daily limit check with block/allow result
 * - executeAiSearch(): async flow including reload, search, increment
 * - createGuardedAiSearch(): re-entry prevention (double-tap protection)
 *
 * Key behaviors verified:
 * - Pro status loading → skip check (optimistic allow)
 * - Pro user → skip check (unlimited)
 * - Free user resolved → perform check
 * - Date rollover: fresh counts from reload() used, not stale state
 * - Failed search → no increment (avoid penalizing failures)
 * - Concurrent calls → only first executes, second is skipped
 * - After first completes → guard resets, new calls proceed
 * - Remaining count computation for badge display
 */

import {
  shouldCheckAiLimit,
  checkAiSearchLimit,
  executeAiSearch,
  createGuardedAiSearch,
} from '@/components/unitPrice/materialSearchLimitUtils';
import {
  canSearchAi,
  FREE_AI_SEARCH_DAILY_LIMIT,
} from '@/subscription/freeTierLimitsService';

describe('shouldCheckAiLimit', () => {
  it('returns false when Pro status is still loading', () => {
    expect(shouldCheckAiLimit(true, false)).toBe(false);
  });

  it('returns false when user is Pro (even if loaded)', () => {
    expect(shouldCheckAiLimit(false, true)).toBe(false);
  });

  it('returns true only when loaded AND user is Free', () => {
    expect(shouldCheckAiLimit(false, false)).toBe(true);
  });

  it('returns false when both loading and Pro', () => {
    expect(shouldCheckAiLimit(true, true)).toBe(false);
  });
});

describe('checkAiSearchLimit', () => {
  it('returns null (allowed) when free user is below limit', () => {
    expect(checkAiSearchLimit(0, false)).toBeNull();
    expect(checkAiSearchLimit(2, false)).toBeNull();
  });

  it('returns { limit } when free user hits limit', () => {
    const result = checkAiSearchLimit(3, false);
    expect(result).not.toBeNull();
    expect(result!.limit).toBe(FREE_AI_SEARCH_DAILY_LIMIT);
  });

  it('returns { limit } when free user exceeds limit', () => {
    const result = checkAiSearchLimit(10, false);
    expect(result).not.toBeNull();
    expect(result!.limit).toBe(3);
  });

  it('returns null for Pro user regardless of count', () => {
    expect(checkAiSearchLimit(0, true)).toBeNull();
    expect(checkAiSearchLimit(100, true)).toBeNull();
  });
});

describe('executeAiSearch', () => {
  const makeDeps = (overrides: Partial<Parameters<typeof executeAiSearch>[0]> = {}) => ({
    isProLoading: false,
    isPro: false,
    reload: jest.fn().mockResolvedValue({ aiSearchCount: 0 }),
    search: jest.fn().mockResolvedValue(true),
    incrementAi: jest.fn().mockResolvedValue(undefined),
    onBlocked: jest.fn(),
    ...overrides,
  });

  describe('free user below limit', () => {
    it('reloads, searches, and increments on success', async () => {
      const deps = makeDeps();
      const result = await executeAiSearch(deps);

      expect(deps.reload).toHaveBeenCalledTimes(1);
      expect(deps.search).toHaveBeenCalledTimes(1);
      expect(deps.incrementAi).toHaveBeenCalledTimes(1);
      expect(deps.onBlocked).not.toHaveBeenCalled();
      expect(result).toEqual({ outcome: 'searched', searchSuccess: true, incremented: true });
    });
  });

  describe('free user at limit', () => {
    it('reloads, detects limit, calls onBlocked, does NOT search', async () => {
      const deps = makeDeps({
        reload: jest.fn().mockResolvedValue({ aiSearchCount: 3 }),
      });
      const result = await executeAiSearch(deps);

      expect(deps.reload).toHaveBeenCalledTimes(1);
      expect(deps.search).not.toHaveBeenCalled();
      expect(deps.incrementAi).not.toHaveBeenCalled();
      expect(deps.onBlocked).toHaveBeenCalledWith(FREE_AI_SEARCH_DAILY_LIMIT);
      expect(result).toEqual({ outcome: 'blocked', incremented: false });
    });
  });

  describe('search failure → no increment', () => {
    it('does not increment when search returns false', async () => {
      const deps = makeDeps({
        search: jest.fn().mockResolvedValue(false),
      });
      const result = await executeAiSearch(deps);

      expect(deps.search).toHaveBeenCalledTimes(1);
      expect(deps.incrementAi).not.toHaveBeenCalled();
      expect(result).toEqual({ outcome: 'searched', searchSuccess: false, incremented: false });
    });
  });

  describe('Pro user skips limit check', () => {
    it('does not reload or check limit, searches directly', async () => {
      const deps = makeDeps({ isPro: true });
      const result = await executeAiSearch(deps);

      expect(deps.reload).not.toHaveBeenCalled();
      expect(deps.search).toHaveBeenCalledTimes(1);
      expect(deps.incrementAi).not.toHaveBeenCalled();
      expect(deps.onBlocked).not.toHaveBeenCalled();
      expect(result).toEqual({ outcome: 'searched', searchSuccess: true, incremented: false });
    });
  });

  describe('Pro loading state skips limit check', () => {
    it('does not reload or check limit during loading', async () => {
      const deps = makeDeps({ isProLoading: true });
      const result = await executeAiSearch(deps);

      expect(deps.reload).not.toHaveBeenCalled();
      expect(deps.search).toHaveBeenCalledTimes(1);
      expect(deps.incrementAi).not.toHaveBeenCalled();
      expect(result).toEqual({ outcome: 'searched', searchSuccess: true, incremented: false });
    });
  });

  describe('increment failure → incremented stays false', () => {
    it('returns incremented: false when incrementAi rejects', async () => {
      const deps = makeDeps({
        incrementAi: jest.fn().mockRejectedValue(new Error('storage error')),
      });
      const result = await executeAiSearch(deps);

      expect(deps.search).toHaveBeenCalledTimes(1);
      expect(deps.incrementAi).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ outcome: 'searched', searchSuccess: true, incremented: false });
    });
  });

  describe('date rollover via reload', () => {
    it('uses fresh count from reload, not stale state', async () => {
      const deps = makeDeps({
        reload: jest.fn().mockResolvedValue({ aiSearchCount: 0 }),
      });
      const result = await executeAiSearch(deps);

      expect(deps.search).toHaveBeenCalledTimes(1);
      expect(result.outcome).toBe('searched');
    });
  });
});

describe('createGuardedAiSearch', () => {
  const makeDeps = (overrides: Partial<Parameters<typeof executeAiSearch>[0]> = {}) => ({
    isProLoading: false,
    isPro: false,
    reload: jest.fn().mockResolvedValue({ aiSearchCount: 0 }),
    search: jest.fn().mockResolvedValue(true),
    incrementAi: jest.fn().mockResolvedValue(undefined),
    onBlocked: jest.fn(),
    ...overrides,
  });

  it('allows a single call to execute', async () => {
    const guard = createGuardedAiSearch();
    const deps = makeDeps();

    const result = await guard.execute(deps);

    expect(result.outcome).toBe('searched');
    expect(deps.search).toHaveBeenCalledTimes(1);
  });

  it('skips concurrent calls while first is in-flight', async () => {
    const guard = createGuardedAiSearch();

    // Create a search that stays pending until we resolve it
    let resolveSearch!: (value: boolean) => void;
    const pendingSearch = new Promise<boolean>((resolve) => {
      resolveSearch = resolve;
    });

    const deps1 = makeDeps({ search: jest.fn().mockReturnValue(pendingSearch) });
    const deps2 = makeDeps();

    // Start first search (stays pending)
    const promise1 = guard.execute(deps1);

    // Guard should be in-flight
    expect(guard.isInFlight()).toBe(true);

    // Second call while first is pending → skipped
    const result2 = await guard.execute(deps2);
    expect(result2.outcome).toBe('skipped');
    expect(deps2.search).not.toHaveBeenCalled();
    expect(deps2.reload).not.toHaveBeenCalled();

    // Resolve first search
    resolveSearch(true);
    const result1 = await promise1;
    expect(result1.outcome).toBe('searched');
    expect(deps1.search).toHaveBeenCalledTimes(1);
  });

  it('resets guard after first call completes, allowing subsequent calls', async () => {
    const guard = createGuardedAiSearch();
    const deps1 = makeDeps();
    const deps2 = makeDeps();

    // First call completes
    await guard.execute(deps1);
    expect(guard.isInFlight()).toBe(false);

    // Second call should proceed normally
    const result2 = await guard.execute(deps2);
    expect(result2.outcome).toBe('searched');
    expect(deps2.search).toHaveBeenCalledTimes(1);
  });

  it('resets guard even if search throws', async () => {
    const guard = createGuardedAiSearch();
    const deps1 = makeDeps({
      search: jest.fn().mockRejectedValue(new Error('network error')),
    });
    const deps2 = makeDeps();

    // First call throws (executeAiSearch doesn't catch search errors,
    // so the guard's finally block still runs)
    await guard.execute(deps1).catch(() => {});
    expect(guard.isInFlight()).toBe(false);

    // Subsequent call proceeds
    const result2 = await guard.execute(deps2);
    expect(result2.outcome).toBe('searched');
  });
});

describe('remaining count computation (badge display)', () => {
  it('computes correct remaining for free user', () => {
    for (let count = 0; count <= 5; count++) {
      const check = canSearchAi(count, false);
      const remaining = Math.max(0, check.limit - check.current);
      expect(remaining).toBe(Math.max(0, FREE_AI_SEARCH_DAILY_LIMIT - count));
    }
  });

  it('Pro user has Infinity remaining', () => {
    const check = canSearchAi(0, true);
    expect(check.limit).toBe(Infinity);
  });
});

describe('alert message', () => {
  it('contains limit count in Japanese', () => {
    const blocked = checkAiSearchLimit(3, false);
    const message = `無料プランでは1日${blocked!.limit}回までAI検索できます。`;
    expect(message).toContain('3回');
  });
});
