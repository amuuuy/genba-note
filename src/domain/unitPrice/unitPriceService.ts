/**
 * UnitPrice CRUD Service
 *
 * Domain service for unit price operations.
 * Wraps storage layer with validation and business logic.
 */

import type { UnitPrice, UnitPriceFilter } from '@/types/unitPrice';
import type { TaxRate } from '@/types/document';
import type { LineItemInput } from '@/domain/lineItem/lineItemService';
import {
  type UnitPriceResult,
  type UnitPriceServiceError,
  successResult,
  errorResult,
  createServiceError,
} from './types';
import {
  type UnitPriceInput,
  validateUnitPrice,
  normalizeOptionalString,
} from './validationService';
import { filterUnitPrices } from './searchService';
import {
  getAllUnitPrices,
  getUnitPriceById,
  saveUnitPrice,
  deleteUnitPrice,
} from '@/storage/asyncStorageService';
import { generateUUID } from '@/utils/uuid';

// Re-export types for convenience
export type { UnitPriceInput };

/**
 * Input for updating a unit price (all fields optional)
 */
export interface UpdateUnitPriceInput {
  name?: string;
  unit?: string;
  defaultPrice?: number;
  defaultTaxRate?: TaxRate;
  category?: string | null;
  notes?: string | null;
  packQty?: number | null;
  packPrice?: number | null;
}

/**
 * Create a new unit price
 * @param input - Unit price creation input
 * @returns Result containing created UnitPrice
 */
export async function createUnitPrice(
  input: UnitPriceInput
): Promise<UnitPriceResult<UnitPrice, UnitPriceServiceError>> {
  // Normalize optional fields
  const normalizedCategory = normalizeOptionalString(input.category);
  const normalizedNotes = normalizeOptionalString(input.notes);

  // Create unit price object
  const now = Date.now();
  const unitPrice: UnitPrice = {
    id: generateUUID(),
    name: input.name,
    unit: input.unit,
    defaultPrice: input.defaultPrice,
    defaultTaxRate: input.defaultTaxRate,
    category: normalizedCategory,
    notes: normalizedNotes,
    packQty: input.packQty ?? null,
    packPrice: input.packPrice ?? null,
    createdAt: now,
    updatedAt: now,
  };

  // Validate
  const validationErrors = validateUnitPrice(unitPrice);
  if (validationErrors.length > 0) {
    return errorResult(
      createServiceError('VALIDATION_ERROR', 'Unit price validation failed', {
        validationErrors,
      })
    );
  }

  // Save to storage
  const saveResult = await saveUnitPrice(unitPrice);
  if (!saveResult.success) {
    return errorResult(
      createServiceError('STORAGE_ERROR', 'Failed to save unit price', {
        originalError: saveResult.error?.originalError,
      })
    );
  }

  return successResult(saveResult.data!);
}

/**
 * Get a unit price by ID
 * @param id - Unit price ID
 * @returns Result containing UnitPrice or null
 */
export async function getUnitPrice(
  id: string
): Promise<UnitPriceResult<UnitPrice | null, UnitPriceServiceError>> {
  const result = await getUnitPriceById(id);

  if (!result.success) {
    return errorResult(
      createServiceError('STORAGE_ERROR', 'Failed to get unit price', {
        originalError: result.error?.originalError,
      })
    );
  }

  return successResult(result.data ?? null);
}

/**
 * List all unit prices with optional filtering
 * @param filter - Optional filter criteria
 * @returns Result containing array of UnitPrices
 */
export async function listUnitPrices(
  filter?: UnitPriceFilter
): Promise<UnitPriceResult<UnitPrice[], UnitPriceServiceError>> {
  const result = await getAllUnitPrices();

  if (!result.success) {
    return errorResult(
      createServiceError('STORAGE_ERROR', 'Failed to list unit prices', {
        originalError: result.error?.originalError,
      })
    );
  }

  const unitPrices = result.data ?? [];

  // Apply filter if provided
  if (filter) {
    const filtered = filterUnitPrices(unitPrices, filter);
    return successResult(filtered);
  }

  return successResult(unitPrices);
}

/**
 * Update a unit price
 * @param id - Unit price ID
 * @param updates - Fields to update
 * @returns Result containing updated UnitPrice
 */
