/**
 * Material Research Service
 *
 * Calls Supabase Edge Function to search materials via Rakuten API.
 * Uses Result pattern (no throw) for error handling.
 */

import type {
  RakutenSearchResponse,
  SearchMaterialsParams,
  SearchMaterialsResult,
  MaterialResearchDomainResult,
} from '@/types/materialResearch';
import { mapRakutenResponse } from './rakutenMappingService';
import { getAccessToken, initializeAuth } from '@/domain/auth/supabaseAuthService';

const SUPABASE_FUNCTION_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
  ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/rakuten-search`
  : '';

/**
 * Search materials via Supabase Edge Function (Rakuten API proxy)
 */
export async function searchMaterials(
  params: SearchMaterialsParams
): Promise<MaterialResearchDomainResult<SearchMaterialsResult>> {
  const { keyword, page = 1, hits = 20 } = params;

  if (!keyword.trim()) {
    return {
      success: true,
      data: { results: [], totalCount: 0, currentPage: 1, totalPages: 0 },
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
      body: JSON.stringify({ keyword: keyword.trim(), page, hits }),
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
              message: '本日の検索回数の上限に達しました。',
            },
          };
        }
        return {
          success: false,
          error: {
            code: 'RATE_LIMIT',
            message: '検索回数の制限に達しました。しばらくお待ちください。',
          },
        };
      }
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: '検索に失敗しました。通信状況を確認してください。',
        },
      };
    }

    const data: RakutenSearchResponse = await response.json();
    const results = mapRakutenResponse(data);

    return {
      success: true,
      data: {
        results,
        totalCount: data.count,
        currentPage: data.page,
        totalPages: data.pageCount,
      },
    };
  } catch {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: '検索に失敗しました。通信状況を確認してください。',
      },
    };
  }
}
