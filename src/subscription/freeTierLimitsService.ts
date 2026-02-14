/**
 * Free Tier Limits Service
 *
 * Enforces resource limits for free-tier users.
 * Pro users have no limits.
 *
 * Limits:
 * - Documents: 5 total (cumulative, not restored on delete)
 * - Customers: 3
 * - Unit prices: 10
 * - Photos per customer: 3
 * - Finance entries: Pro only (free = read-only)
 */

// === Free Tier Limit Constants ===

/** Maximum documents a free user can ever create (cumulative) */
export const FREE_DOCUMENT_LIMIT = 5;

/** Maximum customers a free user can register */
export const FREE_CUSTOMER_LIMIT = 3;

/** Maximum unit price entries a free user can create */
export const FREE_UNIT_PRICE_LIMIT = 10;

/** Maximum photos per customer for a free user */
export const FREE_PHOTOS_PER_CUSTOMER_LIMIT = 3;

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
 * @param currentCount - Cumulative documents ever created (not current count)
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
