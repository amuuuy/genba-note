/**
 * useAiPriceSearch Hook
 *
 * Manages AI-powered material price search state.
 * Uses Gemini API via geminiSearchService.
 */

import { useState, useCallback } from 'react';
import type {
  AiSearchResponse,
  AiSearchModel,
} from '@/types/materialResearch';
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
  /** Current AI model selection */
  model: AiSearchModel;
  /** Change AI model */
  setModel: (model: AiSearchModel) => void;
  /** Execute search. Pass query to avoid stale-closure issues. */
  search: (queryOverride?: string) => Promise<void>;
  /** Clear search state (query, result, error). Model selection is preserved. */
  clear: () => void;
}

/**
 * Hook for AI-powered material price search
 */
export function useAiPriceSearch(
  defaultModel: AiSearchModel = 'FLASH'
): UseAiPriceSearchReturn {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<AiSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<AiSearchModel>(defaultModel);

  const search = useCallback(async (queryOverride?: string) => {
    const searchQuery = queryOverride ?? query;
    if (!searchQuery.trim()) return;

    if (queryOverride !== undefined) setQuery(queryOverride);
    setIsLoading(true);
    setError(null);
    setResult(null);

    const response = await searchMaterialsWithAi({ query: searchQuery, model });

    if (response.success) {
      setResult(response.data);
    } else {
      setError(response.error.message);
    }

    setIsLoading(false);
  }, [query, model]);

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
    model,
    setModel,
    search,
    clear,
  };
}
