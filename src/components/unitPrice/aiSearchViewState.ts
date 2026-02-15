/**
 * AI Search View State Determination
 *
 * Pure function for determining which view state to render
 * in AiSearchResultView, separated for testability.
 */

import type { AiSearchResponse } from '@/types/materialResearch';

/** View state for AI search results, determined by priority: loading > error > empty > no-results > results */
export type AiSearchViewState = 'loading' | 'error' | 'empty' | 'no-results' | 'results';

/** Determine which view state to render based on props. */
export function determineAiSearchViewState(props: {
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  result: AiSearchResponse | null;
}): AiSearchViewState {
  if (props.isLoading) return 'loading';
  if (props.error) return 'error';
  if (!props.hasSearched) return 'empty';
  if (!props.result || props.result.items.length === 0) return 'no-results';
  return 'results';
}
