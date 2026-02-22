/**
 * Daily Usage Service
 *
 * Tracks daily search usage counts in AsyncStorage.
 * Used for client-side free tier limits (UX guidance only; server enforces real limits).
 * Resets automatically on new day (local date).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@genba_daily_usage';

export type SearchType = 'ai' | 'rakuten';

interface DailyUsageData {
  date: string;
  aiSearchCount: number;
  rakutenSearchCount: number;
}

const EMPTY_USAGE: Omit<DailyUsageData, 'date'> = {
  aiSearchCount: 0,
  rakutenSearchCount: 0,
};

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadUsage(): Promise<DailyUsageData> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: getToday(), ...EMPTY_USAGE };

    const parsed = JSON.parse(raw) as DailyUsageData;
    if (parsed.date !== getToday()) {
      return { date: getToday(), ...EMPTY_USAGE };
    }
    return parsed;
  } catch {
    return { date: getToday(), ...EMPTY_USAGE };
  }
}

/**
 * Get today's search usage counts.
 */
export async function getDailyUsage(): Promise<Omit<DailyUsageData, 'date'>> {
  const data = await loadUsage();
  return { aiSearchCount: data.aiSearchCount, rakutenSearchCount: data.rakutenSearchCount };
}

/**
 * Increment usage count for the given search type.
 */
export async function incrementDailyUsage(type: SearchType): Promise<void> {
  const data = await loadUsage();
  if (type === 'ai') {
    data.aiSearchCount++;
  } else {
    data.rakutenSearchCount++;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** @internal Reset for testing. */
export function resetForTest(): void {
  // no internal state to reset — all in AsyncStorage
}
