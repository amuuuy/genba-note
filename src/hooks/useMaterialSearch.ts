/**
 * useMaterialSearch Hook
 *
 * Manages material search state with pagination.
 * Calls materialResearchService for API requests.
 */

import { useState, useCallback } from 'react';
import type { MaterialSearchResult } from '@/types/materialResearch';
import { searchMaterials } from '@/domain/materialResearch/materialResearchService';

export interface UseMaterialSearchReturn {
  /** Current search query */
  query: string;
  /** Update search query */
  setQuery: (text: string) => void;
  /** Search results */
  results: MaterialSearchResult[];
  /** Whether a search is in progress */
  isLoading: boolean;
  /** Error message (Japanese) */
  error: string | null;
  /** Current page number */
  currentPage: number;
  /** Total pages available */
  totalPages: number;
  /** Execute search (resets to page 1) */
  search: () => Promise<void>;
  /** Load next page (appends results) */
  loadMore: () => Promise<void>;
  /** Clear all state */
  clear: () => void;
}

/**
 * Hook for material price research via Rakuten API
 */
export function useMaterialSearch(): UseMaterialSearchReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MaterialSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const search = useCallback(async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await searchMaterials({ keyword: query, page: 1 });
      setResults(result.results);
      setCurrentPage(result.currentPage);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '検索に失敗しました。通信状況を確認してください。'
      );
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const loadMore = useCallback(async () => {
    if (isLoading || currentPage >= totalPages) return;

    const nextPage = currentPage + 1;
    setIsLoading(true);
    setError(null);

    try {
      const result = await searchMaterials({
        keyword: query,
        page: nextPage,
      });
      setResults((prev) => [...prev, ...result.results]);
      setCurrentPage(result.currentPage);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : '検索に失敗しました。通信状況を確認してください。'
      );
    } finally {
      setIsLoading(false);
    }
  }, [query, isLoading, currentPage, totalPages]);

  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsLoading(false);
    setError(null);
    setCurrentPage(1);
    setTotalPages(0);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    currentPage,
    totalPages,
    search,
    loadMore,
    clear,
  };
}
