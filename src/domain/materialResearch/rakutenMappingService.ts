/**
 * Rakuten API Mapping Service
 *
 * Pure functions for mapping Rakuten API responses
 * to display models and UnitPriceInput.
 */

import type {
  RakutenItem,
  RakutenSearchResponse,
  MaterialSearchResult,
} from '@/types/materialResearch';
import type { UnitPriceInput } from '@/domain/unitPrice';

/**
 * Map a single RakutenItem to MaterialSearchResult
 */
export function mapRakutenItemToSearchResult(
  item: RakutenItem
): MaterialSearchResult {
  return {
    id: item.itemCode,
    name: item.itemName,
    price: item.itemPrice,
    taxIncluded: item.taxFlag === 0,
    shopName: item.shopName,
    imageUrl:
      item.mediumImageUrls.length > 0 ? item.mediumImageUrls[0] : null,
    productUrl: item.itemUrl,
    reviewAverage: item.reviewAverage,
    reviewCount: item.reviewCount,
  };
}

/**
 * Map a full Rakuten search response to MaterialSearchResult array
 */
export function mapRakutenResponse(
  response: RakutenSearchResponse
): MaterialSearchResult[] {
  return response.Items.map(mapRakutenItemToSearchResult);
}

/**
 * Convert a MaterialSearchResult to UnitPriceInput
 * for one-tap registration to unit price master.
 *
 * Tax handling:
 * - taxIncluded=true (税込): normalize to tax-excluded price (price * 100 / 110)
 * - taxIncluded=false (税抜): use price as-is
 * Both cases set defaultTaxRate=10 so the estimate/invoice calculation adds tax correctly.
 *
 * Defaults: unit='式', taxRate=10, category='材料'
 */
export function searchResultToUnitPriceInput(
  result: MaterialSearchResult
): UnitPriceInput {
  const taxExcludedPrice = result.taxIncluded
    ? Math.floor((result.price * 100) / 110)
    : Math.floor(result.price);

  return {
    name: result.name,
    unit: '式',
    defaultPrice: taxExcludedPrice,
    defaultTaxRate: 10,
    category: '材料',
    notes: `楽天市場: ${result.shopName} (参考価格)`,
  };
}
