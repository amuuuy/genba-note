/**
 * Image Utilities for seal image handling
 *
 * Provides functions for:
 * - Converting image URI to base64 for PDF embedding
 * - Copying images to permanent storage
 * - Deleting stored images
 */

import { File, Paths } from 'expo-file-system';

/** Subdirectory name for seal images */
const SEAL_IMAGES_SUBDIR = 'seal_images';

/**
 * Convert local image URI to base64 string
 *
 * @param uri - Local file URI
 * @returns Base64 encoded image string, or null if conversion fails
 */
export async function imageUriToBase64(uri: string): Promise<string | null> {
  try {
    const file = new File(uri);
    const base64 = await file.base64();
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

    // Use document directory for permanent storage
    const sourceFile = new File(sourceUri);
    const destFile = new File(Paths.document, SEAL_IMAGES_SUBDIR, filename);

    await sourceFile.copy(destFile);

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
