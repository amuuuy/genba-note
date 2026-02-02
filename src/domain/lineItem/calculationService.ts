/**
 * Calculation Service for Line Items
 *
 * Pure functions for integer arithmetic calculations.
 * All calculations follow SPEC 2.4.3:
 * - Line subtotal = Math.floor(quantityMilli * unitPrice / 1000)
 * - Line tax = Math.floor(subtotal * taxRate / 100)
 * - Tax-included total = subtotal + tax
 */

import type {
  LineItem,
  LineItemCalculated,
  TaxRate,
  Document,
  DocumentWithTotals,
} from '@/types/document';
import { MILLI_MULTIPLIER, isCalculationSafe } from '@/utils/constants';

// === Quantity Conversion ===

/**
 * Convert decimal quantity to milli-units
 * @param quantity - Decimal quantity (e.g., 2.5)
 * @returns quantityMilli (e.g., 2500)
 * @example toQuantityMilli(2.5) => 2500
 * @example toQuantityMilli(0.001) => 1
 */
export function toQuantityMilli(quantity: number): number {
  return Math.round(quantity * MILLI_MULTIPLIER);
}

/**
 * Convert milli-units back to decimal quantity
 * @param quantityMilli - Quantity in milli-units (e.g., 2500)
 * @returns Decimal quantity (e.g., 2.5)
 */
export function fromQuantityMilli(quantityMilli: number): number {
  return quantityMilli / MILLI_MULTIPLIER;
}

// === Line Item Calculations ===

/**
 * Calculate line subtotal with floor rounding
 * Formula: Math.floor(quantityMilli * unitPrice / 1000)
 * @param quantityMilli - Quantity in milli-units
 * @param unitPrice - Unit price in yen
 * @returns Line subtotal in yen (integer)
 */
export function calcLineSubtotal(
  quantityMilli: number,
  unitPrice: number
): number {
  return Math.floor((quantityMilli * unitPrice) / MILLI_MULTIPLIER);
}

/**
 * Calculate line tax with floor rounding
 * Formula: Math.floor(subtotal * taxRate / 100)
 * @param subtotal - Line subtotal in yen
 * @param taxRate - Tax rate (0 or 10)
 * @returns Tax amount in yen (integer)
 */
export function calcLineTax(subtotal: number, taxRate: TaxRate): number {
  return Math.floor((subtotal * taxRate) / 100);
}

/**
 * Calculate a single line item with all computed values
 * @param lineItem - Line item to calculate
 * @returns LineItemCalculated with subtotal and tax
 */
export function calculateLineItem(lineItem: LineItem): LineItemCalculated {
  const subtotal = calcLineSubtotal(lineItem.quantityMilli, lineItem.unitPrice);
  const tax = calcLineTax(subtotal, lineItem.taxRate);

  return {
    ...lineItem,
    subtotal,
    tax,
  };
}

// === Document Calculations ===

/**
 * Calculate all line items and return with computed values
 * @param lineItems - Array of line items
 * @returns Array of LineItemCalculated
 */
export function calculateLineItems(lineItems: LineItem[]): LineItemCalculated[] {
  return lineItems.map(calculateLineItem);
}

/**
 * Tax breakdown entry
 */
interface TaxBreakdownEntry {
  rate: TaxRate;
  subtotal: number;
  tax: number;
}

/**
 * Calculate document totals
 * @param lineItems - Array of line items
 * @returns Object with subtotalYen, taxYen, totalYen, and taxBreakdown
 */
export function calculateDocumentTotals(lineItems: LineItem[]): {
  subtotalYen: number;
  taxYen: number;
  totalYen: number;
  taxBreakdown: TaxBreakdownEntry[];
} {
  if (lineItems.length === 0) {
    return {
      subtotalYen: 0,
      taxYen: 0,
      totalYen: 0,
      taxBreakdown: [],
    };
  }

  const calculatedItems = calculateLineItems(lineItems);

  // Aggregate by tax rate
  const breakdownMap = new Map<TaxRate, { subtotal: number; tax: number }>();

  let subtotalYen = 0;
  let taxYen = 0;

  for (const item of calculatedItems) {
    subtotalYen += item.subtotal;
    taxYen += item.tax;

    const existing = breakdownMap.get(item.taxRate);
    if (existing) {
      existing.subtotal += item.subtotal;
      existing.tax += item.tax;
    } else {
      breakdownMap.set(item.taxRate, {
        subtotal: item.subtotal,
        tax: item.tax,
      });
    }
  }

  // Convert map to array and sort by rate (10% first, then 0%)
  const taxBreakdown: TaxBreakdownEntry[] = [];
  for (const [rate, values] of breakdownMap.entries()) {
    taxBreakdown.push({
      rate,
      subtotal: values.subtotal,
      tax: values.tax,
    });
  }
  taxBreakdown.sort((a, b) => b.rate - a.rate);

  return {
    subtotalYen,
    taxYen,
    totalYen: subtotalYen + taxYen,
    taxBreakdown,
  };
}

/**
 * Enrich document with calculated totals
 * @param document - Document to enrich
 * @returns DocumentWithTotals
 */
export function enrichDocumentWithTotals(document: Document): DocumentWithTotals {
  const lineItemsCalculated = calculateLineItems(document.lineItems);
  const totals = calculateDocumentTotals(document.lineItems);

  // Include carried forward amount in the total
  const carriedForward = document.carriedForwardAmount ?? 0;
  const totalWithCarriedForward = totals.totalYen + carriedForward;

  return {
    ...document,
    lineItemsCalculated,
    subtotalYen: totals.subtotalYen,
    taxYen: totals.taxYen,
    totalYen: totalWithCarriedForward,
    taxBreakdown: totals.taxBreakdown,
  };
}

// === Validation ===

/**
 * Validate that a calculation won't overflow
 * @param quantityMilli - Quantity in milli-units
 * @param unitPrice - Unit price in yen
 * @throws Error if quantityMilli * unitPrice > MAX_SAFE_INTEGER
 */
export function validateCalculation(
  quantityMilli: number,
  unitPrice: number
): void {
  if (!isCalculationSafe(quantityMilli, unitPrice)) {
    throw new Error(
      `Calculation overflow: ${quantityMilli} * ${unitPrice} exceeds safe integer limit`
    );
  }
}
