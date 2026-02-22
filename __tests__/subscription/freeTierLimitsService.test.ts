/**
 * Free Tier Limits Service Tests
 *
 * Tests for the free tier resource limits.
 * Pro users have no limits; free users are capped.
 */

import {
  FREE_DOCUMENT_LIMIT,
  FREE_CUSTOMER_LIMIT,
  FREE_UNIT_PRICE_LIMIT,
  FREE_PHOTOS_PER_CUSTOMER_LIMIT,
  FREE_AI_SEARCH_DAILY_LIMIT,
  FREE_RAKUTEN_SEARCH_DAILY_LIMIT,
  canCreateDocument,
  canCreateCustomer,
  canCreateUnitPrice,
  canAddPhoto,
  canCreateFinanceEntry,
  canSearchAi,
  canSearchRakuten,
  type FreeTierCheckResult,
} from '@/subscription/freeTierLimitsService';

// === Constants Tests ===

describe('Free tier limit constants', () => {
  it('should define correct limits', () => {
    expect(FREE_AI_SEARCH_DAILY_LIMIT).toBe(3);
    expect(FREE_RAKUTEN_SEARCH_DAILY_LIMIT).toBe(5);
    expect(FREE_DOCUMENT_LIMIT).toBe(10);
    expect(FREE_CUSTOMER_LIMIT).toBe(5);
    expect(FREE_UNIT_PRICE_LIMIT).toBe(10);
    expect(FREE_PHOTOS_PER_CUSTOMER_LIMIT).toBe(3);
  });
});

// === canCreateDocument Tests ===

describe('canCreateDocument', () => {
  describe('when user is Pro', () => {
    it('should allow creation regardless of count', () => {
      const result = canCreateDocument(0, true);
      expect(result.allowed).toBe(true);
    });

    it('should allow creation even beyond free limit', () => {
      const result = canCreateDocument(100, true);
      expect(result.allowed).toBe(true);
    });
  });

  describe('when user is Free', () => {
    it('should allow creation when count is 0', () => {
      const result = canCreateDocument(0, false);
      expect(result).toEqual({
        allowed: true,
        current: 0,
        limit: FREE_DOCUMENT_LIMIT,
      });
    });

    it('should allow creation when count is below limit', () => {
      const result = canCreateDocument(9, false);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(9);
      expect(result.limit).toBe(10);
    });

    it('should deny creation when count equals limit', () => {
      const result = canCreateDocument(10, false);
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(10);
      expect(result.limit).toBe(10);
    });

    it('should deny creation when count exceeds limit', () => {
      const result = canCreateDocument(FREE_DOCUMENT_LIMIT + 1, false);
      expect(result.allowed).toBe(false);
    });

    it('should handle edge case: count is exactly limit minus 1', () => {
      const result = canCreateDocument(FREE_DOCUMENT_LIMIT - 1, false);
      expect(result.allowed).toBe(true);
    });
  });
});

// === canCreateCustomer Tests ===

describe('canCreateCustomer', () => {
  describe('when user is Pro', () => {
    it('should allow creation regardless of count', () => {
      expect(canCreateCustomer(999, true).allowed).toBe(true);
    });
  });

  describe('when user is Free', () => {
    it('should allow when below limit', () => {
      const result = canCreateCustomer(2, false);
      expect(result).toEqual({
        allowed: true,
        current: 2,
        limit: FREE_CUSTOMER_LIMIT,
      });
    });

    it('should allow when below new limit', () => {
      const result = canCreateCustomer(4, false);
      expect(result).toEqual({
        allowed: true,
        current: 4,
        limit: FREE_CUSTOMER_LIMIT,
      });
    });

    it('should deny when at limit', () => {
      const result = canCreateCustomer(5, false);
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(5);
      expect(result.limit).toBe(5);
    });

    it('should deny when above limit', () => {
      expect(canCreateCustomer(7, false).allowed).toBe(false);
    });
  });
});