export async function updateUnitPrice(
  id: string,
  updates: UpdateUnitPriceInput
): Promise<UnitPriceResult<UnitPrice, UnitPriceServiceError>> {
  // Get existing unit price
  const getResult = await getUnitPriceById(id);

  if (!getResult.success) {
    return errorResult(
      createServiceError('STORAGE_ERROR', 'Failed to get unit price for update', {
        originalError: getResult.error?.originalError,
      })
    );
  }

  if (!getResult.data) {
    return errorResult(
      createServiceError('UNIT_PRICE_NOT_FOUND', `Unit price with ID ${id} not found`)
    );
  }

  const existing = getResult.data;

  // Merge updates with existing data
  const updated: UnitPrice = {
    id: existing.id,
    name: updates.name !== undefined ? updates.name : existing.name,
    unit: updates.unit !== undefined ? updates.unit : existing.unit,
    defaultPrice:
      updates.defaultPrice !== undefined
        ? updates.defaultPrice
        : existing.defaultPrice,
    defaultTaxRate:
      updates.defaultTaxRate !== undefined
        ? updates.defaultTaxRate
        : existing.defaultTaxRate,
    category:
      updates.category !== undefined
        ? normalizeOptionalString(updates.category)
        : existing.category,
    notes:
      updates.notes !== undefined
        ? normalizeOptionalString(updates.notes)
        : existing.notes,
    packQty:
      updates.packQty !== undefined ? updates.packQty : (existing.packQty ?? null),
    packPrice:
      updates.packPrice !== undefined ? updates.packPrice : (existing.packPrice ?? null),
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };

  // Validate
  const validationErrors = validateUnitPrice(updated);
  if (validationErrors.length > 0) {
    return errorResult(
      createServiceError('VALIDATION_ERROR', 'Unit price validation failed', {
        validationErrors,
      })
    );
  }

  // Save to storage
  const saveResult = await saveUnitPrice(updated);
  if (!saveResult.success) {
    return errorResult(
      createServiceError('STORAGE_ERROR', 'Failed to save unit price update', {
        originalError: saveResult.error?.originalError,
      })
    );
  }

  return successResult(saveResult.data!);
}

/**
 * Delete a unit price
 * @param id - Unit price ID
 * @returns Result indicating success
 */
export async function deleteUnitPriceById(
  id: string
): Promise<UnitPriceResult<void, UnitPriceServiceError>> {
  // Check if exists
  const getResult = await getUnitPriceById(id);

  if (!getResult.success) {
    return errorResult(
      createServiceError('STORAGE_ERROR', 'Failed to get unit price for deletion', {
        originalError: getResult.error?.originalError,
      })
    );
  }

  if (getResult.data === null) {
    return errorResult(
      createServiceError('UNIT_PRICE_NOT_FOUND', `Unit price with ID ${id} not found`)
    );
  }

  // Delete
  const deleteResult = await deleteUnitPrice(id);
  if (!deleteResult.success) {
    return errorResult(
      createServiceError('STORAGE_ERROR', 'Failed to delete unit price', {
        originalError: deleteResult.error?.originalError,
      })
    );
  }

  return successResult(undefined);
}

/**
 * Duplicate a unit price
 * @param id - Source unit price ID
 * @returns Result containing duplicated UnitPrice
 */
export async function duplicateUnitPrice(
  id: string
): Promise<UnitPriceResult<UnitPrice, UnitPriceServiceError>> {
  // Get existing unit price
  const getResult = await getUnitPriceById(id);

  if (!getResult.success) {
    return errorResult(
      createServiceError('STORAGE_ERROR', 'Failed to get unit price for duplication', {
        originalError: getResult.error?.originalError,
      })
    );
  }

  if (!getResult.data) {
    return errorResult(
      createServiceError('UNIT_PRICE_NOT_FOUND', `Unit price with ID ${id} not found`)
    );
  }

  const original = getResult.data;
  const now = Date.now();

  // Create duplicate with new ID
  const duplicate: UnitPrice = {
    id: generateUUID(),
    name: original.name,
    unit: original.unit,
    defaultPrice: original.defaultPrice,
    defaultTaxRate: original.defaultTaxRate,
    category: original.category,
    notes: original.notes,
    packQty: original.packQty ?? null,
    packPrice: original.packPrice ?? null,
    createdAt: now,
    updatedAt: now,
  };

  // Save to storage
  const saveResult = await saveUnitPrice(duplicate);
  if (!saveResult.success) {
    return errorResult(
      createServiceError('STORAGE_ERROR', 'Failed to save duplicated unit price', {
        originalError: saveResult.error?.originalError,
      })
    );
  }

  return successResult(saveResult.data!);
}

/**
 * Convert a UnitPrice to LineItemInput for quick entry
 * Default quantity is 1 (quantityMilli = 1000)
 *
 * @param unitPrice - Source unit price
 * @param quantityMilli - Optional quantity (default: 1000 = 1.000)
 * @returns LineItemInput ready for addLineItem
 */
export function unitPriceToLineItemInput(
  unitPrice: UnitPrice,
  quantityMilli: number = 1000
): LineItemInput {
  return {
    name: unitPrice.name,
    unit: unitPrice.unit,
    unitPrice: unitPrice.defaultPrice,
    taxRate: unitPrice.defaultTaxRate,
    quantityMilli,
  };
}

/**
 * Convert a LineItemInput to UnitPriceInput for registering to unit price list
 * Reverse of unitPriceToLineItemInput.
 * quantityMilli is not transferred (unit prices don't store quantity).
 *
 * @param input - Source line item input
 * @returns UnitPriceInput ready for createUnitPrice
 */
export function lineItemToUnitPriceInput(
  input: LineItemInput
): UnitPriceInput {
  return {
    name: input.name,
    unit: input.unit,
    defaultPrice: input.unitPrice,
    defaultTaxRate: input.taxRate,
    category: null,
    notes: null,
    packQty: null,
    packPrice: null,
  };
}
