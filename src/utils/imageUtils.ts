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

import type { PhotoType } from '../types/customerPhoto';
import { generateUUID } from './uuid';

/**
 * Validate a string for use as a single path segment.
 * Rejects path traversal sequences and directory separators.
 */
function validatePathSegment(segment: string): boolean {
  if (!segment) return false;
  if (segment.includes('..') || segment.includes('/') || segment.includes('\\')) return false;
  try {
    const decoded = decodeURIComponent(segment);
    if (decoded.includes('..') || decoded.includes('/') || decoded.includes('\\')) return false;
  } catch {
    return false;
  }
  return true;
}

/** Maximum seal image file size (10MB) */
export const MAX_SEAL_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
/** Maximum background image file size (10MB) */
export const MAX_BACKGROUND_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
/** Maximum photo file size (50MB) */
export const MAX_PHOTO_SIZE_BYTES = 50 * 1024 * 1024;

/** Subdirectory name for seal images */
const SEAL_IMAGES_SUBDIR = 'seal_images';

/** Subdirectory name for customer photos */
const CUSTOMER_PHOTOS_SUBDIR = 'customer_photos';

/** Subdirectory name for background images */
const BACKGROUND_IMAGES_SUBDIR = 'background_images';

/** Subdirectory name for finance photos */
const FINANCE_PHOTOS_SUBDIR = 'finance_photos';

/**
 * Convert local image URI to base64 string
 *
 * @param uri - Local file URI
 * @returns Base64 encoded image string, or null if conversion fails
 */
