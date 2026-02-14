/**
 * Gemini Search Service
 *
 * Calls Supabase Edge Function to search materials via Gemini API
 * with Google Search grounding.
 * Uses Result pattern (no throw) for error handling.
 */

import type {
  AiSearchParams,
  AiSearchResponse,
  AiSearchDomainResult,
} from '@/types/materialResearch';
import { mapGeminiResponse } from './geminiMappingService';
import type { GeminiEdgeFunctionResponse } from './geminiMappingService';

const SUPABASE_FUNCTION_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
  ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/gemini-search`
  : '';

const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Search materials via Supabase Edge Function (Gemini API proxy)
 */
export async function searchMaterialsWithAi(
  params: AiSearchParams
): Promise<AiSearchDomainResult<AiSearchResponse>> {
  const { query, model = 'FLASH' } = params;

  if (!query.trim()) {
    return {
      success: true,
      data: {
        summary: '',
        items: [],
        recommendedPriceRange: null,
        sources: [],
        model,
      },
    };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (SUPABASE_ANON_KEY) {
      headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
    }

    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: query.trim(), model }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return {
          success: false,
          error: {
            code: 'RATE_LIMIT',
            message: 'AI検索の利用回数制限に達しました。しばらくお待ちください。',
          },
        };
      }
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'AI検索に失敗しました。通信状況を確認してください。',
        },
      };
    }

    const data: GeminiEdgeFunctionResponse = await response.json();
    const result = mapGeminiResponse(data);

    if (result.items.length === 0 && !result.summary) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'AIからの回答を解析できませんでした。検索キーワードを変えてお試しください。',
        },
      };
    }

    return { success: true, data: result };
  } catch {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'AI検索に失敗しました。通信状況を確認してください。',
      },
    };
  }
}
