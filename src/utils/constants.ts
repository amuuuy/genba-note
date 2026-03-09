/**
 * Validation constants for ポチッと事務
 *
 * These limits ensure:
 * 1. Calculations stay within JavaScript's safe integer range
 * 2. Practical limits for construction business use cases
 */

/** Maximum quantity value (99,999.999) */
export const MAX_QUANTITY = 99999.999;

/** Maximum quantityMilli value (99,999,999) */
export const MAX_QUANTITY_MILLI = 99999999;

/** Minimum quantity value (0.001) */
export const MIN_QUANTITY = 0.001;

/** Minimum quantityMilli value (1) */
export const MIN_QUANTITY_MILLI = 1;

/** Maximum unit price in yen (99,999,999 = ~100 million) */
export const MAX_UNIT_PRICE = 99999999;

/** Minimum unit price in yen (0) */
export const MIN_UNIT_PRICE = 0;

/** Maximum line items per document */
export const MAX_LINE_ITEMS = 100;

// Photo limits (app-wide)
/** Maximum total photos in the app */
export const MAX_TOTAL_PHOTOS = 1000;

/** Maximum photos per finance entry */
export const MAX_FINANCE_PHOTOS_PER_ENTRY = 5;

/** Maximum photo file size when adding (4.5MB) */
export const MAX_PHOTO_SIZE_ACTIVE_BYTES = 4_718_592; // 4.5 * 1024 * 1024

/** Maximum photo file size after storing (5.5MB) */
export const MAX_PHOTO_SIZE_STORE_BYTES = 5_767_168; // 5.5 * 1024 * 1024

/** Maximum document total in yen (9,999,999,999 = ~10 billion) */
export const MAX_TOTAL_YEN = 9999999999;

/** JavaScript's maximum safe integer */
export const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

/** Quantity decimal places (3) */
export const QUANTITY_DECIMAL_PLACES = 3;

/** Milli multiplier (1000) for quantity conversion */
export const MILLI_MULTIPLIER = 1000;

/**
 * Validate that a calculation won't overflow
 * @param quantityMilli Quantity in milli-units
 * @param unitPrice Unit price in yen
 * @returns true if calculation is safe
 */
export function isCalculationSafe(
  quantityMilli: number,
  unitPrice: number
): boolean {
  return quantityMilli * unitPrice <= MAX_SAFE_INTEGER;
}

/**
 * Document number prefix validation pattern
 * Allows: alphanumeric, hyphen, underscore
 * Length: 1-10 characters
 */
export const PREFIX_PATTERN = /^[a-zA-Z0-9_-]{1,10}$/;

/**
 * Invoice registration number pattern (T + 13 digits)
 */
export const INVOICE_NUMBER_PATTERN = /^T\d{13}$/;

/**
 * Storage keys for AsyncStorage
 */
export const STORAGE_KEYS = {
  DOCUMENTS: '@genba_documents',
  UNIT_PRICES: '@genba_unitPrices',
  SETTINGS: '@genba_settings',
  SCHEMA_VERSION: '@genba_schemaVersion',
  CUSTOMERS: '@genba_customers',
  CUSTOMER_PHOTOS: '@genba_customerPhotos',
  WORK_LOG_ENTRIES: '@genba_workLogEntries',
  FINANCE_ENTRIES: '@genba_financeEntries',
  FINANCE_PHOTOS: '@genba_financePhotos',
  CALENDAR_EVENTS: '@genba_calendarEvents',
} as const;

/**
 * Storage keys for expo-secure-store
 */
export const SECURE_STORAGE_KEYS = {
  SENSITIVE_ISSUER_INFO: 'sensitive_issuer_info',
  ISSUER_SNAPSHOT_PREFIX: 'issuer_snapshot_',
} as const;
