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
import { getAccessToken, initializeAuth } from '@/domain/auth/supabaseAuthService';

const SUPABASE_FUNCTION_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
  ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/gemini-search`
  : '';

/**
 * Search materials via Supabase Edge Function (Gemini API proxy)
 */
export async function searchMaterialsWithAi(
  params: AiSearchParams
): Promise<AiSearchDomainResult<AiSearchResponse>> {
  const { query } = params;

  if (!query.trim()) {
    return {
      success: true,
      data: {
        summary: '',
        items: [],
        recommendedPriceRange: null,
        sources: [],
      },
    };
  }

  try {
    let token = await getAccessToken();
    if (!token) {
      await initializeAuth();
      token = await getAccessToken();
    }
    if (!token) {
      return {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: '認証に失敗しました。アプリを再起動してください。',
        },
      };
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const response = await fetch(SUPABASE_FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: query.trim() }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: {
            code: 'AUTH_ERROR',
            message: '認証に失敗しました。アプリを再起動してください。',
          },
        };
      }
      if (response.status === 429) {
        const errorBody = await response.json().catch(() => null);
        const errorMsg = errorBody && typeof errorBody === 'object' && 'error' in errorBody
          ? (errorBody as { error: string }).error
          : '';
        if (errorMsg === 'daily_limit_exceeded') {
          return {
            success: false,
            error: {
              code: 'DAILY_LIMIT',
              message: '本日のAI検索回数の上限に達しました。',
            },
          };
        }
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

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'AIからの回答を解析できませんでした。検索キーワードを変えてお試しください。',
        },
      };
    }

    if (!data || typeof data !== 'object') {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'AIからの回答を解析できませんでした。検索キーワードを変えてお試しください。',
        },
      };
    }

    const result = mapGeminiResponse(data as GeminiEdgeFunctionResponse);

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
