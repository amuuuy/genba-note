/**
 * Work Log Entry Types for ポチッと事務
 *
 * Key design decisions:
 * - WorkLogEntry is linked to Customer (1:N relationship)
 * - Unique constraint on (customerId, workDate) - one entry per date per customer
 * - workDate uses ISO format 'YYYY-MM-DD' for consistency
 * - Photos are linked to WorkLogEntry via workLogEntryId in CustomerPhoto
 * - null represents unset optional values (never use empty string)
 */

/**
 * Work log entry for a specific work date
 * Groups before/after photos by date
 */
export interface WorkLogEntry {
  /** Unique identifier (UUID) */
  id: string;

  /** Customer ID (foreign key) */
  customerId: string;

  /** Work date in ISO format 'YYYY-MM-DD' */
  workDate: string;

  /** Optional note for this work day */
  note: string | null;

  /** Created timestamp (epoch ms) */
  createdAt: number;

  /** Last updated timestamp (epoch ms) */
  updatedAt: number;
}

/**
 * Filter options for work log entries
 */
export interface WorkLogEntryFilter {
  /** Filter by customer ID (required) */
  customerId: string;

  /** Filter by date range (optional) */
  fromDate?: string;
  toDate?: string;
}

/**
 * Input for creating a new work log entry
 */
export interface CreateWorkLogEntryInput {
  /** Customer ID to link the entry to */
  customerId: string;

  /** Work date in ISO format 'YYYY-MM-DD' */
  workDate: string;

  /** Optional note for this work day */
  note?: string | null;
}

/**
 * Input for updating an existing work log entry
 */
export interface UpdateWorkLogEntryInput {
  /** Updated note (optional) */
  note?: string | null;
}
