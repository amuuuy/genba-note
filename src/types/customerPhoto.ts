/**
 * Customer Photo Types for ポチッと事務
 *
 * Key design decisions:
 * - Photos are linked to Customer (not Document)
 * - Two types: 'before' (作業前) and 'after' (作業後)
 * - URI points to local file in app's document directory
 * - No limit on number of photos per customer
 */

/**
 * Photo type: before work (作業前) or after work (作業後)
 */
export type PhotoType = 'before' | 'after';

/**
 * Customer photo metadata
 * Actual image file is stored separately in file system
 */
export interface CustomerPhoto {
  /** Unique identifier (UUID) */
  id: string;

  /** Customer ID (foreign key) */
  customerId: string;

  /**
   * Work log entry ID (foreign key).
   * null only for legacy data (pre-v6 migration).
   * New photos MUST have a valid workLogEntryId.
   */
  workLogEntryId: string | null;

  /** Photo type: before or after work */
  type: PhotoType;

  /** Local file URI (in app's document directory) */
  uri: string;

  /** Original filename from image picker (for display purposes) */
  originalFilename: string | null;

  /** Photo taken/added timestamp (epoch ms) */
  takenAt: number;

  /** Created timestamp (epoch ms) */
  createdAt: number;
}

/**
 * Filter options for customer photos
 */
export interface CustomerPhotoFilter {
  /** Filter by customer ID (required) */
  customerId: string;

  /** Filter by photo type (optional) */
  type?: PhotoType;
}

/**
 * Input for adding a new photo
 */
export interface AddPhotoInput {
  /** Customer ID to link the photo to */
  customerId: string;

  /** Work log entry ID (required for all new photos) */
  workLogEntryId: string;

  /** Photo type: before or after */
  type: PhotoType;

  /** Source URI from image picker */
  sourceUri: string;

  /** Original filename (optional) */
  originalFilename?: string | null;
}

/**
 * Temporary photo info for use before WorkLogEntry is created.
 * Used in AddWorkLogEntryModal when adding photos before the entry exists.
 */
export interface TempPhotoInfo {
  /** Temporary ID (generated locally, not persisted) */
  tempId: string;

  /** Photo type: before or after */
  type: PhotoType;

  /** Permanent URI after copying to storage */
  permanentUri: string;

  /** Original filename from image picker */
  originalFilename: string | null;
}

/**
 * Input for adding a photo record (file already stored)
 * Used when photos are added before the WorkLogEntry is created
 */
export interface AddPhotoRecordInput {
  /** Customer ID */
  customerId: string;

  /** Work log entry ID */
  workLogEntryId: string;

  /** Photo type: before or after */
  type: PhotoType;

  /** Permanent URI (file already stored) */
  uri: string;

  /** Original filename */
  originalFilename: string | null;

  /** Photo taken timestamp (epoch ms) */
  takenAt: number;
}
