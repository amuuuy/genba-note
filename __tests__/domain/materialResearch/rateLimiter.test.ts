/**
 * Tests for rateLimiter
 *
 * Tests the rate limiting logic used by the Edge Function.
 * Extracted as a pure module for testability.
 */

import { createRateLimiter } from '@/domain/materialResearch/rateLimiter';

describe('createRateLimiter', () => {
  const WINDOW_MS = 60_000;
  const MAX = 10;

  it('allows requests within the limit', () => {
    const limiter = createRateLimiter({ windowMs: WINDOW_MS, max: MAX });
    const now = 1000;

    for (let i = 0; i < MAX; i++) {
      expect(limiter.check('ip-1', now)).toBe(true);
    }
  });

  it('rejects the 11th request from the same key', () => {
    const limiter = createRateLimiter({ windowMs: WINDOW_MS, max: MAX });
    const now = 1000;

    // Use up all 10 requests
    for (let i = 0; i < MAX; i++) {
      limiter.check('ip-1', now);
    }

    // 11th should be rejected
    expect(limiter.check('ip-1', now)).toBe(false);
  });

  it('resets after the time window expires', () => {
    const limiter = createRateLimiter({ windowMs: WINDOW_MS, max: MAX });
    const now = 1000;

    // Use up all 10 requests
    for (let i = 0; i < MAX; i++) {
      limiter.check('ip-1', now);
    }
    expect(limiter.check('ip-1', now)).toBe(false);

    // After window expires, should be allowed again
    const afterWindow = now + WINDOW_MS;
    expect(limiter.check('ip-1', afterWindow)).toBe(true);
  });

  it('tracks keys independently', () => {
    const limiter = createRateLimiter({ windowMs: WINDOW_MS, max: MAX });
    const now = 1000;

    // Use up all requests for ip-1
    for (let i = 0; i < MAX; i++) {
      limiter.check('ip-1', now);
    }
    expect(limiter.check('ip-1', now)).toBe(false);

    // ip-2 should still be allowed
    expect(limiter.check('ip-2', now)).toBe(true);
  });

  it('counts incrementally within the window', () => {
    const limiter = createRateLimiter({ windowMs: WINDOW_MS, max: 3 });
    const now = 1000;

    expect(limiter.check('ip-1', now)).toBe(true);      // 1st
    expect(limiter.check('ip-1', now + 100)).toBe(true); // 2nd
    expect(limiter.check('ip-1', now + 200)).toBe(true); // 3rd
    expect(limiter.check('ip-1', now + 300)).toBe(false); // 4th - rejected
  });

  it('reset clears all entries', () => {
    const limiter = createRateLimiter({ windowMs: WINDOW_MS, max: 1 });
    const now = 1000;

    limiter.check('ip-1', now);
    expect(limiter.check('ip-1', now)).toBe(false);

    limiter.reset();
    expect(limiter.check('ip-1', now)).toBe(true);
  });
});
