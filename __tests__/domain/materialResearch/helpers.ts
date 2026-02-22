/**
 * Test helpers for materialResearch domain tests
 *
 * Provides factory functions for creating test data.
 */

import type {
  RakutenItem,
  RakutenSearchResponse,
  MaterialSearchResult,
  AiPriceItem,
  AiSearchResponse,
} from '@/types/materialResearch';
import type { GeminiEdgeFunctionResponse } from '@/domain/materialResearch/geminiMappingService';

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

// === AI Search Test Helpers ===

/**
 * Create a test AiPriceItem
 */
export function createTestAiPriceItem(
  overrides?: Partial<AiPriceItem>
): AiPriceItem {
  return {
    name: 'コンパネ 12mm 3x6',
    price: 1980,
    taxIncluded: true,
    sourceName: 'モノタロウ',
    sourceUrl: 'https://www.monotaro.com/p/1234/',
    ...overrides,
  };
}

/**
 * Create a test AiSearchResponse
 */
export function createTestAiSearchResponse(
  overrides?: Partial<AiSearchResponse>
): AiSearchResponse {
  return {
    summary: 'コンパネ 12mm 3x6の相場は1,500〜2,500円程度です。モノタロウが最安値です。',
    items: [
      createTestAiPriceItem(),
      createTestAiPriceItem({
        name: 'コンパネ 12mm 3x6 JAS認定',
        price: 2200,
        sourceName: 'Amazon',
        sourceUrl: 'https://www.amazon.co.jp/dp/B000TEST/',
      }),
      createTestAiPriceItem({
        name: 'コンパネ 12mm 3x6 耐水',
        price: 2500,
        sourceName: 'コメリ',
        sourceUrl: null,
      }),
    ],
    recommendedPriceRange: { min: 1500, max: 2500 },
    sources: [
      { uri: 'https://www.monotaro.com/p/1234/', title: 'コンパネ - モノタロウ' },
      { uri: 'https://www.amazon.co.jp/dp/B000TEST/', title: 'コンパネ - Amazon' },
    ],
    ...overrides,
  };
}

/**
 * Create a test GeminiEdgeFunctionResponse
 */
export function createTestGeminiEdgeFunctionResponse(
  overrides?: Partial<GeminiEdgeFunctionResponse>
): GeminiEdgeFunctionResponse {
  return {
    text: `コンパネの価格を調査しました。

\`\`\`json
{
  "items": [
    {
      "name": "コンパネ 12mm 3x6",
      "price": 1980,
      "taxIncluded": true,
      "sourceName": "モノタロウ",
      "sourceUrl": "https://www.monotaro.com/p/1234/"
    },
    {
      "name": "コンパネ 12mm 3x6 JAS認定",
      "price": 2200,
      "taxIncluded": true,
      "sourceName": "Amazon",
      "sourceUrl": "https://www.amazon.co.jp/dp/B000TEST/"
    }
  ],
  "recommendedPriceRange": {
    "min": 1500,
    "max": 2500
  },
  "summary": "コンパネ 12mm 3x6の相場は1,500〜2,500円程度です。"
}
\`\`\``,
    sources: [
      { uri: 'https://www.monotaro.com/p/1234/', title: 'コンパネ - モノタロウ' },
    ],
    webSearchQueries: ['コンパネ 12mm 3x6 価格'],
    ...overrides,
  };
}
