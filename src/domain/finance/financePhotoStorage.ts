/**
 * Finance Photo Storage Service
 *
 * Manages photos attached to finance entries (income/expense).
 * Uses AsyncStorage for metadata persistence.
 * Write operations are serialized via financePhotosQueue to prevent RMW race conditions.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  FinancePhoto,
  AddFinancePhotoInput,
  AddFinancePhotoRecordInput,
} from '@/types/financePhoto';
import {
  STORAGE_KEYS,
  MAX_TOTAL_PHOTOS,
  MAX_FINANCE_PHOTOS_PER_ENTRY,
  MAX_PHOTO_SIZE_ACTIVE_BYTES,
  MAX_PHOTO_SIZE_STORE_BYTES,
} from '@/utils/constants';
import {
  copyFinancePhotoToPermanentStorage,
  moveFinancePhotoToEntryDirectory,
  deleteStoredImage,
  deleteFinancePhotosDirectory,
  getFileSize,
} from '@/utils/imageUtils';
import { financePhotosQueue } from '@/utils/writeQueue';
import { generateUUID } from '@/utils/uuid';
import { getReadOnlyMode } from '@/storage/readOnlyModeState';
import type { FinanceResult, FinanceError, FinanceErrorCode } from './financeStorage';

// === Helper Functions ===

function createError(
  code: FinanceErrorCode,
  message: string,
  originalError?: Error
): FinanceError {
  return { code, message, originalError };
}

function successResult<T>(data: T): FinanceResult<T> {
  return { success: true, data };
}

function errorResult<T>(error: FinanceError): FinanceResult<T> {
  return { success: false, error };
}

function readOnlyError<T>(): FinanceResult<T> {
  return errorResult(
    createError(
      'READONLY_MODE',
      'App is in read-only mode. Cannot modify finance photos.'
    )
  );
}

/**
 * Get all finance photos from storage
 */
async function getAllPhotosFromStorage(): Promise<FinancePhoto[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.FINANCE_PHOTOS);
  if (!json) {
    return [];
  }
  return JSON.parse(json) as FinancePhoto[];
}

/**
 * Save all finance photos to storage
 */
async function saveAllPhotosToStorage(photos: FinancePhoto[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.FINANCE_PHOTOS, JSON.stringify(photos));
}

// === Types ===

/**
 * Result of photo limit validation
 */
export interface FinancePhotoLimitValidation {
  allowed: boolean;
  errorCode?: 'PHOTO_COUNT_LIMIT_EXCEEDED' | 'PHOTO_SIZE_LIMIT_EXCEEDED' | 'ENTRY_PHOTO_LIMIT_EXCEEDED';
  message?: string;
}

// === Public API ===

/**
 * Get total finance photo count
 */
