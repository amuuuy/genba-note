/**
 * Tests for rakutenMappingService
 *
 * Pure function tests for mapping Rakuten API responses
 * to display models and UnitPriceInput.
 */

import {
  mapRakutenItemToSearchResult,
  mapRakutenResponse,
  searchResultToUnitPriceInput,
} from '@/domain/materialResearch/rakutenMappingService';
import {
  createTestRakutenItem,
  createTestRakutenResponse,
  createTestSearchResult,
} from './helpers';

describe('mapRakutenItemToSearchResult', () => {
  it('maps basic fields correctly', () => {
    const item = createTestRakutenItem();
    const result = mapRakutenItemToSearchResult(item);

    expect(result.id).toBe(item.itemCode);
    expect(result.name).toBe(item.itemName);
    expect(result.price).toBe(item.itemPrice);
    expect(result.shopName).toBe(item.shopName);
    expect(result.productUrl).toBe(item.itemUrl);
    expect(result.reviewAverage).toBe(item.reviewAverage);
    expect(result.reviewCount).toBe(item.reviewCount);
  });

  it('maps taxFlag=0 to taxIncluded=true', () => {
    const item = createTestRakutenItem({ taxFlag: 0 });
    const result = mapRakutenItemToSearchResult(item);
    expect(result.taxIncluded).toBe(true);
  });

  it('maps taxFlag=1 to taxIncluded=false', () => {
    const item = createTestRakutenItem({ taxFlag: 1 });
    const result = mapRakutenItemToSearchResult(item);
    expect(result.taxIncluded).toBe(false);
  });

  it('extracts first image URL from mediumImageUrls', () => {
    const item = createTestRakutenItem({
      mediumImageUrls: [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ],
    });
    const result = mapRakutenItemToSearchResult(item);
    expect(result.imageUrl).toBe('https://example.com/image1.jpg');
  });

  it('returns null for imageUrl when mediumImageUrls is empty', () => {
    const item = createTestRakutenItem({ mediumImageUrls: [] });
    const result = mapRakutenItemToSearchResult(item);
    expect(result.imageUrl).toBeNull();
  });
});

describe('mapRakutenResponse', () => {
  it('maps all items in the response', () => {
    const response = createTestRakutenResponse();
    const results = mapRakutenResponse(response);

    expect(results).toHaveLength(response.Items.length);
    expect(results[0].name).toBe(response.Items[0].itemName);
    expect(results[1].name).toBe(response.Items[1].itemName);
  });

  it('returns empty array for empty Items', () => {
    const response = createTestRakutenResponse([]);
    const results = mapRakutenResponse(response);
    expect(results).toEqual([]);
  });

  it('preserves item order', () => {
    const items = [
      createTestRakutenItem({ itemCode: 'a', itemName: 'Alpha' }),
      createTestRakutenItem({ itemCode: 'b', itemName: 'Beta' }),
      createTestRakutenItem({ itemCode: 'c', itemName: 'Charlie' }),
    ];
    const response = createTestRakutenResponse(items);
    const results = mapRakutenResponse(response);

    expect(results.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('searchResultToUnitPriceInput', () => {
  it('sets name from search result', () => {
    const result = createTestSearchResult({ name: '水性塗料 1L' });
    const input = searchResultToUnitPriceInput(result);
    expect(input.name).toBe('水性塗料 1L');
  });

  it('normalizes tax-included price to tax-excluded (taxIncluded=true)', () => {
    // 1100 yen tax-included → 1000 yen tax-excluded (1100 * 100 / 110 = 1000)
    const result = createTestSearchResult({ price: 1100, taxIncluded: true });
    const input = searchResultToUnitPriceInput(result);
    expect(input.defaultPrice).toBe(1000);
  });

  it('uses price as-is for tax-excluded (taxIncluded=false)', () => {
    const result = createTestSearchResult({ price: 1580, taxIncluded: false });
    const input = searchResultToUnitPriceInput(result);
    expect(input.defaultPrice).toBe(1580);
  });

  it('floors non-integer normalized prices', () => {
    // 1500 yen tax-included → 1363.63... → floor to 1363
    const result = createTestSearchResult({ price: 1500, taxIncluded: true });
    const input = searchResultToUnitPriceInput(result);
    expect(input.defaultPrice).toBe(1363);
  });

  it('floors non-integer tax-excluded prices', () => {
    const result = createTestSearchResult({ price: 1580.9, taxIncluded: false });
    const input = searchResultToUnitPriceInput(result);
    expect(input.defaultPrice).toBe(1580);
  });

  it('sets unit to 式', () => {
    const result = createTestSearchResult();
    const input = searchResultToUnitPriceInput(result);
    expect(input.unit).toBe('式');
  });

  it('sets defaultTaxRate to 10', () => {
    const result = createTestSearchResult();
    const input = searchResultToUnitPriceInput(result);
    expect(input.defaultTaxRate).toBe(10);
  });

  it('sets category to 材料', () => {
    const result = createTestSearchResult();
    const input = searchResultToUnitPriceInput(result);
    expect(input.category).toBe('材料');
  });

  it('sets notes with shop name and 参考価格 label', () => {
    const result = createTestSearchResult({ shopName: '建材マーケット' });
    const input = searchResultToUnitPriceInput(result);
    expect(input.notes).toBe('楽天市場: 建材マーケット (参考価格)');
  });
});
