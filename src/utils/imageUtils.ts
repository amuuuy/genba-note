/**
 * Image Utilities for seal image and customer photo handling
 *
 * Provides functions for:
 * - Converting image URI to base64 for PDF embedding
 * - Copying images to permanent storage
 * - Deleting stored images
 * - Managing customer photos (before/after work)
 */

import { File, Paths, Directory } from 'expo-file-system';
import { readAsStringAsync, EncodingType } from 'expo-file-system/legacy';

import type { PhotoType } from '../types/customerPhoto';
import { generateUUID } from './uuid';

/** Subdirectory name for seal images */
const SEAL_IMAGES_SUBDIR = 'seal_images';

/** Subdirectory name for customer photos */
const CUSTOMER_PHOTOS_SUBDIR = 'customer_photos';

/**
 * Convert local image URI to base64 string
 *
 * @param uri - Local file URI
 * @returns Base64 encoded image string, or null if conversion fails
 */
export async function imageUriToBase64(uri: string): Promise<string | null> {
  try {
    // Use traditional FileSystem API for reliable base64 encoding
    const base64 = await readAsStringAsync(uri, {
      encoding: EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    return null;
  }
}

/**
 * Copy image to app's permanent storage
 *
 * @param sourceUri - Source image URI (from image picker)
 * @returns New permanent URI, or null if copy fails
 */
export async function copyImageToPermanentStorage(sourceUri: string): Promise<string | null> {
  try {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const extension = sourceUri.split('.').pop() || 'png';
    const filename = `seal_${timestamp}.${extension}`;

    // Ensure destination directory exists
    const destDir = new Directory(Paths.document, SEAL_IMAGES_SUBDIR);
    destDir.create({ intermediates: true, idempotent: true });

    // Use document directory for permanent storage
    const sourceFile = new File(sourceUri);
    const destFile = new File(destDir, filename);

    sourceFile.copy(destFile);

    return destFile.uri;
  } catch (error) {
    console.error('Failed to copy image to permanent storage:', error);
    return null;
  }
}

/**
 * Delete stored image from app storage
 *
 * @param uri - Image URI to delete
 */
export async function deleteStoredImage(uri: string): Promise<void> {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.error('Failed to delete stored image:', error);
  }
}

/**
 * Get MIME type from image URI
 *
 * @param uri - Image URI
 * @returns MIME type string (e.g., 'image/png', 'image/jpeg')
 */
export function getImageMimeType(uri: string): string {
  const extension = uri.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/png';
  }
}

/**
 * Convert image URI to base64 data URL for HTML embedding
 *
 * @param uri - Local file URI
 * @returns Data URL string (e.g., 'data:image/png;base64,...'), or null if fails
 */
export async function imageUriToDataUrl(uri: string): Promise<string | null> {
  const base64 = await imageUriToBase64(uri);
  if (!base64) {
    return null;
  }
  const mimeType = getImageMimeType(uri);
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Copy customer photo to app's permanent storage
 *
 * Storage structure:
 * documents/customer_photos/{customerId}/{before|after}/{timestamp}_{uuid}.{ext}
 *
 * @param sourceUri - Source image URI (from image picker)
 * @param customerId - Customer ID for organizing photos
 * @param photoType - 'before' or 'after'
 * @returns New permanent URI, or null if copy fails
 */
export async function copyCustomerPhotoToPermanentStorage(
  sourceUri: string,
  customerId: string,
  photoType: PhotoType
): Promise<string | null> {
  try {
    // Generate unique filename with timestamp and UUID
    const timestamp = Date.now();
    const uuid = generateUUID().slice(0, 8); // Short UUID for filename
    const extension = sourceUri.split('.').pop() || 'jpg';
    const filename = `${timestamp}_${uuid}.${extension}`;

    // Ensure destination directory exists: customer_photos/{customerId}/{type}/
    const destDir = new Directory(
      Paths.document,
      CUSTOMER_PHOTOS_SUBDIR,
      customerId,
      photoType
    );
    destDir.create({ intermediates: true, idempotent: true });

    // Copy file to permanent storage
    const sourceFile = new File(sourceUri);
    const destFile = new File(destDir, filename);

    sourceFile.copy(destFile);

    return destFile.uri;
  } catch (error) {
    console.error('Failed to copy customer photo to permanent storage:', error);
    return null;
  }
}

/**
 * Delete all photos for a customer
 *
 * @param customerId - Customer ID to delete photos for
 */
export async function deleteCustomerPhotosDirectory(
  customerId: string
): Promise<void> {
  try {
    const customerDir = new Directory(
      Paths.document,
      CUSTOMER_PHOTOS_SUBDIR,
      customerId
    );
    if (customerDir.exists) {
      customerDir.delete();
    }
  } catch (error) {
    console.error('Failed to delete customer photos directory:', error);
  }
}

/**
 * Result of file size check
 */
export interface FileSizeResult {
  success: boolean;
  size?: number;
  error?: string;
}

/**
 * Get file size in bytes (fail-closed)
 *
 * @param uri - File URI
 * @returns FileSizeResult with size on success, error on failure
 */
export async function getFileSize(uri: string): Promise<FileSizeResult> {
  try {
    const file = new File(uri);
    if (!file.exists) {
      return { success: false, error: 'File does not exist' };
    }
    const size = file.size;
    if (size === null || size === undefined) {
      return { success: false, error: 'Unable to determine file size' };
    }
    return { success: true, size };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error reading file size',
    };
  }
}
