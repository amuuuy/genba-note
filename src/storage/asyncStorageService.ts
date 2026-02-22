/**
 * AsyncStorage Service
 *
 * Wrapper for @react-native-async-storage/async-storage
 * Handles CRUD operations for:
 * - Documents (estimates/invoices)
 * - Unit prices (master data)
 * - App settings
 * - Schema version
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Document, DocumentFilter, DocumentSort } from '@/types/document';
import { UnitPrice, UnitPriceFilter } from '@/types/unitPrice';
import { AppSettings, DEFAULT_APP_SETTINGS } from '@/types/settings';
import { SEAL_SIZES, BACKGROUND_DESIGNS, DOCUMENT_TEMPLATE_IDS } from '@/types/settings';
import { STORAGE_KEYS } from '@/utils/constants';
import { deleteIssuerSnapshot } from './secureStorageService';
import {
  documentsQueue,
  unitPricesQueue,
  settingsQueue,
} from '@/utils/writeQueue';

// === Result Types ===

export type StorageErrorCode =
  | 'READ_ERROR'
  | 'WRITE_ERROR'
  | 'PARSE_ERROR'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'READONLY_MODE';

export interface StorageError {
  code: StorageErrorCode;
  message: string;
  originalError?: Error;
}

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: StorageError;
}

// === Read-Only Mode State ===
// Re-export from shared module for backwards compatibility
export {
  setReadOnlyMode,
  getReadOnlyMode,
} from './readOnlyModeState';

import { getReadOnlyMode } from './readOnlyModeState';

// === Helper Functions ===

function createError(
  code: StorageErrorCode,
  message: string,
  originalError?: Error
): StorageError {
  return { code, message, originalError };
}

function successResult<T>(data: T): StorageResult<T> {
  return { success: true, data };
}

function errorResult<T>(error: StorageError): StorageResult<T> {
  return { success: false, error };
}

function readOnlyError<T>(): StorageResult<T> {
  return errorResult(
    createError(
      'READONLY_MODE',
      'App is in read-only mode due to migration failure. Please retry migration or contact support.'
    )
  );
}

// === Document Operations ===

/**
 * Get all documents
 */
export async function getAllDocuments(): Promise<StorageResult<Document[]>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS);

    if (data === null) {
      return successResult([]);
    }

    try {
      const documents = (JSON.parse(data) as Document[]).map((doc) => ({
        ...doc,
        issuerSnapshot: {
          ...doc.issuerSnapshot,
          email: doc.issuerSnapshot?.email ?? null,
        },
      }));
      return successResult(documents);
    } catch {
      return errorResult(createError('PARSE_ERROR', 'Failed to parse documents'));
    }
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        'Failed to read documents',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Get document by ID
 */
export async function getDocumentById(
  id: string
): Promise<StorageResult<Document | null>> {
  const result = await getAllDocuments();

  if (!result.success) {
    return errorResult(result.error!);
  }

  const document = result.data?.find((d) => d.id === id) ?? null;
  return successResult(document);
}

/**
 * Save document (create or update)
 * Serialized via documentsQueue to prevent RMW race conditions.
 */
export async function saveDocument(
  document: Document
): Promise<StorageResult<Document>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  return documentsQueue.enqueue(async () => {
    // Re-check read-only mode inside queue to handle mode changes during wait
    if (getReadOnlyMode()) {
      return readOnlyError();
    }

    try {
      const result = await getAllDocuments();

      if (!result.success) {
        return errorResult<Document>(result.error!);
      }

      const documents = result.data ?? [];
      const existingIndex = documents.findIndex((d) => d.id === document.id);

      const now = Date.now();
      const updatedDocument = {
        ...document,
        updatedAt: now,
        createdAt: existingIndex === -1 ? now : documents[existingIndex].createdAt,
      };

      if (existingIndex !== -1) {
        documents[existingIndex] = updatedDocument;
      } else {
        documents.push(updatedDocument);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
      return successResult(updatedDocument);
    } catch (error) {
      return errorResult<Document>(
        createError(
          'WRITE_ERROR',
          'Failed to save document',
          error instanceof Error ? error : undefined
        )
      );
    }
  });
}

