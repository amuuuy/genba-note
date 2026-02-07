/**
 * Test helpers for materialResearch domain tests
 *
 * Provides factory functions for creating test data.
 */

import type {
  RakutenItem,
  RakutenSearchResponse,
  MaterialSearchResult,
} from '@/types/materialResearch';

/**
 * Create a test RakutenItem with sensible defaults
 */
export function createTestRakutenItem(
  overrides?: Partial<RakutenItem>
): RakutenItem {
  return {
    itemName: 'テスト塗料 水性ペイント 1L ホワイト',
    itemPrice: 1500,
    itemCode: 'test-shop:item-001',
    itemUrl: 'https://item.rakuten.co.jp/test-shop/item-001/',
    mediumImageUrls: [
      'https://thumbnail.image.rakuten.co.jp/@0_mall/test-shop/cabinet/item-001.jpg',
    ],
    shopName: 'テスト建材ショップ',
    shopCode: 'test-shop',
    itemCaption: 'テスト商品の説明文です。水性ペイント1Lホワイト。',
    reviewCount: 42,
    reviewAverage: 4.2,
    availability: 1,
    taxFlag: 0,
    postageFlag: 1,
    ...overrides,
  };
}

/**
 * Create a test RakutenSearchResponse
 */
export function createTestRakutenResponse(
  items?: RakutenItem[],
  overrides?: Partial<Omit<RakutenSearchResponse, 'Items'>>
): RakutenSearchResponse {
  const defaultItems = items ?? [
    createTestRakutenItem(),
    createTestRakutenItem({
      itemName: 'セメント 25kg 普通ポルトランド',
      itemPrice: 600,
      itemCode: 'test-shop:item-002',
      shopName: '建材マーケット',
      reviewCount: 128,
      reviewAverage: 4.5,
    }),
  ];

  return {
    count: overrides?.count ?? defaultItems.length,
    page: overrides?.page ?? 1,
    hits: overrides?.hits ?? 20,
    pageCount: overrides?.pageCount ?? 1,
    Items: defaultItems,
  };
}

/**
 * Create a test MaterialSearchResult
 */
export function createTestSearchResult(
  overrides?: Partial<MaterialSearchResult>
): MaterialSearchResult {
  return {
    id: 'test-shop:item-001',
    name: 'テスト塗料 水性ペイント 1L ホワイト',
    price: 1500,
    taxIncluded: true,
    shopName: 'テスト建材ショップ',
    imageUrl:
      'https://thumbnail.image.rakuten.co.jp/@0_mall/test-shop/cabinet/item-001.jpg',
    productUrl: 'https://item.rakuten.co.jp/test-shop/item-001/',
    reviewAverage: 4.2,
    reviewCount: 42,
    ...overrides,
  };
}
