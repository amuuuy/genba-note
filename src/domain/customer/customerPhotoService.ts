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

// === Helper Functions ===

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
  try {
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
    const permanentUri = await copyCustomerPhotoToPermanentStorage(
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
      type: input.type,
      uri: permanentUri,
      originalFilename: input.originalFilename ?? null,
      takenAt: now,
      createdAt: now,
    };

    // Use queue to prevent RMW race conditions
    // Final count check inside queue to prevent concurrent additions exceeding limit
    const queueResult = await photosQueue.enqueue(async () => {
      const photos = await getAllPhotosFromStorage();

      // Final count check inside queue (atomic with save)
      if (photos.length >= MAX_TOTAL_PHOTOS) {
        return { success: false as const, reason: 'count_exceeded' };
      }

      photos.push(photo);
      await saveAllPhotosToStorage(photos);
      return { success: true as const };
    });

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
  try {
    // Use queue to prevent RMW race conditions
    const result = await photosQueue.enqueue(async () => {
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
 * Delete all photos for a customer
 */
export async function deletePhotosByCustomer(
  customerId: string
): Promise<CustomerDomainResult<void>> {
  try {
    // Use queue to prevent RMW race conditions
    await photosQueue.enqueue(async () => {
      const photos = await getAllPhotosFromStorage();

      // Filter out photos for this customer
      const remaining = photos.filter((p) => p.customerId !== customerId);

      // Update storage
      await saveAllPhotosToStorage(remaining);
    });

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