/**
 * Delete document and its sensitive snapshot.
 * Serialized via documentsQueue to prevent RMW race conditions.
 *
 * Deletion order: SecureStore snapshot first, then AsyncStorage document.
 * If SecureStore deletion fails, the document is NOT deleted (safe abort).
 * If AsyncStorage deletion fails after SecureStore succeeds, the sensitive
 * snapshot is already removed but the document remains — this partial state
 * is acceptable because the snapshot is recreated on next document save/export.
 */
export async function deleteDocument(id: string): Promise<StorageResult<void>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  return documentsQueue.enqueue(async () => {
    // Re-check read-only mode inside queue to handle mode changes during wait
    if (getReadOnlyMode()) {
      return readOnlyError();
    }

    try {
      // Delete sensitive data first - if this fails, abort without touching the document
      const snapshotResult = await deleteIssuerSnapshot(id);
      if (!snapshotResult.success) {
        return errorResult<void>(
          createError(
            'WRITE_ERROR',
            `Failed to delete sensitive snapshot, document deletion aborted: ${snapshotResult.error?.message}`,
            snapshotResult.error?.originalError
          )
        );
      }

      // Sensitive data deleted successfully - now delete the document
      const result = await getAllDocuments();

      if (!result.success) {
        return errorResult<void>(result.error!);
      }

      const documents = result.data ?? [];
      const filteredDocuments = documents.filter((d) => d.id !== id);

      await AsyncStorage.setItem(
        STORAGE_KEYS.DOCUMENTS,
        JSON.stringify(filteredDocuments)
      );

      return successResult(undefined);
    } catch (error) {
      return errorResult<void>(
        createError(
          'WRITE_ERROR',
          'Failed to delete document',
          error instanceof Error ? error : undefined
        )
      );
    }
  });
}

/**
 * Filter and sort documents
 */
export async function filterDocuments(
  filter?: DocumentFilter,
  sort?: DocumentSort
): Promise<StorageResult<Document[]>> {
  const result = await getAllDocuments();

  if (!result.success) {
    return errorResult(result.error!);
  }

  let documents = result.data ?? [];

  // Apply filters
  if (filter) {
    if (filter.type) {
      documents = documents.filter((d) => d.type === filter.type);
    }

    if (filter.status) {
      const statuses = Array.isArray(filter.status)
        ? filter.status
        : [filter.status];
      documents = documents.filter((d) => statuses.includes(d.status));
    }

    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      documents = documents.filter(
        (d) =>
          d.clientName.toLowerCase().includes(searchLower) ||
          d.documentNo.toLowerCase().includes(searchLower) ||
          (d.subject && d.subject.toLowerCase().includes(searchLower))
      );
    }

    if (filter.issueDateFrom) {
      documents = documents.filter((d) => d.issueDate >= filter.issueDateFrom!);
    }

    if (filter.issueDateTo) {
      documents = documents.filter((d) => d.issueDate <= filter.issueDateTo!);
    }
  }

  // Apply sort
  if (sort) {
    documents.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sort.field) {
        case 'issueDate':
          aValue = a.issueDate;
          bValue = b.issueDate;
          break;
        case 'createdAt':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'updatedAt':
          aValue = a.updatedAt;
          bValue = b.updatedAt;
          break;
        case 'documentNo':
          aValue = a.documentNo;
          bValue = b.documentNo;
          break;
        case 'clientName':
          aValue = a.clientName;
          bValue = b.clientName;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return successResult(documents);
}

// === Unit Price Operations ===

/**
 * Get all unit prices
 */
export async function getAllUnitPrices(): Promise<StorageResult<UnitPrice[]>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.UNIT_PRICES);

    if (data === null) {
      return successResult([]);
    }

    try {
      const unitPrices = JSON.parse(data) as UnitPrice[];
      return successResult(unitPrices);
    } catch {
      return errorResult(createError('PARSE_ERROR', 'Failed to parse unit prices'));
    }
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        'Failed to read unit prices',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Get unit price by ID
 */