export async function getTotalFinancePhotoCount(): Promise<FinanceResult<number>> {
  try {
    const photos = await getAllPhotosFromStorage();
    return successResult(photos.length);
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        'Failed to get finance photo count',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Validate photo limits before adding
 * Checks: total count, per-entry count, and source file size
 */
export async function validateFinancePhotoLimits(
  sourceUri: string,
  financeEntryId: string
): Promise<FinanceResult<FinancePhotoLimitValidation>> {
  try {
    const photos = await getAllPhotosFromStorage();

    // 1. Check total count limit
    if (photos.length >= MAX_TOTAL_PHOTOS) {
      return successResult({
        allowed: false,
        errorCode: 'PHOTO_COUNT_LIMIT_EXCEEDED',
        message: `写真の上限（${MAX_TOTAL_PHOTOS}枚）に達しました。不要な写真を削除してから追加してください。`,
      });
    }

    // 2. Check per-entry count limit
    const entryPhotos = photos.filter((p) => p.financeEntryId === financeEntryId);
    if (entryPhotos.length >= MAX_FINANCE_PHOTOS_PER_ENTRY) {
      return successResult({
        allowed: false,
        errorCode: 'ENTRY_PHOTO_LIMIT_EXCEEDED',
        message: `1件あたりの写真上限（${MAX_FINANCE_PHOTOS_PER_ENTRY}枚）に達しました。`,
      });
    }

    // 3. Check source file size (active limit) - fail-closed
    const fileSizeResult = await getFileSize(sourceUri);
    if (!fileSizeResult.success) {
      return errorResult(
        createError(
          'READ_ERROR',
          `ファイルサイズの取得に失敗しました: ${fileSizeResult.error}`
        )
      );
    }
    if (fileSizeResult.size! > MAX_PHOTO_SIZE_ACTIVE_BYTES) {
      const sizeMB = (fileSizeResult.size! / (1024 * 1024)).toFixed(1);
      const limitMB = (MAX_PHOTO_SIZE_ACTIVE_BYTES / (1024 * 1024)).toFixed(1);
      return successResult({
        allowed: false,
        errorCode: 'PHOTO_SIZE_LIMIT_EXCEEDED',
        message: `写真サイズ（${sizeMB}MB）が制限（${limitMB}MB）を超えています。`,
      });
    }

    return successResult({ allowed: true });
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        'Failed to validate finance photo limits',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Add a new photo to a finance entry
 */
export async function addFinancePhoto(
  input: AddFinancePhotoInput
): Promise<FinanceResult<FinancePhoto>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  try {
    // Validate limits before any file operation
    const validation = await validateFinancePhotoLimits(
      input.sourceUri,
      input.financeEntryId
    );
    if (!validation.success) {
      return errorResult(validation.error!);
    }
    if (!validation.data!.allowed) {
      return errorResult(
        createError('WRITE_ERROR', validation.data!.message!)
      );
    }

    // Copy photo to permanent storage
    const permanentUri = await copyFinancePhotoToPermanentStorage(
      input.sourceUri,
      input.financeEntryId
    );

    if (!permanentUri) {
      return errorResult(
        createError('WRITE_ERROR', 'Failed to copy photo to permanent storage')
      );
    }

    // Validate stored file size (store limit) - fail-closed
    const storedSizeResult = await getFileSize(permanentUri);
    if (!storedSizeResult.success) {
      await deleteStoredImage(permanentUri);
      return errorResult(
        createError(
          'READ_ERROR',
          `保存後のファイルサイズ取得に失敗しました: ${storedSizeResult.error}`
        )
      );
    }
    if (storedSizeResult.size! > MAX_PHOTO_SIZE_STORE_BYTES) {
      await deleteStoredImage(permanentUri);
      const sizeMB = (storedSizeResult.size! / (1024 * 1024)).toFixed(1);
      const limitMB = (MAX_PHOTO_SIZE_STORE_BYTES / (1024 * 1024)).toFixed(1);
      return errorResult(
        createError(
          'WRITE_ERROR',
          `保存後の写真サイズ（${sizeMB}MB）が制限（${limitMB}MB）を超えています。`
        )
      );
    }

    const now = Date.now();
    const photo: FinancePhoto = {
      id: generateUUID(),
      financeEntryId: input.financeEntryId,
      uri: permanentUri,
      originalFilename: input.originalFilename ?? null,
      addedAt: now,
      createdAt: now,
    };

    // Use queue to prevent RMW race conditions
    const queueResult = await financePhotosQueue.enqueue(async () => {
      if (getReadOnlyMode()) {
        return { success: false as const, reason: 'readonly' };
      }

      const photos = await getAllPhotosFromStorage();

      // Final count checks inside queue (atomic with save)
      if (photos.length >= MAX_TOTAL_PHOTOS) {
        return { success: false as const, reason: 'count_exceeded' };
      }
      const entryPhotos = photos.filter((p) => p.financeEntryId === input.financeEntryId);
      if (entryPhotos.length >= MAX_FINANCE_PHOTOS_PER_ENTRY) {
        return { success: false as const, reason: 'entry_limit_exceeded' };
      }

      photos.push(photo);
      await saveAllPhotosToStorage(photos);
      return { success: true as const };
    });

    if (!queueResult.success) {
      await deleteStoredImage(permanentUri);
      if (queueResult.reason === 'readonly') {
        return readOnlyError();
      }
      if (queueResult.reason === 'entry_limit_exceeded') {
        return errorResult(
          createError(
            'WRITE_ERROR',
            `1件あたりの写真上限（${MAX_FINANCE_PHOTOS_PER_ENTRY}枚）に達しました。`
          )
        );
      }
      return errorResult(
        createError(
          'WRITE_ERROR',
          `写真の上限（${MAX_TOTAL_PHOTOS}枚）に達しました。`
        )
      );
    }

    return successResult(photo);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to add finance photo',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Add a photo record for an already-stored temp file.
 * Used when photos are added before the FinanceEntry is saved.
 * The file is moved from temp to entry directory and metadata is created.
 *
 * @param input - Photo input including temp URI
 * @returns Result with photo (URI updated to new location) or error
 */
export async function addFinancePhotoRecord(
  input: AddFinancePhotoRecordInput
): Promise<FinanceResult<FinancePhoto>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  try {
    // Verify file exists before moving
    const fileSizeResult = await getFileSize(input.uri);
    if (!fileSizeResult.success) {
      return errorResult(
        createError('NOT_FOUND', '写真ファイルが見つかりません。再度選択してください。')
      );
    }

    // Move file from temp to entry directory
    const permanentUri = await moveFinancePhotoToEntryDirectory(
      input.uri,
      input.financeEntryId
    );

    if (!permanentUri) {
      return errorResult(
        createError('WRITE_ERROR', '写真の移動に失敗しました。')
      );
    }

    const now = Date.now();
    const photo: FinancePhoto = {
      id: generateUUID(),
      financeEntryId: input.financeEntryId,
      uri: permanentUri, // Use the new permanent URI
      originalFilename: input.originalFilename,
      addedAt: input.addedAt,
      createdAt: now,
    };

    // Use queue to prevent RMW race conditions
    const queueResult = await financePhotosQueue.enqueue(async () => {
      if (getReadOnlyMode()) {
        return { success: false as const, reason: 'readonly' };
      }

      const photos = await getAllPhotosFromStorage();

      // Final count checks inside queue
      if (photos.length >= MAX_TOTAL_PHOTOS) {
        return { success: false as const, reason: 'count_exceeded' };
      }
      const entryPhotos = photos.filter((p) => p.financeEntryId === input.financeEntryId);
      if (entryPhotos.length >= MAX_FINANCE_PHOTOS_PER_ENTRY) {
        return { success: false as const, reason: 'entry_limit_exceeded' };
      }

      photos.push(photo);
      await saveAllPhotosToStorage(photos);
      return { success: true as const };
    });

    if (!queueResult.success) {
      // Rollback: delete the moved file since metadata save failed
      await deleteStoredImage(permanentUri);

      if (queueResult.reason === 'readonly') {
        return readOnlyError();
      }
      if (queueResult.reason === 'entry_limit_exceeded') {
        return errorResult(
          createError(
            'WRITE_ERROR',
            `1件あたりの写真上限（${MAX_FINANCE_PHOTOS_PER_ENTRY}枚）に達しました。`
          )
        );
      }
      return errorResult(
        createError(
          'WRITE_ERROR',
          `写真の上限（${MAX_TOTAL_PHOTOS}枚）に達しました。`
        )
      );
    }

    return successResult(photo);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to add finance photo record',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Get photos by finance entry ID
 */
export async function getPhotosByFinanceEntry(
  financeEntryId: string
): Promise<FinanceResult<FinancePhoto[]>> {
  try {
    const photos = await getAllPhotosFromStorage();
    const filtered = photos
      .filter((p) => p.financeEntryId === financeEntryId)
      .sort((a, b) => b.addedAt - a.addedAt); // Newest first

    return successResult(filtered);
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        'Failed to get finance photos',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Delete a single finance photo by ID
 */
export async function deleteFinancePhoto(
  photoId: string
): Promise<FinanceResult<void>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  try {
    const result = await financePhotosQueue.enqueue(async () => {
      if (getReadOnlyMode()) {
        return { found: false as const, readonly: true };
      }

      const photos = await getAllPhotosFromStorage();
      const index = photos.findIndex((p) => p.id === photoId);

      if (index === -1) {
        return { found: false as const, readonly: false };
      }

      const photo = photos[index];
      photos.splice(index, 1);
      await saveAllPhotosToStorage(photos);

      return { found: true as const, uri: photo.uri };
    });

    if (result.readonly) {
      return readOnlyError();
    }

    if (!result.found) {
      return errorResult(
        createError('NOT_FOUND', `Photo with ID ${photoId} not found`)
      );
    }

    // Delete the actual file (outside queue)
    await deleteStoredImage(result.uri);

    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to delete finance photo',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Delete all photos for a finance entry
 */
export async function deletePhotosByFinanceEntry(
  financeEntryId: string
): Promise<FinanceResult<void>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  try {
    const queueResult = await financePhotosQueue.enqueue(async () => {
      if (getReadOnlyMode()) {
        return { success: false as const, readonly: true };
      }

      const photos = await getAllPhotosFromStorage();
      const remaining = photos.filter((p) => p.financeEntryId !== financeEntryId);
      await saveAllPhotosToStorage(remaining);
      return { success: true as const, readonly: false };
    });

    // Check if readonly was detected inside the queue
    if (queueResult.readonly) {
      return readOnlyError();
    }

    // Delete the entry's photo directory (outside queue) only after metadata is deleted
    await deleteFinancePhotosDirectory(financeEntryId);

    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createError(
        'WRITE_ERROR',
        'Failed to delete finance entry photos',
        error instanceof Error ? error : undefined
      )
    );
  }
}