// === canCreateUnitPrice Tests ===

describe('canCreateUnitPrice', () => {
  describe('when user is Pro', () => {
    it('should allow creation regardless of count', () => {
      expect(canCreateUnitPrice(999, true).allowed).toBe(true);
    });
  });

  describe('when user is Free', () => {
    it('should allow when below limit', () => {
      const result = canCreateUnitPrice(9, false);
      expect(result).toEqual({
        allowed: true,
        current: 9,
        limit: FREE_UNIT_PRICE_LIMIT,
      });
    });

    it('should deny when at limit', () => {
      const result = canCreateUnitPrice(10, false);
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(10);
      expect(result.limit).toBe(10);
    });

    it('should allow when count is 0', () => {
      expect(canCreateUnitPrice(0, false).allowed).toBe(true);
    });
  });
});

// === canAddPhoto Tests ===

describe('canAddPhoto', () => {
  describe('when user is Pro', () => {
    it('should allow adding photos regardless of count', () => {
      expect(canAddPhoto(100, true).allowed).toBe(true);
    });
  });

  describe('when user is Free', () => {
    it('should allow when below limit', () => {
      const result = canAddPhoto(2, false);
      expect(result).toEqual({
        allowed: true,
        current: 2,
        limit: FREE_PHOTOS_PER_CUSTOMER_LIMIT,
      });
    });

    it('should deny when at limit', () => {
      const result = canAddPhoto(3, false);
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(3);
      expect(result.limit).toBe(3);
    });

    it('should allow when count is 0', () => {
      expect(canAddPhoto(0, false).allowed).toBe(true);
    });
  });
});

// === canCreateFinanceEntry Tests ===

describe('canCreateFinanceEntry', () => {
  describe('when user is Pro', () => {
    it('should allow creating finance entries', () => {
      expect(canCreateFinanceEntry(true).allowed).toBe(true);
    });
  });

  describe('when user is Free', () => {
    it('should deny creating finance entries', () => {
      const result = canCreateFinanceEntry(false);
      expect(result.allowed).toBe(false);
    });
  });
});

// === canSearchAi Tests ===

describe('canSearchAi', () => {
  it('allows free user when below daily limit', () => {
    const result = canSearchAi(2, false);
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(2);
    expect(result.limit).toBe(FREE_AI_SEARCH_DAILY_LIMIT);
  });

  it('denies free user when at daily limit', () => {
    const result = canSearchAi(3, false);
    expect(result.allowed).toBe(false);
  });

  it('allows Pro user regardless of count', () => {
    const result = canSearchAi(999, true);
    expect(result.allowed).toBe(true);
  });
});

// === canSearchRakuten Tests ===

describe('canSearchRakuten', () => {
  it('allows free user when below daily limit', () => {
    const result = canSearchRakuten(4, false);
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(4);
    expect(result.limit).toBe(FREE_RAKUTEN_SEARCH_DAILY_LIMIT);
  });

  it('denies free user when at daily limit', () => {
    const result = canSearchRakuten(5, false);
    expect(result.allowed).toBe(false);
  });

  it('allows Pro user regardless of count', () => {
    const result = canSearchRakuten(999, true);
    expect(result.allowed).toBe(true);
  });
});

// === Result shape consistency ===

describe('FreeTierCheckResult shape', () => {
  it('should always include allowed, current, and limit for count-based checks', () => {
    const checks: FreeTierCheckResult[] = [
      canCreateDocument(0, false),
      canCreateCustomer(0, false),
      canCreateUnitPrice(0, false),
      canAddPhoto(0, false),
    ];

    for (const result of checks) {
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('limit');
      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.current).toBe('number');
      expect(typeof result.limit).toBe('number');
    }
  });

  it('should include allowed for boolean-based checks', () => {
    const result = canCreateFinanceEntry(false);
    expect(result).toHaveProperty('allowed');
    expect(typeof result.allowed).toBe('boolean');
  });
});
