/**
 * useCalendar Hook
 *
 * Manages calendar state: month navigation, event loading, and markedDates.
 * Combines user events with virtual events from documents and work logs.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { addMonths, getCurrentYearMonth } from '@/utils/dateUtils';
import { getCalendarEvents } from '@/domain/calendar/calendarService';
import { aggregateEvents } from '@/domain/calendar/calendarAggregationService';
import { getAllDocuments } from '@/storage/asyncStorageService';
import { getAllWorkLogEntries } from '@/domain/customer/workLogEntryService';
import type { CalendarDisplayEvent } from '@/types/calendarEvent';

export interface CalendarState {
  currentYear: number;
  currentMonth: number; // 1-12
  selectedDate: string | null;
  events: CalendarDisplayEvent[];
  isLoading: boolean;
  error: string | null;
}

export interface MarkedDateData {
  dots: Array<{ key: string; color: string }>;
  selected?: boolean;
}

/**
 * Exported for testing: fetches all data sources and returns aggregated events.
 * Fail-closed: returns error if any source fails.
 */
export async function fetchAndAggregateEvents(
  yearMonth: string
): Promise<{ events: CalendarDisplayEvent[]; error: string | null }> {
  const [calendarResult, docsResult, workLogsResult] = await Promise.all([
    getCalendarEvents(),
    getAllDocuments(),
    getAllWorkLogEntries(),
  ]);

  // Fail-closed: if any data source fails, show error instead of partial data
  if (!calendarResult.success || !docsResult.success || !workLogsResult.success) {
    const failedSources: string[] = [];
    if (!calendarResult.success) failedSources.push('カレンダー');
    if (!docsResult.success) failedSources.push('書類');
    if (!workLogsResult.success) failedSources.push('作業ログ');
    return { events: [], error: `データの読み込みに失敗しました（${failedSources.join('、')}）` };
  }

  const aggregated = aggregateEvents(
    calendarResult.data ?? [],
    docsResult.data ?? [],
    workLogsResult.data ?? [],
    yearMonth
  );
  return { events: aggregated, error: null };
}

export function useCalendar() {
  const requestIdRef = useRef(0);
  const initial = getCurrentYearMonth();
  const [currentYear, setCurrentYear] = useState(initial.year);
  const [currentMonth, setCurrentMonth] = useState(initial.month);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarDisplayEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yearMonth = useMemo(
    () =>
      `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
    [currentYear, currentMonth]
  );

  const loadEvents = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchAndAggregateEvents(yearMonth);
      if (requestId !== requestIdRef.current) return;
      setEvents(result.events);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setEvents([]);
      setError('カレンダーの読み込みに失敗しました');
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [yearMonth]);

  // Reload events when screen is focused or month changes
  useFocusEffect(
    useCallback(() => {
      loadEvents();
      return () => {
        requestIdRef.current++;
      };
    }, [loadEvents])
  );

  const goToPreviousMonth = useCallback(() => {
    const prev = addMonths(currentYear, currentMonth, -1);
    setCurrentYear(prev.year);
    setCurrentMonth(prev.month);
    setSelectedDate(null);
  }, [currentYear, currentMonth]);

  const goToNextMonth = useCallback(() => {
    const next = addMonths(currentYear, currentMonth, 1);
    setCurrentYear(next.year);
    setCurrentMonth(next.month);
    setSelectedDate(null);
  }, [currentYear, currentMonth]);

  const goToMonth = useCallback((year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    setSelectedDate(null);
  }, []);

  const selectDate = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  // Build markedDates for react-native-calendars (multi-dot format)
  const markedDates = useMemo(() => {
    const marks: Record<string, MarkedDateData> = {};

    for (const event of events) {
      if (!marks[event.date]) {
        marks[event.date] = { dots: [] };
      }
      // Avoid duplicate colors for same date
      const existing = marks[event.date].dots;
      if (!existing.some((d) => d.color === event.color)) {
        existing.push({
          key: event.kind === 'virtual' ? event.source : event.type,
          color: event.color,
        });
      }
    }

    // Mark selected date
    if (selectedDate && marks[selectedDate]) {
      marks[selectedDate].selected = true;
    } else if (selectedDate) {
      marks[selectedDate] = { dots: [], selected: true };
    }

    return marks;
  }, [events, selectedDate]);

  // Events for the selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter((e) => e.date === selectedDate);
  }, [events, selectedDate]);

  return {
    currentYear,
    currentMonth,
    yearMonth,
    selectedDate,
    events,
    selectedDateEvents,
    isLoading,
    error,
    markedDates,
    goToPreviousMonth,
    goToNextMonth,
    goToMonth,
    selectDate,
    refresh: loadEvents,
  };
}