export async function getUnitPriceById(
  id: string
): Promise<StorageResult<UnitPrice | null>> {
  const result = await getAllUnitPrices();

  if (!result.success) {
    return errorResult(result.error!);
  }

  const unitPrice = result.data?.find((up) => up.id === id) ?? null;
  return successResult(unitPrice);
}

/**
 * Save unit price (create or update)
 * Serialized via unitPricesQueue to prevent RMW race conditions.
 */
export async function saveUnitPrice(
  unitPrice: UnitPrice
): Promise<StorageResult<UnitPrice>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  return unitPricesQueue.enqueue(async () => {
    // Re-check read-only mode inside queue to handle mode changes during wait
    if (getReadOnlyMode()) {
      return readOnlyError();
    }

    try {
      const result = await getAllUnitPrices();

      if (!result.success) {
        return errorResult<UnitPrice>(result.error!);
      }

      const unitPrices = result.data ?? [];
      const existingIndex = unitPrices.findIndex((up) => up.id === unitPrice.id);

      const now = Date.now();
      const updatedUnitPrice = {
        ...unitPrice,
        updatedAt: now,
        createdAt: existingIndex === -1 ? now : unitPrices[existingIndex].createdAt,
      };

      if (existingIndex !== -1) {
        unitPrices[existingIndex] = updatedUnitPrice;
      } else {
        unitPrices.push(updatedUnitPrice);
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.UNIT_PRICES,
        JSON.stringify(unitPrices)
      );
      return successResult(updatedUnitPrice);
    } catch (error) {
      return errorResult<UnitPrice>(
        createError(
          'WRITE_ERROR',
          'Failed to save unit price',
          error instanceof Error ? error : undefined
        )
      );
    }
  });
}

/**
 * Delete unit price
 * Serialized via unitPricesQueue to prevent RMW race conditions.
 */
export async function deleteUnitPrice(id: string): Promise<StorageResult<void>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  return unitPricesQueue.enqueue(async () => {
    // Re-check read-only mode inside queue to handle mode changes during wait
    if (getReadOnlyMode()) {
      return readOnlyError();
    }

    try {
      const result = await getAllUnitPrices();

      if (!result.success) {
        return errorResult<void>(result.error!);
      }

      const unitPrices = result.data ?? [];
      const filteredUnitPrices = unitPrices.filter((up) => up.id !== id);

      await AsyncStorage.setItem(
        STORAGE_KEYS.UNIT_PRICES,
        JSON.stringify(filteredUnitPrices)
      );
      return successResult(undefined);
    } catch (error) {
      return errorResult<void>(
        createError(
          'WRITE_ERROR',
          'Failed to delete unit price',
          error instanceof Error ? error : undefined
        )
      );
    }
  });
}

/**
 * Search unit prices
 */
export async function searchUnitPrices(
  filter?: UnitPriceFilter
): Promise<StorageResult<UnitPrice[]>> {
  const result = await getAllUnitPrices();

  if (!result.success) {
    return errorResult(result.error!);
  }

  let unitPrices = result.data ?? [];

  if (filter) {
    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      unitPrices = unitPrices.filter(
        (up) =>
          up.name.toLowerCase().includes(searchLower) ||
          (up.category && up.category.toLowerCase().includes(searchLower)) ||
          (up.notes && up.notes.toLowerCase().includes(searchLower))
      );
    }

    if (filter.category) {
      unitPrices = unitPrices.filter((up) => up.category === filter.category);
    }
  }

  return successResult(unitPrices);
}

// === Settings Operations ===

// Allowed enum values derived from single source of truth in @/types/settings
const VALID_SEAL_SIZES: ReadonlySet<string> = new Set(SEAL_SIZES);
const VALID_BACKGROUND_DESIGNS: ReadonlySet<string> = new Set(BACKGROUND_DESIGNS);
const VALID_TEMPLATE_IDS: ReadonlySet<string> = new Set(DOCUMENT_TEMPLATE_IDS);

