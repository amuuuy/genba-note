/**
 * Gemini API Mapping Service
 *
 * Pure functions for parsing Gemini API responses
 * and mapping to display models and UnitPriceInput.
 */

import type {
  AiPriceItem,
  AiSearchResponse,
  AiSearchModel,
  GroundingSource,
  MaterialSearchResult,
} from '@/types/materialResearch';
import type { UnitPriceInput } from '@/domain/unitPrice';
import { generateUUID } from '@/utils/uuid';

/** Raw response shape from the gemini-search Edge Function */
export interface GeminiEdgeFunctionResponse {
  text: string;
  sources: GroundingSource[];
  model: AiSearchModel;
  webSearchQueries: string[];
}

/**
 * Parse the JSON block from Gemini's text response.
 * Gemini wraps the JSON in ```json ... ``` code blocks.
 */
export function parseGeminiJsonBlock(text: string): {
  items: AiPriceItem[];
  recommendedPriceRange: { min: number; max: number } | null;
  summary: string;
} | null {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[1]);
    return {
      items: Array.isArray(parsed.items)
        ? parsed.items.map(validateAiPriceItem).filter(Boolean) as AiPriceItem[]
        : [],
      recommendedPriceRange: parsed.recommendedPriceRange ?? null,
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    };
  } catch {
    return null;
  }
}

/** Validate and normalize a single AiPriceItem */
function validateAiPriceItem(raw: unknown): AiPriceItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;

  const name = typeof item.name === 'string' ? item.name : '';
  const price = typeof item.price === 'number' && Number.isFinite(item.price)
    ? item.price
    : 0;

  if (!name || price <= 0) return null;

  return {
    name,
    price: Math.floor(price),
    taxIncluded: typeof item.taxIncluded === 'boolean' ? item.taxIncluded : true,
    sourceName: typeof item.sourceName === 'string' ? item.sourceName : '不明',
    sourceUrl: typeof item.sourceUrl === 'string' ? item.sourceUrl : null,
  };
}

/**
 * Map GeminiEdgeFunctionResponse to AiSearchResponse
 */
export function mapGeminiResponse(
  raw: GeminiEdgeFunctionResponse
): AiSearchResponse {
  const parsed = parseGeminiJsonBlock(raw.text);

  return {
    summary: parsed?.summary ?? raw.text.replace(/```json[\s\S]*?```/, '').trim(),
    items: parsed?.items ?? [],
    recommendedPriceRange: parsed?.recommendedPriceRange ?? null,
    sources: raw.sources,
    model: raw.model,
  };
}

/**
 * Convert AiPriceItem to MaterialSearchResult for reuse with existing UI
 */
export function aiPriceItemToSearchResult(
  item: AiPriceItem
): MaterialSearchResult {
  return {
    id: generateUUID(),
    name: item.name,
    price: item.price,
    taxIncluded: item.taxIncluded,
    shopName: item.sourceName,
    imageUrl: null,
    productUrl: item.sourceUrl ?? '',
    reviewAverage: 0,
    reviewCount: 0,
  };
}

/**
 * Convert AiPriceItem to UnitPriceInput for one-tap registration.
 *
 * Tax handling (same as searchResultToUnitPriceInput in rakutenMappingService):
 * - taxIncluded=true (税込): normalize to tax-excluded price (price * 100 / 110)
 * - taxIncluded=false (税抜): use price as-is
 * Both cases set defaultTaxRate=10.
 */
export function aiPriceItemToUnitPriceInput(
  item: AiPriceItem
): UnitPriceInput {
  const taxExcludedPrice = item.taxIncluded
    ? Math.floor((item.price * 100) / 110)
    : Math.floor(item.price);

  return {
    name: item.name,
    unit: '式',
    defaultPrice: taxExcludedPrice,
    defaultTaxRate: 10,
    category: '材料',
    notes: `AI価格調査: ${item.sourceName} (参考価格)`,
  };
}
