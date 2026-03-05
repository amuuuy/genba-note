/**
 * useAiPriceSearch Hook
 *
 * Manages AI-powered material price search state.
 * Uses Gemini API via geminiSearchService.
 */

import { useState, useCallback } from 'react';
import type { AiSearchResponse } from '@/types/materialResearch';
import { searchMaterialsWithAi } from '@/domain/materialResearch/geminiSearchService';

export interface UseAiPriceSearchReturn {
  /** Current search query */
  query: string;
  /** Update search query */
  setQuery: (text: string) => void;
  /** AI search result (null before first search) */
  result: AiSearchResponse | null;
  /** Whether search is in progress */
  isLoading: boolean;
  /** Error message (Japanese, null if no error) */
  error: string | null;
  /** Execute search. Pass query to avoid stale-closure issues. Returns true on success. */
  search: (queryOverride?: string) => Promise<boolean>;
  /** Clear search state (query, result, error). */
  clear: () => void;
}

/**
 * Hook for AI-powered material price search
 */
export function useAiPriceSearch(): UseAiPriceSearchReturn {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AiSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (queryOverride?: string): Promise<boolean> => {
    const searchQuery = queryOverride ?? query;
    if (!searchQuery.trim()) return false;

    if (queryOverride !== undefined) setQuery(queryOverride);
    setIsLoading(true);
    setError(null);
    setResult(null);

    const response = await searchMaterialsWithAi({ query: searchQuery });

    if (response.success) {
      setResult(response.data);
    } else {
      setError(response.error.message);
    }

    setIsLoading(false);
    return response.success;
  }, [query]);

  const clear = useCallback(() => {
    setQuery('');
    setResult(null);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    result,
    isLoading,
    error,
    search,
    clear,
  };
}
