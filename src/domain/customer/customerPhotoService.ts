/**
 * Customer Photo Service
 *
 * Manages customer photos (before/after work)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CustomerPhoto,
  PhotoType,
  CustomerPhotoFilter,
  AddPhotoInput,
  AddPhotoRecordInput,
} from '@/types/customerPhoto';
import {
  CustomerDomainResult,
  successResult,
  errorResult,
  createCustomerServiceError,
} from './types';
import { generateUUID } from '@/utils/uuid';
import {
  STORAGE_KEYS,
  MAX_TOTAL_PHOTOS,
  MAX_PHOTO_SIZE_ACTIVE_BYTES,
  MAX_PHOTO_SIZE_STORE_BYTES,
} from '@/utils/constants';
import {
  copyCustomerPhotoToPermanentStorage,
  deleteStoredImage,
  deleteCustomerPhotosDirectory,
  imageUriToDataUrl,
  getFileSize,
} from '@/utils/imageUtils';
import { photosQueue } from '@/utils/writeQueue';
import { getReadOnlyMode } from '@/storage/readOnlyModeState';

// === Helper Functions ===

function readOnlyError<T>(): CustomerDomainResult<T> {
  return errorResult(
    createCustomerServiceError(
      'READONLY_MODE',
      'App is in read-only mode. Cannot modify customer photos.'
    )
  );
}

/**
 * Get all photos from storage
 */
async function getAllPhotosFromStorage(): Promise<CustomerPhoto[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOMER_PHOTOS);
  if (!json) {
    return [];
  }
  return JSON.parse(json) as CustomerPhoto[];
}

/**
 * Save all photos to storage
 */
async function saveAllPhotosToStorage(photos: CustomerPhoto[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMER_PHOTOS, JSON.stringify(photos));
}

// === Types ===

/**
 * Result of photo limit validation
 */
export interface PhotoLimitValidation {
  allowed: boolean;
  errorCode?: 'PHOTO_COUNT_LIMIT_EXCEEDED' | 'PHOTO_SIZE_LIMIT_EXCEEDED';
  message?: string;
}

// === Public API ===

/**
 * Get total photo count across all customers
 */
