/**
 * Line Item Mapping Service
 *
 * Pure functions for converting research results to LineItemInput
 * for direct use in document line items.
 */

import type { UnitPriceInput } from '@/domain/unitPrice';
import type { LineItemInput } from '@/domain/lineItem/lineItemService';
import type { MaterialSearchResult, AiPriceItem } from '@/types/materialResearch';
import { searchResultToUnitPriceInput } from './rakutenMappingService';
import { aiPriceItemToUnitPriceInput } from './geminiMappingService';

/**
 * Convert a UnitPriceInput to LineItemInput.
 * Default quantity is 1 (quantityMilli = 1000).
 */
export function unitPriceInputToLineItemInput(
  input: UnitPriceInput,
  quantityMilli: number = 1000
): LineItemInput {
  return {
    name: input.name,
    quantityMilli,
    unit: input.unit,
    unitPrice: input.defaultPrice,
    taxRate: input.defaultTaxRate,
  };
}

/**
 * Convert a Rakuten search result directly to LineItemInput.
 */
export function searchResultToLineItemInput(
  result: MaterialSearchResult
): LineItemInput {
  return unitPriceInputToLineItemInput(searchResultToUnitPriceInput(result));
}

/**
 * Convert an AI price item directly to LineItemInput.
 */
export function aiPriceItemToLineItemInput(
  item: AiPriceItem
): LineItemInput {
  return unitPriceInputToLineItemInput(aiPriceItemToUnitPriceInput(item));
}
