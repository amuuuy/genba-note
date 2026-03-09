/**
 * Finance Photo Types for ポチッと事務
 *
 * Key design decisions:
 * - Photos are linked to FinanceEntry (income/expense)
 * - URI points to local file in app's document directory
 * - Maximum 5 photos per finance entry
 */

/**
 * Finance photo metadata
 * Actual image file is stored separately in file system
 */
export interface FinancePhoto {
  /** Unique identifier (UUID) */
  id: string;

  /** Finance entry ID (foreign key) */
  financeEntryId: string;

  /** Local file URI (in app's document directory) */
  uri: string;

  /** Original filename from image picker (for display purposes) */
  originalFilename: string | null;

  /** Photo added timestamp (epoch ms) */
  addedAt: number;

  /** Created timestamp (epoch ms) */
  createdAt: number;
}

/**
 * Input for adding a new finance photo
 */
export interface AddFinancePhotoInput {
  /** Finance entry ID to link the photo to */
  financeEntryId: string;

  /** Source URI from image picker */
  sourceUri: string;

  /** Original filename (optional) */
  originalFilename?: string | null;
}

/**
 * Temporary photo info for use before FinanceEntry is saved.
 * Used in FinanceEntryModal when adding photos before the entry exists.
 */
export interface TempFinancePhotoInfo {
  /** Temporary ID (generated locally, not persisted) */
  tempId: string;

  /** Permanent URI after copying to storage */
  permanentUri: string;

  /** Original filename from image picker */
  originalFilename: string | null;
}

/**
 * Input for adding a photo record (file already stored)
 * Used when photos are added before the FinanceEntry is saved
 */
export interface AddFinancePhotoRecordInput {
  /** Finance entry ID */
  financeEntryId: string;

  /** Permanent URI (file already stored) */
  uri: string;

  /** Original filename */
  originalFilename: string | null;

  /** Photo added timestamp (epoch ms) */
  addedAt: number;
}
