/**
 * Material Research Service
 *
 * Calls Supabase Edge Function to search materials via Rakuten API.
 */

import type {
  RakutenSearchResponse,
  SearchMaterialsParams,
  SearchMaterialsResult,
} from '@/types/materialResearch';
import { mapRakutenResponse } from './rakutenMappingService';

const SUPABASE_FUNCTION_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
  ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/rakuten-search`
  : '';

const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Search materials via Supabase Edge Function (Rakuten API proxy)
 */
export async function searchMaterials(
  params: SearchMaterialsParams
): Promise<SearchMaterialsResult> {
  const { keyword, page = 1, hits = 20 } = params;

  if (!keyword.trim()) {
    return { results: [], totalCount: 0, currentPage: 1, totalPages: 0 };
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
      body: JSON.stringify({ keyword: keyword.trim(), page, hits }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(
          '検索回数の制限に達しました。しばらくお待ちください。'
        );
      }
      throw new Error('検索に失敗しました。通信状況を確認してください。');
    }

    const data: RakutenSearchResponse = await response.json();
    const results = mapRakutenResponse(data);

    return {
      results,
      totalCount: data.count,
      currentPage: data.page,
      totalPages: data.pageCount,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('検索')) {
      throw error;
    }
    throw new Error('検索に失敗しました。通信状況を確認してください。');
  }
}
