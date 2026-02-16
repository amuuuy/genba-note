/**
 * Secure Storage Service
 *
 * Wrapper for expo-secure-store to manage sensitive data:
 * - Sensitive issuer info (invoice number, bank account)
 * - Document-specific issuer snapshots
 * - Subscription cache (4-value offline validation)
 */

import * as SecureStore from 'expo-secure-store';
import { SensitiveIssuerSettings } from '@/types/settings';
import { SensitiveIssuerSnapshot } from '@/types/document';
import { SubscriptionCache, SUBSCRIPTION_STORE_KEYS } from '@/types/subscription';
import { SECURE_STORAGE_KEYS } from '@/utils/constants';
import { getReadOnlyMode } from './readOnlyModeState';
import { getByteLength } from '@/utils/stringBytes';

// expo-secure-store value size limit (2KB)
const SECURE_STORE_VALUE_LIMIT = 2048;

// === Result Types ===

export type SecureStorageErrorCode =
  | 'READ_ERROR'
  | 'WRITE_ERROR'
  | 'DELETE_ERROR'
  | 'PARSE_ERROR'
  | 'UNAVAILABLE'
  | 'READONLY_MODE'
  | 'SIZE_LIMIT_EXCEEDED';

export interface SecureStorageError {
  code: SecureStorageErrorCode;
  message: string;
  originalError?: Error;
}

export interface SecureStorageResult<T> {
  success: boolean;
  data?: T;
  error?: SecureStorageError;
}

// === Helper Functions ===

function createError(
  code: SecureStorageErrorCode,
  message: string,
  originalError?: Error
): SecureStorageError {
  return { code, message, originalError };
}

function successResult<T>(data: T): SecureStorageResult<T> {
  return { success: true, data };
}

function errorResult<T>(error: SecureStorageError): SecureStorageResult<T> {
  return { success: false, error };
}

/**
 * Check if read-only mode is active and return error if so
 */
function checkReadOnlyMode(): SecureStorageResult<void> | null {
  if (getReadOnlyMode()) {
    return errorResult(
      createError('READONLY_MODE', 'Cannot modify data in read-only mode')
    );
  }
  return null;
}

// === Sensitive Issuer Info ===

/**
 * Get sensitive issuer information (invoice number, bank account)
 */
export async function getSensitiveIssuerInfo(): Promise<
  SecureStorageResult<SensitiveIssuerSettings | null>
