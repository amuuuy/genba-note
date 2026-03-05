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
  /** Execute search (resets to page 1). Pass query to avoid stale-closure issues. Returns true on success. */
  search: (queryOverride?: string) => Promise<boolean>;
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

  const search = useCallback(async (queryOverride?: string): Promise<boolean> => {
    const searchQuery = queryOverride ?? query;
    if (!searchQuery.trim()) return false;

    if (queryOverride !== undefined) setQuery(queryOverride);
    setIsLoading(true);
    setError(null);

    const result = await searchMaterials({ keyword: searchQuery, page: 1 });
    if (result.success) {
      setResults(result.data.results);
      setCurrentPage(result.data.currentPage);
      setTotalPages(result.data.totalPages);
    } else {
      setError(result.error.message);
      setResults([]);
    }
    setIsLoading(false);
    return result.success;
  }, [query]);

  const loadMore = useCallback(async () => {
    if (isLoading || currentPage >= totalPages) return;

    const nextPage = currentPage + 1;
    setIsLoading(true);
    setError(null);

    const result = await searchMaterials({
      keyword: query,
      page: nextPage,
    });
    if (result.success) {
      setResults((prev) => [...prev, ...result.data.results]);
      setCurrentPage(result.data.currentPage);
      setTotalPages(result.data.totalPages);
    } else {
      setError(result.error.message);
    }
    setIsLoading(false);
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
