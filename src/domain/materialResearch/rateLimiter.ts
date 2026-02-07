/**
 * Rate Limiter
 *
 * Simple in-memory per-key rate limiter.
 * Used by the Edge Function for per-IP rate limiting.
 * Extracted as a pure module for testability.
 */

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimiterOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  max: number;
}

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { windowMs, max } = options;
  const map = new Map<string, RateLimitEntry>();

  /**
   * Check if a key is within the rate limit.
   * Returns true if allowed, false if rate limited.
   */
  function check(key: string, now: number = Date.now()): boolean {
    const entry = map.get(key);

    if (!entry || now >= entry.resetAt) {
      map.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (entry.count >= max) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Reset the limiter (for testing)
   */
  function reset(): void {
    map.clear();
  }

  return { check, reset };
}
