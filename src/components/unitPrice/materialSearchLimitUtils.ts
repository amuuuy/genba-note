/**
 * Pure utility functions for AI search limit logic.
 *
 * Extracted from MaterialSearchModal to enable direct testing
 * in node test environment (no JSX dependency).
 */

import { canSearchAi } from '@/subscription/freeTierLimitsService';

/**
 * Determine whether AI limit check should be performed.
 * Returns false (skip check) when Pro status is still loading or user is Pro.
 */
export function shouldCheckAiLimit(isProLoading: boolean, isPro: boolean): boolean {
  return !isProLoading && !isPro;
}

/**
 * Check AI search daily limit and return block info if limit reached.
 * Returns null if search is allowed, or { limit } if blocked.
 */
export function checkAiSearchLimit(
  todayCount: number,
  isPro: boolean
): { limit: number } | null {
  const check = canSearchAi(todayCount, isPro);
  if (!check.allowed) {
    return { limit: check.limit };
  }
  return null;
}

/**
 * Result of executeAiSearch: whether search succeeded and whether increment was called.
 */
export interface AiSearchExecutionResult {
  outcome: 'blocked' | 'searched';
  searchSuccess?: boolean;
  incremented: boolean;
}

/**
 * Testable async function encapsulating the AI search flow:
 * 1. If shouldCheck, reload daily usage and check limit
 * 2. If blocked, call onBlocked and return
 * 3. Execute search
 * 4. If search succeeded and shouldCheck, increment usage
 */
export async function executeAiSearch(deps: {
  isProLoading: boolean;
  isPro: boolean;
  reload: () => Promise<{ aiSearchCount: number }>;
  search: () => Promise<boolean>;
  incrementAi: () => Promise<void>;
  onBlocked: (limit: number) => void;
}): Promise<AiSearchExecutionResult> {
  const shouldCheck = shouldCheckAiLimit(deps.isProLoading, deps.isPro);

  if (shouldCheck) {
    const freshUsage = await deps.reload();
    const blocked = checkAiSearchLimit(freshUsage.aiSearchCount, deps.isPro);
    if (blocked) {
      deps.onBlocked(blocked.limit);
      return { outcome: 'blocked', incremented: false };
    }
  }

  const success = await deps.search();
  let incremented = false;

  if (success && shouldCheck) {
    await deps.incrementAi().catch(() => {});
    incremented = true;
  }

  return { outcome: 'searched', searchSuccess: success, incremented };
}

/** Result when guarded search is skipped due to re-entry */
export type GuardedAiSearchResult = AiSearchExecutionResult | { outcome: 'skipped' };

/**
 * Creates a guarded version of executeAiSearch that prevents re-entry.
 * While a search is in-flight, subsequent calls return { outcome: 'skipped' }.
 * After the in-flight search completes, the guard resets and allows new calls.
 */
export function createGuardedAiSearch(): {
  execute: (deps: Parameters<typeof executeAiSearch>[0]) => Promise<GuardedAiSearchResult>;
  isInFlight: () => boolean;
} {
  let inFlight = false;

  return {
    execute: async (deps) => {
      if (inFlight) return { outcome: 'skipped' };
      inFlight = true;
      try {
        return await executeAiSearch(deps);
      } finally {
        inFlight = false;
      }
    },
    isInFlight: () => inFlight,
  };
}