export async function getTotalPhotoCount(): Promise<CustomerDomainResult<number>> {
  try {
    const photos = await getAllPhotosFromStorage();
    return successResult(photos.length);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to get photo count',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Validate photo limits before adding
 * Checks count limit and source file size (active limit)
 */
export async function validatePhotoLimits(
  sourceUri: string
): Promise<CustomerDomainResult<PhotoLimitValidation>> {
  try {
    // 1. Check count limit
    const photos = await getAllPhotosFromStorage();
    if (photos.length >= MAX_TOTAL_PHOTOS) {
      return successResult({
        allowed: false,
        errorCode: 'PHOTO_COUNT_LIMIT_EXCEEDED',
        message: `写真の上限（${MAX_TOTAL_PHOTOS}枚）に達しました。不要な写真を削除してから追加してください。`,
      });
    }

    // 2. Check source file size (active limit) - fail-closed
    const fileSizeResult = await getFileSize(sourceUri);
    if (!fileSizeResult.success) {
      return errorResult(
        createCustomerServiceError(
          'STORAGE_ERROR',
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
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to validate photo limits',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Add a new photo to a customer
 */
export async function addPhoto(
  input: AddPhotoInput
): Promise<CustomerDomainResult<CustomerPhoto>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  let permanentUri: string | null = null;
  try {
    // Validate workLogEntryId is required for new photos (post-v6)
    if (!input.workLogEntryId) {
      return errorResult(
        createCustomerServiceError(
          'VALIDATION_ERROR',
          '作業日が選択されていません。写真を追加するには作業日を指定してください。'
        )
      );
    }

    // Validate limits before any file operation
    const validation = await validatePhotoLimits(input.sourceUri);
    if (!validation.success) {
      return errorResult(validation.error!);
    }
    if (!validation.data!.allowed) {
      return errorResult(
        createCustomerServiceError(
          validation.data!.errorCode!,
          validation.data!.message!
        )
      );
    }

    // Copy photo to permanent storage
    permanentUri = await copyCustomerPhotoToPermanentStorage(
      input.sourceUri,
      input.customerId,
      input.type
    );

    if (!permanentUri) {
      return errorResult(
        createCustomerServiceError(
          'STORAGE_ERROR',
          'Failed to copy photo to permanent storage'
        )
      );
    }

    // Validate stored file size (store limit) - fail-closed
    const storedSizeResult = await getFileSize(permanentUri);
    if (!storedSizeResult.success) {
      // Clean up: delete the copied file
      await deleteStoredImage(permanentUri);
      return errorResult(
        createCustomerServiceError(
          'STORAGE_ERROR',
          `保存後のファイルサイズ取得に失敗しました: ${storedSizeResult.error}`
        )
      );
    }
    if (storedSizeResult.size! > MAX_PHOTO_SIZE_STORE_BYTES) {
      // Clean up: delete the copied file
      await deleteStoredImage(permanentUri);
      const sizeMB = (storedSizeResult.size! / (1024 * 1024)).toFixed(1);
      const limitMB = (MAX_PHOTO_SIZE_STORE_BYTES / (1024 * 1024)).toFixed(1);
      return errorResult(
        createCustomerServiceError(
          'PHOTO_SIZE_LIMIT_EXCEEDED',
          `保存後の写真サイズ（${sizeMB}MB）が制限（${limitMB}MB）を超えています。`
        )
      );
    }

    const now = Date.now();
    const photo: CustomerPhoto = {
      id: generateUUID(),
      customerId: input.customerId,
      workLogEntryId: input.workLogEntryId ?? null,
      type: input.type,
      uri: permanentUri,
      originalFilename: input.originalFilename ?? null,
      takenAt: now,
      createdAt: now,
    };

    // Use queue to prevent RMW race conditions
    // Final count check inside queue to prevent concurrent additions exceeding limit
    const queueResult = await photosQueue.enqueue(async () => {
      // Re-check read-only mode inside queue to handle mode changes during wait
      if (getReadOnlyMode()) {
        return { success: false as const, reason: 'readonly' };
      }

      const photos = await getAllPhotosFromStorage();

      // Final count check inside queue (atomic with save)
      if (photos.length >= MAX_TOTAL_PHOTOS) {
        return { success: false as const, reason: 'count_exceeded' };
      }

      photos.push(photo);
      await saveAllPhotosToStorage(photos);
      return { success: true as const };
    });

    // If readonly was detected inside queue, clean up and return error
    if (!queueResult.success && queueResult.reason === 'readonly') {
      await deleteStoredImage(permanentUri);
      return readOnlyError();
    }

    // If final count check failed, clean up the copied file
    if (!queueResult.success) {
      await deleteStoredImage(permanentUri);
      return errorResult(
        createCustomerServiceError(
          'PHOTO_COUNT_LIMIT_EXCEEDED',
          `写真の上限（${MAX_TOTAL_PHOTOS}枚）に達しました。不要な写真を削除してから追加してください。`
        )
      );
    }

    return successResult(photo);
  } catch (error) {
    // Clean up copied file if it exists (exception may occur after file copy)
    if (permanentUri) {
      await deleteStoredImage(permanentUri).catch((e) => {
        if (__DEV__) console.warn('Failed to delete copied photo during cleanup:', permanentUri, e);
      });
    }
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to add photo',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Get photos by customer ID
 */
export async function getPhotosByCustomer(
  customerId: string,
  type?: PhotoType
): Promise<CustomerDomainResult<CustomerPhoto[]>> {
  try {
    const photos = await getAllPhotosFromStorage();

    let filtered = photos.filter((p) => p.customerId === customerId);

    if (type) {
      filtered = filtered.filter((p) => p.type === type);
    }

    // Sort by takenAt (newest first)
    filtered.sort((a, b) => b.takenAt - a.takenAt);

    return successResult(filtered);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to get photos',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Delete a single photo by ID
 */
export async function deletePhoto(
  photoId: string
): Promise<CustomerDomainResult<void>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  try {
    // Use queue to prevent RMW race conditions
    const result = await photosQueue.enqueue(async () => {
      // Re-check read-only mode inside queue to handle mode changes during wait
      if (getReadOnlyMode()) {
        return { found: false as const, readonly: true as const };
      }

      const photos = await getAllPhotosFromStorage();
      const index = photos.findIndex((p) => p.id === photoId);

      if (index === -1) {
        return { found: false as const };
      }

      // Get photo info before removing
      const photo = photos[index];

      // Remove from storage first (metadata)
      photos.splice(index, 1);
      await saveAllPhotosToStorage(photos);

      return { found: true as const, uri: photo.uri };
    });

    if ('readonly' in result && result.readonly) {
      return readOnlyError();
    }

    if (!result.found) {
      return errorResult(
        createCustomerServiceError(
          'CUSTOMER_NOT_FOUND',
          `Photo with ID ${photoId} not found`
        )
      );
    }

    // Delete the actual file (outside queue - file ops are independent)
    await deleteStoredImage(result.uri);

    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to delete photo',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Delete photo metadata only (without deleting the file).
 * Used for rollback when photo files should be preserved for retry.
 */
export async function deletePhotoMetadataOnly(
  photoId: string
): Promise<CustomerDomainResult<void>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  try {
    const result = await photosQueue.enqueue(async () => {
      // Re-check read-only mode inside queue to handle mode changes during wait
      if (getReadOnlyMode()) {
        return { found: false as const, readonly: true as const };
      }

      const photos = await getAllPhotosFromStorage();
      const index = photos.findIndex((p) => p.id === photoId);

      if (index === -1) {
        return { found: false as const };
      }

      photos.splice(index, 1);
      await saveAllPhotosToStorage(photos);

      return { found: true as const };
    });

    if ('readonly' in result && result.readonly) {
      return readOnlyError();
    }

    if (!result.found) {
      return errorResult(
        createCustomerServiceError(
          'CUSTOMER_NOT_FOUND',
          `Photo with ID ${photoId} not found`
        )
      );
    }

    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to delete photo metadata',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Delete all photo metadata for a customer (without deleting files).
 * Used by customerService where directory deletion is managed separately.
 */
export async function deletePhotoMetadataByCustomer(
  customerId: string
): Promise<CustomerDomainResult<void>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  try {
    const queueResult = await photosQueue.enqueue(async () => {
      if (getReadOnlyMode()) {
        return { success: false as const, readonly: true as const };
      }

      const photos = await getAllPhotosFromStorage();
      const remaining = photos.filter((p) => p.customerId !== customerId);
      await saveAllPhotosToStorage(remaining);
      return { success: true as const };
    });

    if ('readonly' in queueResult && queueResult.readonly) {
      return readOnlyError();
    }

    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to delete customer photo metadata',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Delete all photos for a customer (metadata + directory).
 * For standalone use outside customerService cascade.
 */
export async function deletePhotosByCustomer(
  customerId: string
): Promise<CustomerDomainResult<void>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  try {
    // Use queue to prevent RMW race conditions
    const queueResult = await photosQueue.enqueue(async () => {
      // Re-check read-only mode inside queue to handle mode changes during wait
      if (getReadOnlyMode()) {
        return { success: false as const, readonly: true as const };
      }

      const photos = await getAllPhotosFromStorage();

      // Filter out photos for this customer
      const remaining = photos.filter((p) => p.customerId !== customerId);

      // Update storage
      await saveAllPhotosToStorage(remaining);
      return { success: true as const };
    });

    if ('readonly' in queueResult && queueResult.readonly) {
      return readOnlyError();
    }

    // Delete the customer's photo directory (outside queue - file ops are independent)
    await deleteCustomerPhotosDirectory(customerId);

    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to delete customer photos',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Get photo data URLs for PDF embedding
 */
export async function getPhotoDataUrlsForPdf(
  customerId: string,
  type: PhotoType
): Promise<string[]> {
  const result = await getPhotosByCustomer(customerId, type);

  if (!result.success || !result.data) {
    return [];
  }

  const dataUrls: string[] = [];

  for (const photo of result.data) {
    const dataUrl = await imageUriToDataUrl(photo.uri);
    if (dataUrl) {
      dataUrls.push(dataUrl);
    }
  }

  return dataUrls;
}

/**
 * Get photos by work log entry ID
 * Returns photos sorted by takenAt (newest first)
 */
export async function getPhotosByWorkLogEntry(
  workLogEntryId: string,
  type?: PhotoType
): Promise<CustomerDomainResult<CustomerPhoto[]>> {
  try {
    const photos = await getAllPhotosFromStorage();

    let filtered = photos.filter((p) => p.workLogEntryId === workLogEntryId);

    if (type) {
      filtered = filtered.filter((p) => p.type === type);
    }

    // Sort by takenAt (newest first)
    filtered.sort((a, b) => b.takenAt - a.takenAt);

    return successResult(filtered);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to get photos by work log entry',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Update photo's work log entry association
 * Used to reassign photos between entries (workLogEntryId required)
 */
export async function updatePhotoWorkLogEntry(
  photoId: string,
  workLogEntryId: string
): Promise<CustomerDomainResult<CustomerPhoto>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  try {
    // Validate workLogEntryId is required (post-v6)
    if (!workLogEntryId) {
      return errorResult(
        createCustomerServiceError(
          'VALIDATION_ERROR',
          '作業日が選択されていません。写真を移動するには作業日を指定してください。'
        )
      );
    }

    const result = await photosQueue.enqueue(async () => {
      // Re-check read-only mode inside queue to handle mode changes during wait
      if (getReadOnlyMode()) {
        return { success: false as const, reason: 'readonly' as const };
      }

      const photos = await getAllPhotosFromStorage();
      const index = photos.findIndex((p) => p.id === photoId);

      if (index === -1) {
        return { success: false as const, reason: 'not_found' as const };
      }

      const photo = photos[index];
      const updated: CustomerPhoto = {
        ...photo,
        workLogEntryId,
      };

      photos[index] = updated;
      await saveAllPhotosToStorage(photos);
      return { success: true as const, photo: updated };
    });

    if (!result.success && result.reason === 'readonly') {
      return readOnlyError();
    }

    if (!result.success) {
      return errorResult(
        createCustomerServiceError(
          'CUSTOMER_NOT_FOUND',
          `Photo with ID ${photoId} not found`
        )
      );
    }

    return successResult(result.photo);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to update photo work log entry',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Add a photo record for an already-stored file.
 * Used when photos are added before the WorkLogEntry is created.
 * The file must already exist at the provided URI.
 *
 * Note: This function performs final count check inside queue to prevent
 * concurrent additions from exceeding the limit.
 */
export async function addPhotoRecord(
  input: AddPhotoRecordInput
): Promise<CustomerDomainResult<CustomerPhoto>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  try {
    // Verify file exists before creating metadata
    const fileSizeResult = await getFileSize(input.uri);
    if (!fileSizeResult.success) {
      return errorResult(
        createCustomerServiceError(
          'FILE_NOT_FOUND',
          '写真ファイルが見つかりません。再度選択してください。'
        )
      );
    }

    const now = Date.now();
    const photo: CustomerPhoto = {
      id: generateUUID(),
      customerId: input.customerId,
      workLogEntryId: input.workLogEntryId,
      type: input.type,
      uri: input.uri,
      originalFilename: input.originalFilename,
      takenAt: input.takenAt,
      createdAt: now,
    };

    // Use queue to prevent RMW race conditions
    // Final count check inside queue (atomic with save)
    const queueResult = await photosQueue.enqueue(async () => {
      // Re-check read-only mode inside queue to handle mode changes during wait
      if (getReadOnlyMode()) {
        return { success: false as const, reason: 'readonly' };
      }

      const photos = await getAllPhotosFromStorage();

      // Final count check inside queue to prevent concurrent additions exceeding limit
      if (photos.length >= MAX_TOTAL_PHOTOS) {
        return { success: false as const, reason: 'count_exceeded' };
      }

      photos.push(photo);
      await saveAllPhotosToStorage(photos);
      return { success: true as const };
    });

    // If readonly was detected inside queue, return error without deleting file.
    if (!queueResult.success && queueResult.reason === 'readonly') {
      return readOnlyError();
    }

    // If final count check failed, return error without deleting file.
    // The caller (modal) retains the file in tempPhotos for retry or cleanup on cancel.
    if (!queueResult.success) {
      return errorResult(
        createCustomerServiceError(
          'PHOTO_COUNT_LIMIT_EXCEEDED',
          `写真の上限（${MAX_TOTAL_PHOTOS}枚）に達しました。不要な写真を削除してから追加してください。`
        )
      );
    }

    return successResult(photo);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to add photo record',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}
