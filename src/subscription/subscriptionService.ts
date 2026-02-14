/**
 * Subscription Service
 *
 * RevenueCat SDK integration for subscription management.
 * Handles online verification and cache updates.
 *
 * SPEC 2.8.3: Uses RevenueCat as the billing provider
 * SPEC 2.8.4-2.8.7: Implements 4-value cache system and online verification
 */

import Purchases, { CustomerInfo } from 'react-native-purchases';
import type { SubscriptionCache, ProValidationResult } from '@/types/subscription';
import * as secureStorageService from '@/storage/secureStorageService';
import { getDeviceUptime } from './uptimeService';
import { validateProOffline } from './offlineValidationService';
import type {
  SubscriptionResult,
  VerificationResult,
  SubscriptionServiceError,
} from './types';
import { successResult, errorResult, createSubscriptionError } from './types';

/** Pro entitlement identifier in RevenueCat */
const PRO_ENTITLEMENT_ID = 'pro';

/**
 * Configure RevenueCat SDK
 *
 * Must be called at app startup before any other subscription operations.
 *
 * @param apiKey - RevenueCat API key from environment
 * @returns SubscriptionResult indicating success or failure
 */
export async function configureRevenueCat(
  apiKey: string
): Promise<SubscriptionResult<void>> {
  try {
    Purchases.configure({ apiKey });
    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createSubscriptionError(
        'RC_NOT_CONFIGURED',
        'Failed to configure RevenueCat SDK',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Extract subscription data from CustomerInfo
 */
function extractSubscriptionData(customerInfo: CustomerInfo): {
  isProActive: boolean;
  expirationDate: number | null;
  serverTime: number;
} {
  const proEntitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
  const isProActive = proEntitlement?.isActive === true;

  let expirationDate: number | null;
  if (!isProActive) {
    // Not subscribed: use 0 to indicate explicitly inactive
    expirationDate = 0;
  } else if (proEntitlement?.expirationDateMillis === null) {
    // Lifetime subscription
    expirationDate = null;
  } else {
    // Regular subscription with expiration
    expirationDate = proEntitlement?.expirationDateMillis ?? 0;
  }

  // Use requestDate (ISO 8601 string) as server time — no Date.now() fallback
  const requestDateStr = customerInfo.requestDate;
  if (!requestDateStr) {
    throw new Error('customerInfo.requestDate is missing');
  }
  const serverTime = Date.parse(requestDateStr);
  if (Number.isNaN(serverTime)) {
    throw new Error(`Invalid requestDate: ${requestDateStr}`);
  }

  return { isProActive, expirationDate, serverTime };
}

/**
 * Save subscription data to cache
 */
async function saveToCache(
  isProActive: boolean,
  expirationDate: number | null,
  serverTime: number,
  uptime: number
): Promise<SubscriptionResult<void>> {
  const cache: SubscriptionCache = {
    entitlementActive: isProActive,
    entitlementExpiration: expirationDate,
    lastVerifiedAt: serverTime,
    lastVerifiedUptime: uptime,
  };

  const saveResult = await secureStorageService.saveSubscriptionCache(cache);
  if (!saveResult.success) {
    return errorResult(
      createSubscriptionError(
        'CACHE_WRITE_ERROR',
        'Failed to save subscription cache'
      )
    );
  }

  return successResult(undefined);
}

/**
 * Verify subscription status online with RevenueCat
 *
 * Updates secure cache on success.
 *
 * @returns SubscriptionResult with verification data
 */
export async function verifySubscriptionOnline(): Promise<
  SubscriptionResult<VerificationResult>
> {
  // Get current uptime first
  const uptimeResult = await getDeviceUptime();
  if (!uptimeResult.success || uptimeResult.uptimeMs === undefined) {
    return errorResult(
      createSubscriptionError(
        'UPTIME_ERROR',
        'Failed to get device uptime'
      )
    );
  }

  // Fetch customer info from RevenueCat
  let customerInfo: CustomerInfo;
  try {
    customerInfo = await Purchases.getCustomerInfo();
  } catch (error) {
    return errorResult(
      createSubscriptionError(
        'RC_FETCH_ERROR',
        'Failed to fetch customer info from RevenueCat',
        error instanceof Error ? error : undefined
      )
    );
  }

  // Extract subscription data
  let isProActive: boolean;
  let expirationDate: number | null;
  let serverTime: number;
  try {
    ({ isProActive, expirationDate, serverTime } =
      extractSubscriptionData(customerInfo));
  } catch (error) {
    return errorResult(
      createSubscriptionError(
        'INVALID_SERVER_TIME',
        'Failed to parse server time from CustomerInfo',
        error instanceof Error ? error : undefined
      )
    );
  }

  // Save to cache (failure is non-fatal - online result is still valid)
  const saveResult = await saveToCache(
    isProActive,
    expirationDate,
    serverTime,
    uptimeResult.uptimeMs
  );
  if (!saveResult.success) {
    if (__DEV__) console.warn('[SubscriptionService] Cache write failed, using online result:', saveResult.error?.code);
  }

  return successResult({
    isProActive,
    expirationDate,
    serverTime,
  });
}

/**
 * Get current Pro status
 *
 * Flow:
 * 1. Try online verification if network available
 * 2. On success: update cache, return online_verified
 * 3. On failure: fall back to offline validation
 *
 * @returns ProValidationResult
 */
export async function getProStatus(): Promise<ProValidationResult> {
  // Try online verification first
  const onlineResult = await verifySubscriptionOnline();

  if (onlineResult.success && onlineResult.data) {
    // Online verification succeeded
    return {
      isProAllowed: onlineResult.data.isProActive,
      reason: 'online_verified',
      requiresOnlineVerification: false,
    };
  }

  // Fall back to offline validation
  // Get cached data
  const cacheResult = await secureStorageService.getSubscriptionCache();
  const cache = cacheResult.success ? cacheResult.data ?? null : null;

  // Get current uptime
  const uptimeResult = await getDeviceUptime();
  const currentUptime = uptimeResult.success ? uptimeResult.uptimeMs ?? 0 : 0;

  // Validate offline
  return validateProOffline({
    cache,
    currentTime: Date.now(),
    currentUptime,
  });
}

/**
 * Restore purchases (for "Restore Purchases" button)
 *
 * @returns SubscriptionResult with restoration status
 */
export async function restorePurchases(): Promise<
  SubscriptionResult<VerificationResult>
> {
  // Get current uptime first
  const uptimeResult = await getDeviceUptime();
  if (!uptimeResult.success || uptimeResult.uptimeMs === undefined) {
    return errorResult(
      createSubscriptionError(
        'UPTIME_ERROR',
        'Failed to get device uptime'
      )
    );
  }

  // Restore purchases via RevenueCat
  let customerInfo: CustomerInfo;
  try {
    customerInfo = await Purchases.restorePurchases();
  } catch (error) {
    return errorResult(
      createSubscriptionError(
        'RC_RESTORE_ERROR',
        'Failed to restore purchases',
        error instanceof Error ? error : undefined
      )
    );
  }

  // Extract subscription data
  let isProActive: boolean;
  let expirationDate: number | null;
  let serverTime: number;
  try {
    ({ isProActive, expirationDate, serverTime } =
      extractSubscriptionData(customerInfo));
  } catch (error) {
    return errorResult(
      createSubscriptionError(
        'INVALID_SERVER_TIME',
        'Failed to parse server time from CustomerInfo',
        error instanceof Error ? error : undefined
      )
    );
  }

  // Save to cache (failure is non-fatal - restore result is still valid)
  const saveResult = await saveToCache(
    isProActive,
    expirationDate,
    serverTime,
    uptimeResult.uptimeMs
  );
  if (!saveResult.success) {
    if (__DEV__) console.warn('[SubscriptionService] Cache write failed after restore:', saveResult.error?.code);
  }

  return successResult({
    isProActive,
    expirationDate,
    serverTime,
  });
}

/**
 * Clear all subscription data (for logout/reset)
 */
export async function clearSubscriptionData(): Promise<SubscriptionResult<void>> {
  const result = await secureStorageService.clearSubscriptionCache();
  if (!result.success) {
    return errorResult(
      createSubscriptionError(
        'CACHE_WRITE_ERROR',
        'Failed to clear subscription cache'
      )
    );
  }

  return successResult(undefined);
}