/**
 * Deep merge settings with defaults to ensure all fields exist.
 * This prevents crashes when stored settings are missing fields
 * due to schema evolution or data corruption.
 * Validates enum values and falls back to defaults for unknown values.
 */
function mergeSettingsWithDefaults(stored: Partial<AppSettings>): AppSettings {
  return {
    issuer: {
      companyName: stored.issuer?.companyName ?? DEFAULT_APP_SETTINGS.issuer.companyName,
      representativeName: stored.issuer?.representativeName ?? DEFAULT_APP_SETTINGS.issuer.representativeName,
      address: stored.issuer?.address ?? DEFAULT_APP_SETTINGS.issuer.address,
      phone: stored.issuer?.phone ?? DEFAULT_APP_SETTINGS.issuer.phone,
      fax: stored.issuer?.fax ?? DEFAULT_APP_SETTINGS.issuer.fax,
      sealImageUri: stored.issuer?.sealImageUri ?? DEFAULT_APP_SETTINGS.issuer.sealImageUri,
      contactPerson: stored.issuer?.contactPerson ?? DEFAULT_APP_SETTINGS.issuer.contactPerson,
      showContactPerson: stored.issuer?.showContactPerson ?? DEFAULT_APP_SETTINGS.issuer.showContactPerson,
      email: stored.issuer?.email ?? DEFAULT_APP_SETTINGS.issuer.email,
    },
    numbering: {
      estimatePrefix: stored.numbering?.estimatePrefix ?? DEFAULT_APP_SETTINGS.numbering.estimatePrefix,
      invoicePrefix: stored.numbering?.invoicePrefix ?? DEFAULT_APP_SETTINGS.numbering.invoicePrefix,
      nextEstimateNumber: stored.numbering?.nextEstimateNumber ?? DEFAULT_APP_SETTINGS.numbering.nextEstimateNumber,
      nextInvoiceNumber: stored.numbering?.nextInvoiceNumber ?? DEFAULT_APP_SETTINGS.numbering.nextInvoiceNumber,
    },
    invoiceTemplateType: stored.invoiceTemplateType ?? DEFAULT_APP_SETTINGS.invoiceTemplateType,
    sealSize: (stored.sealSize && VALID_SEAL_SIZES.has(stored.sealSize))
      ? stored.sealSize : DEFAULT_APP_SETTINGS.sealSize,
    backgroundDesign: (stored.backgroundDesign && VALID_BACKGROUND_DESIGNS.has(stored.backgroundDesign))
      ? stored.backgroundDesign : DEFAULT_APP_SETTINGS.backgroundDesign,
    backgroundImageUri: stored.backgroundImageUri ?? DEFAULT_APP_SETTINGS.backgroundImageUri,
    defaultEstimateTemplateId: (stored.defaultEstimateTemplateId && VALID_TEMPLATE_IDS.has(stored.defaultEstimateTemplateId))
      ? stored.defaultEstimateTemplateId : DEFAULT_APP_SETTINGS.defaultEstimateTemplateId,
    defaultInvoiceTemplateId: (stored.defaultInvoiceTemplateId && VALID_TEMPLATE_IDS.has(stored.defaultInvoiceTemplateId))
      ? stored.defaultInvoiceTemplateId
      : (stored.invoiceTemplateType === 'SIMPLE' ? 'SIMPLE' : 'ACCOUNTING'),
    schemaVersion: stored.schemaVersion ?? DEFAULT_APP_SETTINGS.schemaVersion,
  };
}

/**
 * Get app settings
 * Returns default settings if none exist.
 * Merges stored settings with defaults to handle missing fields.
 */
export async function getSettings(): Promise<StorageResult<AppSettings>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);

    if (data === null) {
      return successResult(DEFAULT_APP_SETTINGS);
    }

    try {
      const storedSettings = JSON.parse(data) as Partial<AppSettings>;
      // Merge with defaults to ensure all fields exist
      const settings = mergeSettingsWithDefaults(storedSettings);
      return successResult(settings);
    } catch {
      return errorResult(createError('PARSE_ERROR', 'Failed to parse settings'));
    }
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        'Failed to read settings',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Internal function to save settings without queue.
 * Used by updateSettings and updateSettingsAtomic which already hold the queue lock.
 * IMPORTANT: Only call this if you've already acquired settingsQueue lock.
 * Note: This function still checks read-only mode for safety.
 */
