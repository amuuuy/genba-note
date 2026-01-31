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
import { STORAGE_KEYS } from '@/utils/constants';
import { deleteIssuerSnapshot } from './secureStorageService';

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

let isReadOnlyMode = false;

/**
 * Set read-only mode state
 * When enabled, all write operations will be blocked
 */
export function setReadOnlyMode(enabled: boolean): void {
  isReadOnlyMode = enabled;
}

/**
 * Get current read-only mode state
 */
export function getReadOnlyMode(): boolean {
  return isReadOnlyMode;
}

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
      const documents = JSON.parse(data) as Document[];
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
 */
export async function saveDocument(
  document: Document
): Promise<StorageResult<Document>> {
  if (isReadOnlyMode) {
    return readOnlyError();
  }

  try {
    const result = await getAllDocuments();

    if (!result.success) {
      return errorResult(result.error!);
    }

    const documents = result.data ?? [];
    const existingIndex = documents.findIndex((d) => d.id === document.id);

    const now = Date.now();
    const updatedDocument = {
      ...document,
      updatedAt: now,
      createdAt: existingIndex === -1 ? now : document.createdAt,
    };

    if (existingIndex !== -1) {
      documents[existingIndex] = updatedDocument;
    } else {
      documents.push(updatedDocument);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
    return successResult(updatedDocument);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to save document',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Delete document and its sensitive snapshot
 */
export async function deleteDocument(id: string): Promise<StorageResult<void>> {
  if (isReadOnlyMode) {
    return readOnlyError();
  }

  try {
    const result = await getAllDocuments();

    if (!result.success) {
      return errorResult(result.error!);
    }

    const documents = result.data ?? [];
    const filteredDocuments = documents.filter((d) => d.id !== id);

    await AsyncStorage.setItem(
      STORAGE_KEYS.DOCUMENTS,
      JSON.stringify(filteredDocuments)
    );

    // Also delete the sensitive issuer snapshot
    const snapshotResult = await deleteIssuerSnapshot(id);
    if (!snapshotResult.success) {
      // Snapshot deletion failed - document is already deleted but sensitive data remains
      // Return error to notify caller that cleanup was incomplete
      return errorResult(
        createError(
          'WRITE_ERROR',
          `Document deleted but failed to delete sensitive snapshot: ${snapshotResult.error?.message}`,
          snapshotResult.error?.originalError
        )
      );
    }

    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to delete document',
        error instanceof Error ? error : undefined
      )
    );
  }
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
 */
export async function saveUnitPrice(
  unitPrice: UnitPrice
): Promise<StorageResult<UnitPrice>> {
  if (isReadOnlyMode) {
    return readOnlyError();
  }

  try {
    const result = await getAllUnitPrices();

    if (!result.success) {
      return errorResult(result.error!);
    }

    const unitPrices = result.data ?? [];
    const existingIndex = unitPrices.findIndex((up) => up.id === unitPrice.id);

    const now = Date.now();
    const updatedUnitPrice = {
      ...unitPrice,
      updatedAt: now,
      createdAt: existingIndex === -1 ? now : unitPrice.createdAt,
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
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to save unit price',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Delete unit price
 */
export async function deleteUnitPrice(id: string): Promise<StorageResult<void>> {
  if (isReadOnlyMode) {
    return readOnlyError();
  }

  try {
    const result = await getAllUnitPrices();

    if (!result.success) {
      return errorResult(result.error!);
    }

    const unitPrices = result.data ?? [];
    const filteredUnitPrices = unitPrices.filter((up) => up.id !== id);

    await AsyncStorage.setItem(
      STORAGE_KEYS.UNIT_PRICES,
      JSON.stringify(filteredUnitPrices)
    );
    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to delete unit price',
        error instanceof Error ? error : undefined
      )
    );
  }
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

/**
 * Get app settings
 * Returns default settings if none exist
 */
export async function getSettings(): Promise<StorageResult<AppSettings>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);

    if (data === null) {
      return successResult(DEFAULT_APP_SETTINGS);
    }

    try {
      const settings = JSON.parse(data) as AppSettings;
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
 * Save app settings
 */
export async function saveSettings(
  settings: AppSettings
): Promise<StorageResult<AppSettings>> {
  if (isReadOnlyMode) {
    return readOnlyError();
  }

  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return successResult(settings);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to save settings',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Update app settings (partial update)
 * Merges provided fields with existing settings
 */
export async function updateSettings(
  partial: Partial<AppSettings>
): Promise<StorageResult<AppSettings>> {
  if (isReadOnlyMode) {
    return readOnlyError();
  }

  try {
    const result = await getSettings();

    if (!result.success) {
      return errorResult(result.error!);
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

    return saveSettings(updatedSettings);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to update settings',
        error instanceof Error ? error : undefined
      )
    );
  }
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
