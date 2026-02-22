import type { TaxRate } from './document';

/**
 * Rakuten Ichiba Item Search API - Item shape (formatVersion=2)
 * @see https://webservice.rakuten.co.jp/documentation/ichiba-item-search
 */
export interface RakutenItem {
  /** Product title */
  itemName: string;
  /** Price in yen */
  itemPrice: number;
  /** Unique item identifier (format: "shopCode:itemId") */
  itemCode: string;
  /** Product page URL */
  itemUrl: string;
  /** 128x128 product image URLs */
  mediumImageUrls: string[];
  /** Shop display name */
  shopName: string;
  /** Shop code (URL segment) */
  shopCode: string;
  /** Product description */
  itemCaption: string;
  /** Number of user reviews */
  reviewCount: number;
  /** Average review score (0-5) */
  reviewAverage: number;
  /** Stock availability: 1=in stock, 0=out of stock */
  availability: number;
  /** Tax flag: 0=tax included, 1=tax excluded */
  taxFlag: number;
  /** Postage flag: 0=postage included, 1=postage not included */
  postageFlag: number;
}

/**
 * Rakuten Ichiba Item Search API - Response shape (formatVersion=2)
 */
export interface RakutenSearchResponse {
  /** Total number of matching items */
  count: number;
  /** Current page number */
  page: number;
  /** Number of items per page */
  hits: number;
  /** Total number of pages (max 100) */
  pageCount: number;
  /** Item array (formatVersion=2: flat array) */
  Items: RakutenItem[];
}

/**
 * Display model for a material search result.
 * Derived from RakutenItem for UI rendering.
 */
export interface MaterialSearchResult {
  /** Unique key for FlatList (itemCode) */
  id: string;
  /** Product name */
  name: string;
  /** Price in yen */
  price: number;
  /** Whether price includes tax */
  taxIncluded: boolean;
  /** Shop name */
  shopName: string;
  /** Product image URL (first medium image, or null) */
  imageUrl: string | null;
  /** Product URL on Rakuten */
  productUrl: string;
  /** Average review score (0-5) */
  reviewAverage: number;
  /** Number of reviews */
  reviewCount: number;
}

/**
 * Parameters for material search
 */
export interface SearchMaterialsParams {
  /** Search keyword (required) */
  keyword: string;
  /** Page number (1-100, default 1) */
  page?: number;
  /** Results per page (1-30, default 20) */
  hits?: number;
}

/**
 * Result from material search
 */
export interface SearchMaterialsResult {
  /** Search results */
  results: MaterialSearchResult[];
  /** Total number of matching items */
  totalCount: number;
  /** Current page number */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Error from material research operations
 */
export interface MaterialResearchError {
  code: 'RATE_LIMIT' | 'DAILY_LIMIT' | 'AUTH_ERROR' | 'NETWORK_ERROR' | 'API_ERROR';
  message: string;
}

/**
 * Result type for material research operations (Result pattern)
 */
export type MaterialResearchDomainResult<T> =
  | { success: true; data: T }
  | { success: false; error: MaterialResearchError };

// === AI Search Types (Gemini + Google Search Grounding) ===

/** A single price comparison item from AI search */
export interface AiPriceItem {
  /** Product/material name */
  name: string;
  /** Price in yen */
  price: number;
  /** Whether price includes tax */
  taxIncluded: boolean;
  /** Source/shop name */
  sourceName: string;
  /** Source URL (from grounding or AI response) */
  sourceUrl: string | null;
}

/** Grounding source from Google Search */
export interface GroundingSource {
  /** Source URL */
  uri: string;
  /** Source title */
  title: string;
}

/** Full AI search response */
export interface AiSearchResponse {
  /** AI summary/analysis text */
  summary: string;
  /** Price comparison items (3-5) */
  items: AiPriceItem[];
  /** Recommended price range */
  recommendedPriceRange: { min: number; max: number } | null;
  /** Grounding sources from Google Search */
  sources: GroundingSource[];
}

/** Parameters for AI material search */
export interface AiSearchParams {
  /** Search query (required) */
  query: string;
}

/** Error from AI search operations */
export interface AiSearchError {
  code: 'RATE_LIMIT' | 'DAILY_LIMIT' | 'AUTH_ERROR' | 'NETWORK_ERROR' | 'API_ERROR' | 'PARSE_ERROR';
  message: string;
}

/** Result type for AI search operations */
export type AiSearchDomainResult<T> =
  | { success: true; data: T }
  | { success: false; error: AiSearchError };

/** Search source tab type */
export type SearchSource = 'rakuten' | 'ai';