export async function imageUriToBase64(uri: string): Promise<string | null> {
  try {
    const file = new File(uri);
    if (!file.exists) {
      if (__DEV__) console.warn(`imageUriToBase64: File does not exist at ${uri}`);
      return null;
    }
    return await file.base64();
  } catch (error) {
    if (__DEV__) console.error('Failed to convert image to base64:', error);
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
    const sourceFile = new File(sourceUri);
    if (sourceFile.size > MAX_SEAL_IMAGE_SIZE_BYTES) {
      if (__DEV__) console.warn(`Seal image exceeds size limit: ${sourceFile.size} bytes`);
      return null;
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const extension = sourceUri.split('.').pop() || 'png';
    const filename = `seal_${timestamp}.${extension}`;

    // Ensure destination directory exists
    const destDir = new Directory(Paths.document, SEAL_IMAGES_SUBDIR);
    destDir.create({ intermediates: true, idempotent: true });

    // Use document directory for permanent storage
    const destFile = new File(destDir, filename);

    sourceFile.copy(destFile);

    return destFile.uri;
  } catch (error) {
    if (__DEV__) console.error('Failed to copy image to permanent storage:', error);
    return null;
  }
}

/**
 * Copy background image to app's permanent storage
 *
 * @param sourceUri - Source image URI (from image picker)
 * @returns New permanent URI, or null if copy fails
 */
export async function copyBackgroundImageToPermanentStorage(sourceUri: string): Promise<string | null> {
  try {
    const sourceFile = new File(sourceUri);
    if (sourceFile.size > MAX_BACKGROUND_IMAGE_SIZE_BYTES) {
      if (__DEV__) console.warn(`Background image exceeds size limit: ${sourceFile.size} bytes`);
      return null;
    }

    const timestamp = Date.now();
    const extension = sourceUri.split('.').pop() || 'png';
    const filename = `bg_${timestamp}.${extension}`;

    const destDir = new Directory(Paths.document, BACKGROUND_IMAGES_SUBDIR);
    destDir.create({ intermediates: true, idempotent: true });

    const destFile = new File(destDir, filename);

    sourceFile.copy(destFile);

    return destFile.uri;
  } catch (error) {
    if (__DEV__) console.error('Failed to copy background image to permanent storage:', error);
    return null;
  }
}

/** Allowed subdirectories for image deletion (fail-closed) */
const ALLOWED_IMAGE_SUBDIRS = [
  SEAL_IMAGES_SUBDIR,
  CUSTOMER_PHOTOS_SUBDIR,
  BACKGROUND_IMAGES_SUBDIR,
  FINANCE_PHOTOS_SUBDIR,
] as const;

/**
 * Check if a URI is within the app's allowed image directories.
 * Prevents deletion of files outside the managed directories.
 * Fail-closed: rejects path traversal, URL-encoded traversal, and decode failures.
 */
function isAllowedImageUri(uri: string): boolean {
  if (typeof uri !== 'string' || !uri) return false;

  // Reject path traversal sequences (raw)
  if (uri.includes('..') || uri.includes('\\')) return false;

  // Reject path traversal sequences (URL-encoded)
  try {
    const decoded = decodeURIComponent(uri);
    if (decoded.includes('..') || decoded.includes('\\')) return false;
  } catch {
    return false; // fail-closed on decode error
  }

  const docUri = Paths.document.uri;
  const docPrefix = docUri.endsWith('/') ? docUri : docUri + '/';
  if (!uri.startsWith(docPrefix)) return false;
  const relative = uri.slice(docPrefix.length);
  return ALLOWED_IMAGE_SUBDIRS.some((subdir) => relative.startsWith(subdir + '/'));
}

/**
 * Delete stored image from app storage.
 * Fail-closed: only deletes files within allowed image subdirectories.
 *
 * @param uri - Image URI to delete
 */
export async function deleteStoredImage(uri: string): Promise<void> {
  if (!isAllowedImageUri(uri)) {
    if (__DEV__) console.warn('deleteStoredImage: URI outside allowed directories, skipping:', uri);
    return;
  }

  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    if (__DEV__) console.error('Failed to delete stored image:', error);
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
 * Resolve background image data URL from settings.
 * Validates the URI and converts to base64 data URL.
 *
 * @param backgroundDesign - Current background design selection
 * @param backgroundImageUri - Stored image URI (or null)
 * @returns Data URL string, or null if not applicable/invalid
 */
export async function resolveBackgroundImageDataUrl(
  backgroundDesign: string | undefined,
  backgroundImageUri: string | null | undefined
): Promise<string | null> {
  if (backgroundDesign !== 'IMAGE' || !backgroundImageUri) return null;
  if (!isValidBackgroundImageUri(backgroundImageUri)) return null;
  return imageUriToDataUrl(backgroundImageUri);
}

/** Allowed image extensions for background images */
const ALLOWED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

/**
 * Validate that a background image URI is within the expected directory
 * and has an allowed image extension.
 *
 * @param uri - URI to validate
 * @returns true if URI is safe to read
 */
export function isValidBackgroundImageUri(uri: unknown): boolean {
  if (typeof uri !== 'string' || !uri) return false;

  // Must not contain path traversal (check both raw and URL-decoded)
  if (uri.includes('..')) return false;
  try {
    if (decodeURIComponent(uri).includes('..')) return false;
  } catch {
    return false;
  }

  // Must be within the documents/background_images/ directory (with trailing slash boundary)
  const expectedDir = new Directory(Paths.document, BACKGROUND_IMAGES_SUBDIR).uri;
  const expectedDirWithSlash = expectedDir.endsWith('/') ? expectedDir : expectedDir + '/';
  if (!uri.startsWith(expectedDirWithSlash)) return false;

  // Must have an allowed image extension
  const extension = uri.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_IMAGE_EXTENSIONS.includes(extension)) return false;

  return true;
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
  if (!validatePathSegment(customerId)) {
    if (__DEV__) console.warn('Invalid customerId rejected:', customerId);
    return null;
  }
  try {
    const sourceFile = new File(sourceUri);
    if (sourceFile.size > MAX_PHOTO_SIZE_BYTES) {
      if (__DEV__) console.warn(`Customer photo exceeds size limit: ${sourceFile.size} bytes`);
      return null;
    }

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
    const destFile = new File(destDir, filename);

    sourceFile.copy(destFile);

    return destFile.uri;
  } catch (error) {
    if (__DEV__) console.error('Failed to copy customer photo to permanent storage:', error);
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
  if (!validatePathSegment(customerId)) {
    throw new Error(`Invalid customerId: ${customerId}`);
  }
  const customerDir = new Directory(
    Paths.document,
    CUSTOMER_PHOTOS_SUBDIR,
    customerId
  );
  if (customerDir.exists) {
    customerDir.delete();
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

/** Temp subdirectory name for finance photos */
const FINANCE_PHOTOS_TMP_SUBDIR = '_tmp';

/**
 * Copy finance photo to app's temporary storage
 *
 * Storage structure:
 * documents/finance_photos/_tmp/{timestamp}_{uuid}.{ext}
 *
 * Photos should be moved to entry directory upon save using moveFinancePhotoToEntryDirectory.
 *
 * @param sourceUri - Source image URI (from image picker)
 * @returns New temporary URI, or null if copy fails
 */
export async function copyFinancePhotoToTempStorage(
  sourceUri: string
): Promise<string | null> {
  try {
    const sourceFile = new File(sourceUri);
    if (sourceFile.size > MAX_PHOTO_SIZE_BYTES) {
      if (__DEV__) console.warn(`Finance temp photo exceeds size limit: ${sourceFile.size} bytes`);
      return null;
    }

    // Generate unique filename with timestamp and UUID
    const timestamp = Date.now();
    const uuid = generateUUID().slice(0, 8); // Short UUID for filename
    const extension = sourceUri.split('.').pop() || 'jpg';
    const filename = `${timestamp}_${uuid}.${extension}`;

    // Ensure destination directory exists: finance_photos/_tmp/
    const destDir = new Directory(
      Paths.document,
      FINANCE_PHOTOS_SUBDIR,
      FINANCE_PHOTOS_TMP_SUBDIR
    );
    destDir.create({ intermediates: true, idempotent: true });

    // Copy file to temporary storage
    const destFile = new File(destDir, filename);

    sourceFile.copy(destFile);

    return destFile.uri;
  } catch (error) {
    if (__DEV__) console.error('Failed to copy finance photo to temp storage:', error);
    return null;
  }
}

/**
 * Move finance photo from temp to entry directory
 *
 * @param tempUri - Current URI in temp directory
 * @param financeEntryId - Finance entry ID for permanent storage
 * @returns New permanent URI, or null if move fails
 */
export async function moveFinancePhotoToEntryDirectory(
  tempUri: string,
  financeEntryId: string
): Promise<string | null> {
  if (!validatePathSegment(financeEntryId)) {
    if (__DEV__) console.warn('Invalid financeEntryId rejected:', financeEntryId);
    return null;
  }
  try {
    // Extract filename from temp URI
    const filename = tempUri.split('/').pop();
    if (!filename) {
      return null;
    }

    // Ensure destination directory exists: finance_photos/{financeEntryId}/
    const destDir = new Directory(
      Paths.document,
      FINANCE_PHOTOS_SUBDIR,
      financeEntryId
    );
    destDir.create({ intermediates: true, idempotent: true });

    // Move file to permanent storage
    const sourceFile = new File(tempUri);
    const destFile = new File(destDir, filename);

    sourceFile.move(destFile);

    return destFile.uri;
  } catch (error) {
    if (__DEV__) console.error('Failed to move finance photo to entry directory:', error);
    return null;
  }
}

/**
 * Copy finance photo to app's permanent storage (direct, without temp)
 *
 * Storage structure:
 * documents/finance_photos/{financeEntryId}/{timestamp}_{uuid}.{ext}
 *
 * @param sourceUri - Source image URI (from image picker)
 * @param financeEntryId - Finance entry ID for organizing photos
 * @returns New permanent URI, or null if copy fails
 */
export async function copyFinancePhotoToPermanentStorage(
  sourceUri: string,
  financeEntryId: string
): Promise<string | null> {
  if (!validatePathSegment(financeEntryId)) {
    if (__DEV__) console.warn('Invalid financeEntryId rejected:', financeEntryId);
    return null;
  }
  try {
    const sourceFile = new File(sourceUri);
    if (sourceFile.size > MAX_PHOTO_SIZE_BYTES) {
      if (__DEV__) console.warn(`Finance photo exceeds size limit: ${sourceFile.size} bytes`);
      return null;
    }

    // Generate unique filename with timestamp and UUID
    const timestamp = Date.now();
    const uuid = generateUUID().slice(0, 8); // Short UUID for filename
    const extension = sourceUri.split('.').pop() || 'jpg';
    const filename = `${timestamp}_${uuid}.${extension}`;

    // Ensure destination directory exists: finance_photos/{financeEntryId}/
    const destDir = new Directory(
      Paths.document,
      FINANCE_PHOTOS_SUBDIR,
      financeEntryId
    );
    destDir.create({ intermediates: true, idempotent: true });

    // Copy file to permanent storage
    const destFile = new File(destDir, filename);

    sourceFile.copy(destFile);

    return destFile.uri;
  } catch (error) {
    if (__DEV__) console.error('Failed to copy finance photo to permanent storage:', error);
    return null;
  }
}

/**
 * Delete all photos for a finance entry
 *
 * @param financeEntryId - Finance entry ID to delete photos for
 */
export async function deleteFinancePhotosDirectory(
  financeEntryId: string
): Promise<void> {
  if (!validatePathSegment(financeEntryId)) {
    if (__DEV__) console.warn('Invalid financeEntryId rejected:', financeEntryId);
    return;
  }
  try {
    const entryDir = new Directory(
      Paths.document,
      FINANCE_PHOTOS_SUBDIR,
      financeEntryId
    );
    if (entryDir.exists) {
      entryDir.delete();
    }
  } catch (error) {
    if (__DEV__) console.error('Failed to delete finance photos directory:', error);
  }
}
