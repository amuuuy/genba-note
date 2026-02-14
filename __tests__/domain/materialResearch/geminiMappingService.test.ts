/**
 * Tests for geminiMappingService
 *
 * Tests JSON parsing, response mapping, and type conversion functions.
 */

import {
  parseGeminiJsonBlock,
  mapGeminiResponse,
  aiPriceItemToSearchResult,
  aiPriceItemToUnitPriceInput,
} from '@/domain/materialResearch/geminiMappingService';
import {
  createTestAiPriceItem,
  createTestGeminiEdgeFunctionResponse,
} from './helpers';

describe('geminiMappingService', () => {
  describe('parseGeminiJsonBlock', () => {
    it('extracts JSON from code block', () => {
      const text = `解説テキスト

\`\`\`json
{
  "items": [
    { "name": "セメント", "price": 500, "taxIncluded": true, "sourceName": "モノタロウ", "sourceUrl": null }
  ],
  "recommendedPriceRange": { "min": 400, "max": 600 },
  "summary": "セメントの相場です。"
}
\`\`\`

追加テキスト`;

      const result = parseGeminiJsonBlock(text);

      expect(result).not.toBeNull();
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].name).toBe('セメント');
      expect(result!.items[0].price).toBe(500);
      expect(result!.recommendedPriceRange).toEqual({ min: 400, max: 600 });
      expect(result!.summary).toBe('セメントの相場です。');
    });

    it('returns null when no JSON code block exists', () => {
      const text = 'No JSON here, just plain text.';
      expect(parseGeminiJsonBlock(text)).toBeNull();
    });

    it('returns null for malformed JSON in code block', () => {
      const text = '```json\n{ invalid json }\n```';
      expect(parseGeminiJsonBlock(text)).toBeNull();
    });

    it('filters out invalid items (missing name)', () => {
      const text = `\`\`\`json
{
  "items": [
    { "name": "Valid", "price": 100, "taxIncluded": true, "sourceName": "Shop", "sourceUrl": null },
    { "price": 200, "taxIncluded": true, "sourceName": "Shop2", "sourceUrl": null }
  ],
  "summary": "test"
}
\`\`\``;

      const result = parseGeminiJsonBlock(text);
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].name).toBe('Valid');
    });

    it('filters out items with non-positive price', () => {
      const text = `\`\`\`json
{
  "items": [
    { "name": "Good", "price": 100, "taxIncluded": true, "sourceName": "Shop", "sourceUrl": null },
    { "name": "Zero", "price": 0, "taxIncluded": true, "sourceName": "Shop", "sourceUrl": null },
    { "name": "Negative", "price": -50, "taxIncluded": true, "sourceName": "Shop", "sourceUrl": null }
  ],
  "summary": "test"
}
\`\`\``;

      const result = parseGeminiJsonBlock(text);
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].name).toBe('Good');
    });

    it('defaults taxIncluded to true when not boolean', () => {
      const text = `\`\`\`json
{
  "items": [
    { "name": "Item", "price": 100, "sourceName": "Shop", "sourceUrl": null }
  ],
  "summary": "test"
}
\`\`\``;

      const result = parseGeminiJsonBlock(text);
      expect(result!.items[0].taxIncluded).toBe(true);
    });

    it('defaults sourceName to "不明" when not string', () => {
      const text = `\`\`\`json
{
  "items": [
    { "name": "Item", "price": 100, "taxIncluded": true, "sourceUrl": null }
  ],
  "summary": "test"
}
\`\`\``;

      const result = parseGeminiJsonBlock(text);
      expect(result!.items[0].sourceName).toBe('不明');
    });

    it('returns null recommendedPriceRange when missing', () => {
      const text = `\`\`\`json
{
  "items": [
    { "name": "Item", "price": 100, "taxIncluded": true, "sourceName": "Shop", "sourceUrl": null }
  ],
  "summary": "test"
}
\`\`\``;

      const result = parseGeminiJsonBlock(text);
      expect(result!.recommendedPriceRange).toBeNull();
    });

    it('floors non-integer prices', () => {
      const text = `\`\`\`json
{
  "items": [
    { "name": "Item", "price": 1234.56, "taxIncluded": true, "sourceName": "Shop", "sourceUrl": null }
  ],
  "summary": "test"
}
\`\`\``;

      const result = parseGeminiJsonBlock(text);
      expect(result!.items[0].price).toBe(1234);
    });
  });

  describe('mapGeminiResponse', () => {
    it('maps raw response to AiSearchResponse', () => {
      const raw = createTestGeminiEdgeFunctionResponse();
      const result = mapGeminiResponse(raw);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].name).toBe('コンパネ 12mm 3x6');
      expect(result.sources).toEqual(raw.sources);
      expect(result.model).toBe('FLASH');
      expect(result.recommendedPriceRange).toEqual({ min: 1500, max: 2500 });
    });

    it('falls back to raw text as summary when JSON has no summary', () => {
      const raw = createTestGeminiEdgeFunctionResponse({
        text: `説明テキスト

\`\`\`json
{
  "items": [
    { "name": "Item", "price": 100, "taxIncluded": true, "sourceName": "Shop", "sourceUrl": null }
  ]
}
\`\`\``,
      });

      const result = mapGeminiResponse(raw);
      expect(result.summary).toBe('');
    });

    it('uses raw text as summary when no JSON block found', () => {
      const raw = createTestGeminiEdgeFunctionResponse({
        text: 'No JSON, just text response from AI.',
      });

      const result = mapGeminiResponse(raw);
      expect(result.summary).toBe('No JSON, just text response from AI.');
      expect(result.items).toHaveLength(0);
    });
  });

  describe('aiPriceItemToSearchResult', () => {
    it('maps AiPriceItem to MaterialSearchResult', () => {
      const item = createTestAiPriceItem();
      const result = aiPriceItemToSearchResult(item);

      expect(typeof result.id).toBe('string');
      expect(result.id.length).toBeGreaterThan(0);
      expect(result.name).toBe('コンパネ 12mm 3x6');
      expect(result.price).toBe(1980);
      expect(result.taxIncluded).toBe(true);
      expect(result.shopName).toBe('モノタロウ');
      expect(result.imageUrl).toBeNull();
      expect(result.productUrl).toBe('https://www.monotaro.com/p/1234/');
      expect(result.reviewAverage).toBe(0);
      expect(result.reviewCount).toBe(0);
    });

    it('uses empty string for productUrl when sourceUrl is null', () => {
      const item = createTestAiPriceItem({ sourceUrl: null });
      const result = aiPriceItemToSearchResult(item);
      expect(result.productUrl).toBe('');
    });
  });

  describe('aiPriceItemToUnitPriceInput', () => {
    it('converts tax-included price to tax-excluded', () => {
      const item = createTestAiPriceItem({ price: 1100, taxIncluded: true });
      const input = aiPriceItemToUnitPriceInput(item);

      expect(input.defaultPrice).toBe(1000); // 1100 * 100 / 110 = 1000
      expect(input.defaultTaxRate).toBe(10);
    });

    it('uses price as-is when tax-excluded', () => {
      const item = createTestAiPriceItem({ price: 1000, taxIncluded: false });
      const input = aiPriceItemToUnitPriceInput(item);

      expect(input.defaultPrice).toBe(1000);
    });

    it('floors fractional tax-excluded price', () => {
      const item = createTestAiPriceItem({ price: 1500, taxIncluded: true });
      const input = aiPriceItemToUnitPriceInput(item);

      // 1500 * 100 / 110 = 1363.636... → 1363
      expect(input.defaultPrice).toBe(1363);
    });

    it('sets standard defaults', () => {
      const item = createTestAiPriceItem();
      const input = aiPriceItemToUnitPriceInput(item);

      expect(input.unit).toBe('式');
      expect(input.category).toBe('材料');
      expect(input.defaultTaxRate).toBe(10);
    });

    it('includes "AI価格調査" prefix in notes', () => {
      const item = createTestAiPriceItem({ sourceName: 'モノタロウ' });
      const input = aiPriceItemToUnitPriceInput(item);

      expect(input.notes).toBe('AI価格調査: モノタロウ (参考価格)');
    });
  });
});
