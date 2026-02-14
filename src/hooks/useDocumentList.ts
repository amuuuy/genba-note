/**
 * useDocumentList Hook
 *
 * Manages document list state with loading, error handling, and CRUD operations.
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import type { Document, DocumentWithTotals, DocumentFilter, DocumentSort } from '../types';
import { listDocuments, deleteDocumentById } from '../domain/document';
import { enrichDocumentWithTotals } from '../domain/lineItem';

/**
 * Document list state
 */
export interface DocumentListState {
  documents: DocumentWithTotals[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Default sort order (most recently updated first)
 */
const DEFAULT_SORT: DocumentSort = {
  field: 'updatedAt',
  direction: 'desc',
};

/**
 * Enrich all documents with calculated totals
 */
export function enrichDocumentsWithTotals(docs: Document[]): DocumentWithTotals[] {
  return docs.map(enrichDocumentWithTotals);
}

/**
 * Create a handler function for removing a document from the list
 */
export function createDeleteHandler(
  documents: DocumentWithTotals[],
  setDocuments: (docs: DocumentWithTotals[]) => DocumentWithTotals[]
): (id: string) => DocumentWithTotals[] {
  return (id: string) => {
    const filtered = documents.filter((d) => d.id !== id);
    return setDocuments(filtered);
  };
}

/**
 * Hook return type
 */
export interface UseDocumentListReturn {
  /** Current list of documents with totals */
  documents: DocumentWithTotals[];
  /** Whether the list is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh the document list */
  refresh: () => Promise<void>;
  /** Delete a document by ID */
  deleteDocument: (id: string) => Promise<boolean>;
}

/**
 * Hook for managing document list
 *
 * @param filter - Optional filter to apply
 * @param sort - Optional sort order (default: updatedAt desc)
 */
export function useDocumentList(
  filter?: DocumentFilter,
  sort: DocumentSort = DEFAULT_SORT
): UseDocumentListReturn {
  const [state, setState] = useState<DocumentListState>({
    documents: [],
    isLoading: true,
    error: null,
  });

  // Request ID to track and ignore stale responses
  const requestIdRef = useRef(0);
  // Track first useFocusEffect call to skip it (useEffect handles initial load)
  const isFirstFocusRef = useRef(true);

  const refresh = useCallback(async () => {
    // Increment request ID for this request
    const currentRequestId = ++requestIdRef.current;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await listDocuments(filter, sort);

      // Ignore stale responses - only apply if this is still the latest request
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (result.success && result.data) {
        const enriched = enrichDocumentsWithTotals(result.data);
        setState({
          documents: enriched,
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          documents: [],
          isLoading: false,
          error: result.error?.message ?? '書類の読み込みに失敗しました',
        });
      }
    } catch (err) {
      // Ignore stale responses
      if (currentRequestId !== requestIdRef.current) {
        return;
      }
      setState({
        documents: [],
        isLoading: false,
        error: '書類の読み込みに失敗しました',
      });
    }
  }, [filter, sort]);

  // Refresh on mount and when filter/sort changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh when screen comes into focus (skip first call to avoid double fetch)
  useFocusEffect(
    useCallback(() => {
      // Skip first focus (initial mount) - useEffect already handles initial load
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );

  const deleteDocument = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await deleteDocumentById(id);

      if (result.success) {
        setState((prev) => ({
          ...prev,
          documents: prev.documents.filter((d) => d.id !== id),
        }));
        return true;
      } else {
        // Optionally show error to user
        if (__DEV__) console.error('Delete failed:', result.error?.message);
        return false;
      }
    } catch (err) {
      if (__DEV__) console.error('Delete error:', err);
      return false;
    }
  }, []);

  return {
    documents: state.documents,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
    deleteDocument,
  };
}
