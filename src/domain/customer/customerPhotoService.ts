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
import { STORAGE_KEYS } from '@/utils/constants';
import {
  copyCustomerPhotoToPermanentStorage,
  deleteStoredImage,
  deleteCustomerPhotosDirectory,
  imageUriToDataUrl,
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

// === Public API ===

/**
 * Add a new photo to a customer
 */
export async function addPhoto(
  input: AddPhotoInput
): Promise<CustomerDomainResult<CustomerPhoto>> {
  try {
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
    await photosQueue.enqueue(async () => {
      const photos = await getAllPhotosFromStorage();
      photos.push(photo);
      await saveAllPhotosToStorage(photos);
    });

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
