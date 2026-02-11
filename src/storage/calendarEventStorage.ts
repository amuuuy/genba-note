/**
 * Calendar Event Storage
 *
 * AsyncStorage-based CRUD for CalendarEvent.
 * Follows the financeStorage.ts pattern with result types and write queue.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/utils/constants';
import { calendarEventsQueue } from '@/utils/writeQueue';
import { getReadOnlyMode } from '@/storage/readOnlyModeState';
import type { CalendarEvent, UpdateCalendarEventInput } from '@/types/calendarEvent';

// === Result Types ===

export type CalendarEventErrorCode =
  | 'READ_ERROR'
  | 'WRITE_ERROR'
  | 'PARSE_ERROR'
  | 'NOT_FOUND'
  | 'READONLY_MODE'
  | 'VALIDATION_ERROR';

export interface CalendarEventError {
  code: CalendarEventErrorCode;
  message: string;
  originalError?: Error;
}

export interface CalendarEventResult<T> {
  success: boolean;
  data?: T;
  error?: CalendarEventError;
}

// === Helpers ===

function createError(
  code: CalendarEventErrorCode,
  message: string,
  originalError?: Error
): CalendarEventError {
  return { code, message, originalError };
}

function successResult<T>(data: T): CalendarEventResult<T> {
  return { success: true, data };
}

function errorResult<T>(error: CalendarEventError): CalendarEventResult<T> {
  return { success: false, error };
}

function readOnlyError<T>(): CalendarEventResult<T> {
  return errorResult(
    createError(
      'READONLY_MODE',
      'App is in read-only mode. Cannot modify calendar events.'
    )
  );
}

// === READ ===

export async function loadCalendarEvents(): Promise<
  CalendarEventResult<CalendarEvent[]>
> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CALENDAR_EVENTS);
    if (data === null) {
      return successResult([]);
    }
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        return errorResult(
          createError('PARSE_ERROR', 'Calendar events data is not an array')
        );
      }
      return successResult(parsed as CalendarEvent[]);
    } catch {
      return errorResult(
        createError('PARSE_ERROR', 'Failed to parse calendar events')
      );
    }
  } catch (error) {
    return errorResult(
      createError(
        'READ_ERROR',
        'Failed to read calendar events',
        error instanceof Error ? error : undefined
      )
    );
  }
}

// === CREATE ===

export async function addCalendarEvent(
  event: CalendarEvent
): Promise<CalendarEventResult<CalendarEvent>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  return calendarEventsQueue.enqueue(async () => {
    if (getReadOnlyMode()) {
      return readOnlyError<CalendarEvent>();
    }

    try {
      const result = await loadCalendarEvents();
      if (!result.success) {
        return errorResult<CalendarEvent>(result.error!);
      }

      const events = result.data ?? [];
      events.push(event);

      await AsyncStorage.setItem(
        STORAGE_KEYS.CALENDAR_EVENTS,
        JSON.stringify(events)
      );
      return successResult(event);
    } catch (error) {
      return errorResult<CalendarEvent>(
        createError(
          'WRITE_ERROR',
          'Failed to add calendar event',
          error instanceof Error ? error : undefined
        )
      );
    }
  });
}

// === UPDATE ===

export async function updateCalendarEvent(
  id: string,
  updates: UpdateCalendarEventInput & { updatedAt?: number },
  preValidator?: (existing: Readonly<CalendarEvent>) => string | null
): Promise<CalendarEventResult<CalendarEvent>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  return calendarEventsQueue.enqueue(async () => {
    if (getReadOnlyMode()) {
      return readOnlyError<CalendarEvent>();
    }

    try {
      const result = await loadCalendarEvents();
      if (!result.success) {
        return errorResult<CalendarEvent>(result.error!);
      }

      const events = result.data ?? [];
      const index = events.findIndex((e) => e.id === id);
      if (index === -1) {
        return errorResult<CalendarEvent>(
          createError('NOT_FOUND', `Calendar event not found: ${id}`)
        );
      }

      if (preValidator) {
        const validationMessage = preValidator({ ...events[index] });
        if (validationMessage) {
          return errorResult<CalendarEvent>(
            createError('VALIDATION_ERROR', validationMessage)
          );
        }
      }

      const updated: CalendarEvent = { ...events[index], ...updates };
      events[index] = updated;

      await AsyncStorage.setItem(
        STORAGE_KEYS.CALENDAR_EVENTS,
        JSON.stringify(events)
      );
      return successResult(updated);
    } catch (error) {
      return errorResult<CalendarEvent>(
        createError(
          'WRITE_ERROR',
          'Failed to update calendar event',
          error instanceof Error ? error : undefined
        )
      );
    }
  });
}

// === DELETE ===

export async function deleteCalendarEvent(
  id: string
): Promise<CalendarEventResult<void>> {
  if (getReadOnlyMode()) {
    return readOnlyError();
  }

  return calendarEventsQueue.enqueue(async () => {
    if (getReadOnlyMode()) {
      return readOnlyError<void>();
    }

    try {
      const result = await loadCalendarEvents();
      if (!result.success) {
        return errorResult<void>(result.error!);
      }

      const events = result.data ?? [];
      const filteredEvents = events.filter((e) => e.id !== id);

      if (filteredEvents.length === events.length) {
        return errorResult<void>(
          createError('NOT_FOUND', `Calendar event not found: ${id}`)
        );
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.CALENDAR_EVENTS,
        JSON.stringify(filteredEvents)
      );
      return successResult(undefined);
    } catch (error) {
      return errorResult<void>(
        createError(
          'WRITE_ERROR',
          'Failed to delete calendar event',
          error instanceof Error ? error : undefined
        )
      );
    }
  });
}
