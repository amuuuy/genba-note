/**
 * useDailySearchUsage Hook
 *
 * Loads and tracks daily search usage counts as React state.
 * Wraps dailyUsageService for use in components.
 * Used by MaterialSearchModal for free tier limit enforcement (UX guidance only).
 *
 * Daily usage auto-resets on new day (handled by dailyUsageService).
 * Call reload() before limit checks to ensure fresh data (e.g., date rollover).
 */

import { useState, useEffect, useCallback } from 'react';
import { getDailyUsage, incrementDailyUsage } from '@/subscription/dailyUsageService';

export interface DailyUsageCounts {
  aiSearchCount: number;
  rakutenSearchCount: number;
}

export interface UseDailySearchUsageReturn {
  aiSearchCount: number;
  rakutenSearchCount: number;
  isLoaded: boolean;
  /** Re-fetch usage from storage and return fresh counts (handles date rollover). */
  reload: () => Promise<DailyUsageCounts>;
  incrementAi: () => Promise<void>;
  incrementRakuten: () => Promise<void>;
}

export function useDailySearchUsage(enabled: boolean): UseDailySearchUsageReturn {
  const [aiSearchCount, setAiSearchCount] = useState(0);
  const [rakutenSearchCount, setRakutenSearchCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const reload = useCallback(async (): Promise<DailyUsageCounts> => {
    const usage = await getDailyUsage();
    setAiSearchCount(usage.aiSearchCount);
    setRakutenSearchCount(usage.rakutenSearchCount);
    setIsLoaded(true);
    return usage;
  }, []);

  useEffect(() => {
    if (enabled) {
      let cancelled = false;
      getDailyUsage().then((usage) => {
        if (!cancelled) {
          setAiSearchCount(usage.aiSearchCount);
          setRakutenSearchCount(usage.rakutenSearchCount);
          setIsLoaded(true);
        }
      });
      return () => {
        cancelled = true;
      };
    } else {
      setIsLoaded(false);
    }
  }, [enabled]);

  const incrementAi = useCallback(async () => {
    await incrementDailyUsage('ai');
    setAiSearchCount((prev) => prev + 1);
  }, []);

  const incrementRakuten = useCallback(async () => {
    await incrementDailyUsage('rakuten');
    setRakutenSearchCount((prev) => prev + 1);
  }, []);

  return { aiSearchCount, rakutenSearchCount, isLoaded, reload, incrementAi, incrementRakuten };
}