async function _saveSettingsInternal(
  settings: AppSettings
): Promise<StorageResult<AppSettings>> {
  // Always check read-only mode for safety
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return successResult(settings);
  } catch (error) {
    return errorResult<AppSettings>(
      createError(
        'WRITE_ERROR',
        'Failed to save settings',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Atomically update settings with a transform function.
 * Serialized via settingsQueue to prevent RMW race conditions.
 * Use this for operations that need to read, modify, and write settings atomically.
 *
 * @param transform - Function that receives current settings and returns updated settings
 * @returns Result containing the updated settings
 */
export async function updateSettingsAtomic(
  transform: (current: AppSettings) => AppSettings
): Promise<StorageResult<AppSettings>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  return settingsQueue.enqueue(async () => {
    try {
      const result = await getSettings();

      if (!result.success) {
        return errorResult<AppSettings>(result.error!);
      }

      const updatedSettings = transform(result.data!);
      return _saveSettingsInternal(updatedSettings);
    } catch (error) {
      return errorResult<AppSettings>(
        createError(
          'WRITE_ERROR',
          'Failed to update settings atomically',
          error instanceof Error ? error : undefined
        )
      );
    }
  });
}

/**
 * Save app settings
 * Serialized via settingsQueue to prevent RMW race conditions.
 */
export async function saveSettings(
  settings: AppSettings
): Promise<StorageResult<AppSettings>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  return settingsQueue.enqueue(() => _saveSettingsInternal(settings));
}

/**
 * Update app settings (partial update)
 * Merges provided fields with existing settings.
 * Serialized via settingsQueue to prevent RMW race conditions.
 */
export async function updateSettings(
  partial: Partial<AppSettings>
): Promise<StorageResult<AppSettings>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  return settingsQueue.enqueue(async () => {
    try {
      const result = await getSettings();

      if (!result.success) {
        return errorResult<AppSettings>(result.error!);
      }

      const existingSettings = result.data!;
      const updatedSettings: AppSettings = {
        ...existingSettings,
        ...partial,
        // Deep merge for nested objects
        issuer: {
          ...existingSettings.issuer,
          ...partial.issuer,
        },
        numbering: {
          ...existingSettings.numbering,
          ...partial.numbering,
        },
      };

      // Sync invoiceTemplateType ↔ defaultInvoiceTemplateId (backward compatibility)
      if (partial.invoiceTemplateType && !partial.defaultInvoiceTemplateId) {
        updatedSettings.defaultInvoiceTemplateId =
          partial.invoiceTemplateType === 'SIMPLE' ? 'SIMPLE' : 'ACCOUNTING';
      } else if (partial.defaultInvoiceTemplateId && !partial.invoiceTemplateType) {
        const id = partial.defaultInvoiceTemplateId;
        if (id === 'ACCOUNTING' || id === 'SIMPLE') {
          updatedSettings.invoiceTemplateType = id;
        }
      }

      return _saveSettingsInternal(updatedSettings);
    } catch (error) {
      return errorResult<AppSettings>(
        createError(
          'WRITE_ERROR',
          'Failed to update settings',
          error instanceof Error ? error : undefined
        )
      );
    }
  });
}

// === Schema Version Operations ===

/**
 * Get current schema version
 * Returns 0 if no version exists (fresh install or legacy data)
 */
export async function getSchemaVersion(): Promise<StorageResult<number>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION);

    if (data === null) {
      return successResult(0);
    }

    const version = parseInt(data, 10);
    return successResult(isNaN(version) ? 0 : version);
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        'Failed to read schema version',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Set schema version
 * Note: This is allowed even in read-only mode to support migration retry
 */
export async function setSchemaVersion(
  version: number
): Promise<StorageResult<void>> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, String(version));
    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to write schema version',
        error instanceof Error ? error : undefined
      )
    );
  }
}
