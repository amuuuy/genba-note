import { TaxRate } from './document';

/**
 * Unit price master data
 * Used for quick entry of common work items in estimates/invoices
 */
export interface UnitPrice {
  /** Unique identifier (UUID) */
  id: string;

  /** Item name (required) */
  name: string;

  /** Unit of measurement (required): 式, m, m², 人工, etc. */
  unit: string;

  /** Default unit price in yen (required, integer) */
  defaultPrice: number;

  /** Default tax rate: 0 or 10 (required) */
  defaultTaxRate: TaxRate;

  /** Category for grouping (optional): 塗装, 電気, 設備, etc. */
  category: string | null;

  /** Additional notes (optional) */
  notes: string | null;

  /** Pack quantity (optional): number of units per pack for bulk pricing */
  packQty: number | null;

  /** Pack price in yen (optional): price per pack for bulk pricing */
  packPrice: number | null;

  /** Created timestamp (epoch ms) */
  createdAt: number;

  /** Last updated timestamp (epoch ms) */
  updatedAt: number;
}

/**
 * Unit price search/filter options
 */
export interface UnitPriceFilter {
  /** Search text (matches name, category, notes) */
  searchText?: string;

  /** Filter by category */
  category?: string;
}