> {
  try {
    const data = await SecureStore.getItemAsync(
      SECURE_STORAGE_KEYS.SENSITIVE_ISSUER_INFO
    );

    if (data === null) {
      return successResult(null);
    }

    try {
      const parsed = JSON.parse(data) as SensitiveIssuerSettings;
      return successResult(parsed);
    } catch {
      return errorResult(
        createError('PARSE_ERROR', 'Failed to parse sensitive issuer info')
      );
    }
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        'Failed to read sensitive issuer info',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Save sensitive issuer information
 */
export async function saveSensitiveIssuerInfo(
  info: SensitiveIssuerSettings
): Promise<SecureStorageResult<void>> {
  const readOnlyError = checkReadOnlyMode();
  if (readOnlyError) return readOnlyError;

  try {
    const jsonString = JSON.stringify(info);

    // Validate byte length before saving
    const byteLength = getByteLength(jsonString);
    if (byteLength > SECURE_STORE_VALUE_LIMIT) {
      return errorResult(
        createError(
          'SIZE_LIMIT_EXCEEDED',
          `データサイズ(${byteLength}バイト)が制限(${SECURE_STORE_VALUE_LIMIT}バイト)を超えています`
        )
      );
    }

    await SecureStore.setItemAsync(
      SECURE_STORAGE_KEYS.SENSITIVE_ISSUER_INFO,
      jsonString
    );
    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to save sensitive issuer info',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Delete sensitive issuer information
 * Used for rollback when initial save fails
 */
export async function deleteSensitiveIssuerInfo(): Promise<SecureStorageResult<void>> {
  const readOnlyError = checkReadOnlyMode();
  if (readOnlyError) return readOnlyError;

  try {
    await SecureStore.deleteItemAsync(SECURE_STORAGE_KEYS.SENSITIVE_ISSUER_INFO);
    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'DELETE_ERROR',
        'Failed to delete sensitive issuer info',
        error instanceof Error ? error : undefined
      )
    );
  }
}

// === Document-specific Issuer Snapshots ===

/**
 * Get issuer snapshot for a specific document
 */
export async function getIssuerSnapshot(
  documentId: string
): Promise<SecureStorageResult<SensitiveIssuerSnapshot | null>> {
  try {
    const key = `${SECURE_STORAGE_KEYS.ISSUER_SNAPSHOT_PREFIX}${documentId}`;
    const data = await SecureStore.getItemAsync(key);

    if (data === null) {
      return successResult(null);
    }

    try {
      const parsed = JSON.parse(data) as SensitiveIssuerSnapshot;
      return successResult(parsed);
    } catch {
      return errorResult(
        createError('PARSE_ERROR', `Failed to parse issuer snapshot for document ${documentId}`)
      );
    }
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        `Failed to read issuer snapshot for document ${documentId}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Save issuer snapshot for a specific document
 */
export async function saveIssuerSnapshot(
  documentId: string,
  snapshot: SensitiveIssuerSnapshot
): Promise<SecureStorageResult<void>> {
  const readOnlyError = checkReadOnlyMode();
  if (readOnlyError) return readOnlyError;

  try {
    const jsonString = JSON.stringify(snapshot);

    // Validate byte length before saving
    const byteLength = getByteLength(jsonString);
    if (byteLength > SECURE_STORE_VALUE_LIMIT) {
      return errorResult(
        createError(
          'SIZE_LIMIT_EXCEEDED',
          `スナップショットサイズ(${byteLength}バイト)が制限(${SECURE_STORE_VALUE_LIMIT}バイト)を超えています`
        )
      );
    }

    const key = `${SECURE_STORAGE_KEYS.ISSUER_SNAPSHOT_PREFIX}${documentId}`;
    await SecureStore.setItemAsync(key, jsonString);
    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        `Failed to save issuer snapshot for document ${documentId}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Delete issuer snapshot for a specific document
 */
export async function deleteIssuerSnapshot(
  documentId: string
): Promise<SecureStorageResult<void>> {
  const readOnlyError = checkReadOnlyMode();
  if (readOnlyError) return readOnlyError;

  try {
    const key = `${SECURE_STORAGE_KEYS.ISSUER_SNAPSHOT_PREFIX}${documentId}`;
    await SecureStore.deleteItemAsync(key);
    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'DELETE_ERROR',
        `Failed to delete issuer snapshot for document ${documentId}`,
        error instanceof Error ? error : undefined
      )
    );
  }
}

// === Subscription Cache ===

/**
 * Validate a subscription timestamp value.
 * Shared rule for get (string parse) and save (number input) paths.
 * Rejects NaN, Infinity, negative, and unsafe integers.
 */
function isValidSubscriptionTimestamp(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.floor(value));
}

/**
 * Get complete subscription cache
 * Returns null if any required value is missing
 */
export async function getSubscriptionCache(): Promise<
  SecureStorageResult<SubscriptionCache | null>
> {
  try {
    const [activeStr, expirationStr, verifiedAtStr, uptimeStr] = await Promise.all([
      SecureStore.getItemAsync(SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_ACTIVE),
      SecureStore.getItemAsync(SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_EXPIRATION),
      SecureStore.getItemAsync(SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_AT),
      SecureStore.getItemAsync(SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_UPTIME),
    ]);

    // If any value is missing, cache doesn't exist
    if (
      activeStr === null ||
      expirationStr === null ||
      verifiedAtStr === null ||
      uptimeStr === null
    ) {
      return successResult(null);
    }

    const entitlementActive = activeStr === 'true';

    // Handle expiration: 'null' string -> null (lifetime), number string -> number
    let entitlementExpiration: number | null;
    if (expirationStr === 'null') {
      entitlementExpiration = null;
    } else {
      if (!/^\d+$/.test(expirationStr)) {
        return errorResult(
          createError('PARSE_ERROR', 'Invalid entitlement expiration value')
        );
      }
      const parsed = Number(expirationStr);
      if (!Number.isSafeInteger(parsed)) {
        return errorResult(
          createError('PARSE_ERROR', 'Invalid entitlement expiration value')
        );
      }
      entitlementExpiration = parsed;
    }

    // Strict validation: digits-only + safe integer (consistent with individual getters)
    if (!/^\d+$/.test(verifiedAtStr) || !/^\d+$/.test(uptimeStr)) {
      return errorResult(
        createError('PARSE_ERROR', 'Invalid subscription cache values')
      );
    }
    const lastVerifiedAt = Number(verifiedAtStr);
    const lastVerifiedUptime = Number(uptimeStr);

    if (!Number.isSafeInteger(lastVerifiedAt) || !Number.isSafeInteger(lastVerifiedUptime)) {
      return errorResult(
        createError('PARSE_ERROR', 'Invalid subscription cache values')
      );
    }

    const cache: SubscriptionCache = {
      entitlementActive,
      entitlementExpiration,
      lastVerifiedAt,
      lastVerifiedUptime,
    };

    return successResult(cache);
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        'Failed to read subscription cache',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Save complete subscription cache
 */
export async function saveSubscriptionCache(
  cache: SubscriptionCache
): Promise<SecureStorageResult<void>> {
  const readOnlyError = checkReadOnlyMode();
  if (readOnlyError) return readOnlyError;

  // Validate inputs before writing (same rules as get-side parsing)
  if (cache.entitlementExpiration !== null && !isValidSubscriptionTimestamp(cache.entitlementExpiration)) {
    return errorResult(
      createError('WRITE_ERROR', 'Invalid entitlement_expiration value')
    );
  }
  if (!isValidSubscriptionTimestamp(cache.lastVerifiedAt)) {
    return errorResult(
      createError('WRITE_ERROR', 'Invalid lastVerifiedAt value')
    );
  }
  if (!isValidSubscriptionTimestamp(cache.lastVerifiedUptime)) {
    return errorResult(
      createError('WRITE_ERROR', 'Invalid lastVerifiedUptime value')
    );
  }

  try {
    // Normalize: Math.floor for consistency with individual setters
    const expirationStr =
      cache.entitlementExpiration === null
        ? 'null'
        : String(Math.floor(cache.entitlementExpiration));

    await Promise.all([
      SecureStore.setItemAsync(
        SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_ACTIVE,
        String(cache.entitlementActive)
      ),
      SecureStore.setItemAsync(
        SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_EXPIRATION,
        expirationStr
      ),
      SecureStore.setItemAsync(
        SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_AT,
        String(Math.floor(cache.lastVerifiedAt))
      ),
      SecureStore.setItemAsync(
        SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_UPTIME,
        String(Math.floor(cache.lastVerifiedUptime))
      ),
    ]);

    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to save subscription cache',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Clear all subscription cache values
 */
export async function clearSubscriptionCache(): Promise<SecureStorageResult<void>> {
  const readOnlyError = checkReadOnlyMode();
  if (readOnlyError) return readOnlyError;

  try {
    await Promise.all([
      SecureStore.deleteItemAsync(SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_ACTIVE),
      SecureStore.deleteItemAsync(SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_EXPIRATION),
      SecureStore.deleteItemAsync(SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_AT),
      SecureStore.deleteItemAsync(SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_UPTIME),
    ]);

    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'DELETE_ERROR',
        'Failed to clear subscription cache',
        error instanceof Error ? error : undefined
      )
    );
  }
}

// === Individual Subscription Values ===

/**
 * Get entitlement_active value
 */
export async function getEntitlementActive(): Promise<
  SecureStorageResult<boolean | null>
> {
  try {
    const value = await SecureStore.getItemAsync(
      SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_ACTIVE
    );

    if (value === null) {
      return successResult(null);
    }

    return successResult(value === 'true');
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        'Failed to read entitlement_active',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Set entitlement_active value
 */
export async function setEntitlementActive(
  active: boolean
): Promise<SecureStorageResult<void>> {
  const readOnlyError = checkReadOnlyMode();
  if (readOnlyError) return readOnlyError;

  try {
    await SecureStore.setItemAsync(
      SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_ACTIVE,
      String(active)
    );
    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to write entitlement_active',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Get entitlement_expiration value
 * Returns null if not set, or the stored value (number | null for lifetime)
 */
export async function getEntitlementExpiration(): Promise<
  SecureStorageResult<number | null>
> {
  try {
    const value = await SecureStore.getItemAsync(
      SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_EXPIRATION
    );

    if (value === null) {
      return successResult(null);
    }

    if (value === 'null') {
      return successResult(null);
    }

    if (!/^\d+$/.test(value)) {
      return errorResult(
        createError('PARSE_ERROR', `Invalid entitlement_expiration value: ${value}`)
      );
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) {
      return errorResult(
        createError('PARSE_ERROR', `Invalid entitlement_expiration value: ${value}`)
      );
    }
    return successResult(parsed);
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        'Failed to read entitlement_expiration',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Set entitlement_expiration value
 * @param expiration - timestamp in ms, 0 for explicitly inactive, null for lifetime
 */
export async function setEntitlementExpiration(
  expiration: number | null
): Promise<SecureStorageResult<void>> {
  const readOnlyError = checkReadOnlyMode();
  if (readOnlyError) return readOnlyError;

  if (expiration !== null && !isValidSubscriptionTimestamp(expiration)) {
    return errorResult(
      createError('WRITE_ERROR', 'Invalid entitlement_expiration value')
    );
  }

  try {
    const value = expiration === null ? 'null' : String(Math.floor(expiration));
    await SecureStore.setItemAsync(
      SUBSCRIPTION_STORE_KEYS.ENTITLEMENT_EXPIRATION,
      value
    );
    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to write entitlement_expiration',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Get last_verified_at value
 */
export async function getLastVerifiedAt(): Promise<
  SecureStorageResult<number | null>
> {
  try {
    const value = await SecureStore.getItemAsync(
      SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_AT
    );

    if (value === null) {
      return successResult(null);
    }

    if (!/^\d+$/.test(value)) {
      return errorResult(
        createError('PARSE_ERROR', `Invalid last_verified_at value: ${value}`)
      );
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) {
      return errorResult(
        createError('PARSE_ERROR', `Invalid last_verified_at value: ${value}`)
      );
    }
    return successResult(parsed);
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        'Failed to read last_verified_at',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Set last_verified_at value
 */
export async function setLastVerifiedAt(
  timestamp: number
): Promise<SecureStorageResult<void>> {
  const readOnlyError = checkReadOnlyMode();
  if (readOnlyError) return readOnlyError;

  if (!isValidSubscriptionTimestamp(timestamp)) {
    return errorResult(
      createError('WRITE_ERROR', 'Invalid last_verified_at value')
    );
  }

  try {
    await SecureStore.setItemAsync(
      SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_AT,
      String(Math.floor(timestamp))
    );
    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to write last_verified_at',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Get last_verified_uptime value
 */
export async function getLastVerifiedUptime(): Promise<
  SecureStorageResult<number | null>
> {
  try {
    const value = await SecureStore.getItemAsync(
      SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_UPTIME
    );

    if (value === null) {
      return successResult(null);
    }

    if (!/^\d+$/.test(value)) {
      return errorResult(
        createError('PARSE_ERROR', `Invalid last_verified_uptime value: ${value}`)
      );
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) {
      return errorResult(
        createError('PARSE_ERROR', `Invalid last_verified_uptime value: ${value}`)
      );
    }
    return successResult(parsed);
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        'Failed to read last_verified_uptime',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Set last_verified_uptime value
 */
export async function setLastVerifiedUptime(
  uptime: number
): Promise<SecureStorageResult<void>> {
  const readOnlyError = checkReadOnlyMode();
  if (readOnlyError) return readOnlyError;

  if (!isValidSubscriptionTimestamp(uptime)) {
    return errorResult(
      createError('WRITE_ERROR', 'Invalid last_verified_uptime value')
    );
  }

  try {
    await SecureStore.setItemAsync(
      SUBSCRIPTION_STORE_KEYS.LAST_VERIFIED_UPTIME,
      String(Math.floor(uptime))
    );
    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to write last_verified_uptime',
        error instanceof Error ? error : undefined
      )
    );
  }
}
