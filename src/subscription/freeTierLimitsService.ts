/**
 * Free Tier Limits Service
 *
 * Enforces resource limits for free-tier users.
 * Pro users have no limits.
 *
 * Limits:
 * - Documents: 10 active (current count, freed on delete)
 * - Customers: 5
 * - Unit prices: 10
 * - Photos per customer: 3
 * - Finance entries: Pro only (free = read-only)
 * - AI search: 3/day (free), unlimited (Pro)
 * - Rakuten search: 5/day (free), unlimited (Pro)
 */

// === Free Tier Limit Constants ===

/** Maximum active documents a free user can hold */
export const FREE_DOCUMENT_LIMIT = 10;

/** Maximum customers a free user can register */
export const FREE_CUSTOMER_LIMIT = 5;

/** Maximum unit price entries a free user can create */
export const FREE_UNIT_PRICE_LIMIT = 10;

/** Maximum photos per customer for a free user */
export const FREE_PHOTOS_PER_CUSTOMER_LIMIT = 3;

/** Maximum AI searches per day for a free user */
export const FREE_AI_SEARCH_DAILY_LIMIT = 3;

/** Maximum Rakuten searches per day for a free user */
export const FREE_RAKUTEN_SEARCH_DAILY_LIMIT = 5;

// === Result Type ===

export interface FreeTierCheckResult {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Current count of the resource */
  current: number;
  /** Maximum allowed for free tier (0 means feature is Pro-only) */
  limit: number;
}

// === Check Functions ===

/**
 * Check if a free user can create a new document.
 *
 * @param currentCount - Number of currently existing (active) documents
 * @param isPro - Whether the user has Pro access
 */
export function canCreateDocument(
  currentCount: number,
  isPro: boolean
): FreeTierCheckResult {
  if (isPro) {
    return { allowed: true, current: currentCount, limit: Infinity };
  }
  return {
    allowed: currentCount < FREE_DOCUMENT_LIMIT,
    current: currentCount,
    limit: FREE_DOCUMENT_LIMIT,
  };
}

/**
 * Check if a free user can register a new customer.
 *
 * @param currentCount - Current number of customers
 * @param isPro - Whether the user has Pro access
 */
export function canCreateCustomer(
  currentCount: number,
  isPro: boolean
): FreeTierCheckResult {
  if (isPro) {
    return { allowed: true, current: currentCount, limit: Infinity };
  }
  return {
    allowed: currentCount < FREE_CUSTOMER_LIMIT,
    current: currentCount,
    limit: FREE_CUSTOMER_LIMIT,
  };
}

/**
 * Check if a free user can create a new unit price entry.
 *
 * @param currentCount - Current number of unit price entries
 * @param isPro - Whether the user has Pro access
 */
export function canCreateUnitPrice(
  currentCount: number,
  isPro: boolean
): FreeTierCheckResult {
  if (isPro) {
    return { allowed: true, current: currentCount, limit: Infinity };
  }
  return {
    allowed: currentCount < FREE_UNIT_PRICE_LIMIT,
    current: currentCount,
    limit: FREE_UNIT_PRICE_LIMIT,
  };
}

/**
 * Check if a free user can add a photo to a customer.
 *
 * @param currentCountForCustomer - Current photo count for the specific customer
 * @param isPro - Whether the user has Pro access
 */
export function canAddPhoto(
  currentCountForCustomer: number,
  isPro: boolean
): FreeTierCheckResult {
  if (isPro) {
    return { allowed: true, current: currentCountForCustomer, limit: Infinity };
  }
  return {
    allowed: currentCountForCustomer < FREE_PHOTOS_PER_CUSTOMER_LIMIT,
    current: currentCountForCustomer,
    limit: FREE_PHOTOS_PER_CUSTOMER_LIMIT,
  };
}

/**
 * Check if a user can create a finance entry (Pro-only feature).
 *
 * Free users can view finance data but cannot create entries.
 *
 * @param isPro - Whether the user has Pro access
 */
export function canCreateFinanceEntry(isPro: boolean): FreeTierCheckResult {
  return {
    allowed: isPro,
    current: 0,
    limit: isPro ? Infinity : 0,
  };
}

/**
 * Check if a user can perform an AI search today.
 *
 * @param todayCount - Number of AI searches already performed today
 * @param isPro - Whether the user has Pro access
 */
export function canSearchAi(
  todayCount: number,
  isPro: boolean
): FreeTierCheckResult {
  if (isPro) {
    return { allowed: true, current: todayCount, limit: Infinity };
  }
  return {
    allowed: todayCount < FREE_AI_SEARCH_DAILY_LIMIT,
    current: todayCount,
    limit: FREE_AI_SEARCH_DAILY_LIMIT,
  };
}

/**
 * Check if a user can perform a Rakuten search today.
 *
 * @param todayCount - Number of Rakuten searches already performed today
 * @param isPro - Whether the user has Pro access
 */
export function canSearchRakuten(
  todayCount: number,
  isPro: boolean
): FreeTierCheckResult {
  if (isPro) {
    return { allowed: true, current: todayCount, limit: Infinity };
  }
  return {
    allowed: todayCount < FREE_RAKUTEN_SEARCH_DAILY_LIMIT,
    current: todayCount,
    limit: FREE_RAKUTEN_SEARCH_DAILY_LIMIT,
  };
}
