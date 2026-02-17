/**
 * Material Research Domain
 *
 * Services for searching material prices via external APIs.
 */

export {
  mapRakutenItemToSearchResult,
  mapRakutenResponse,
  searchResultToUnitPriceInput,
} from './rakutenMappingService';

export { searchMaterials } from './materialResearchService';

export { createRateLimiter } from './rateLimiter';
export type { RateLimiterOptions, RateLimitEntry } from './rateLimiter';

export {
  parseGeminiJsonBlock,
  mapGeminiResponse,
  aiPriceItemToSearchResult,
  aiPriceItemToUnitPriceInput,
} from './geminiMappingService';
export type { GeminiEdgeFunctionResponse } from './geminiMappingService';

export { searchMaterialsWithAi } from './geminiSearchService';

export {
  unitPriceInputToLineItemInput,
  searchResultToLineItemInput,
  aiPriceItemToLineItemInput,
} from './lineItemMappingService';
