/**
 * Customer Types for ポチッと事務
 *
 * Key design decisions:
 * - Customer is a master data entity (separate from Document)
 * - Contact info (phone, email) stored in AsyncStorage (non-sensitive business data)
 * - All timestamps are epoch ms (consistent with Document)
 * - null represents unset optional values (never use empty string)
 */

/**
 * Customer contact information
 */
export interface CustomerContact {
  /** Phone number (optional) */
  phone: string | null;

  /** Email address (optional) */
  email: string | null;
}

/**
 * Customer master data
 */
export interface Customer {
  /** Unique identifier (UUID) */
  id: string;

  /** Customer name (required) */
  name: string;

  /** Customer address (optional) */
  address: string | null;

  /** Contact information */
  contact: CustomerContact;

  /** Created timestamp (epoch ms) */
  createdAt: number;

  /** Last updated timestamp (epoch ms) */
  updatedAt: number;
}

/**
 * Customer filter options for list view
 */
export interface CustomerFilter {
  /** Search text (matches name, address) */
  searchText?: string;
}

/**
 * Customer sort options
 */
export interface CustomerSort {
  field: 'name' | 'createdAt' | 'updatedAt';
  direction: 'asc' | 'desc';
}

/**
 * Input for creating a new customer
 */
export interface CreateCustomerInput {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

/**
 * Input for updating an existing customer
 */
export interface UpdateCustomerInput {
  name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}
