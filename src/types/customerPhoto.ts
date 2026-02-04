/**
 * Customer Photo Types for GenBa Note
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

  /** Work log entry ID (foreign key, null for legacy/undated photos) */
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

  /** Work log entry ID (optional, null for undated photos) */
  workLogEntryId?: string | null;

  /** Photo type: before or after */
  type: PhotoType;

  /** Source URI from image picker */
  sourceUri: string;

  /** Original filename (optional) */
  originalFilename?: string | null;
}
