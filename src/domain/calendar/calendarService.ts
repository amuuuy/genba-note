/**
 * Calendar Service
 *
 * CRUD operations for CalendarEvent with auto-generated id and timestamps.
 * Wraps calendarEventStorage with business logic.
 * Input validation is enforced here (domain boundary).
 */

import { generateUUID } from '@/utils/uuid';
import { isValidDateString } from '@/utils/dateUtils';
import {
  loadCalendarEvents,
  addCalendarEvent as addToStorage,
  updateCalendarEvent as updateInStorage,
  deleteCalendarEvent as deleteFromStorage,
  type CalendarEventResult,
} from '@/storage/calendarEventStorage';
import type {
  CalendarEvent,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '@/types/calendarEvent';

export type { CalendarEventResult };

// === Helpers ===

/** Normalize empty string to null for optional time fields */
function normalizeTime(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value === '') return null;
  return value;
}

// === Validation ===

const TIME_PATTERN = /^\d{2}:\d{2}$/;

function isValidTime(time: string): boolean {
  if (!TIME_PATTERN.test(time)) return false;
  const [h, m] = time.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function validationError<T>(message: string): CalendarEventResult<T> {
  return {
    success: false,
    error: { code: 'WRITE_ERROR', message },
  };
}

/**
 * Validate individual field formats (does not check cross-field constraints).
 */
function validateFieldFormats(fields: {
  title?: string;
  date?: string;
  startTime?: string | null;
  endTime?: string | null;
}): string | null {
  if (fields.title !== undefined && !fields.title.trim()) {
    return 'タイトルは必須です';
  }
  if (fields.date !== undefined && !isValidDateString(fields.date)) {
    return '日付の形式が正しくありません（YYYY-MM-DD）';
  }
  if (fields.startTime !== undefined && fields.startTime !== null && !isValidTime(fields.startTime)) {
    return '開始時間の形式が正しくありません（HH:MM）';
  }
  if (fields.endTime !== undefined && fields.endTime !== null && !isValidTime(fields.endTime)) {
    return '終了時間の形式が正しくありません（HH:MM）';
  }
  return null;
}

/**
 * Validate cross-field time constraints on the resolved (merged) state.
 */
function validateTimeConstraints(
  startTime: string | null,
  endTime: string | null
): string | null {
  if (endTime && !startTime) {
    return '終了時間を設定する場合は開始時間も設定してください';
  }
  if (startTime && endTime && startTime > endTime) {
    return '終了時間は開始時間以降にしてください';
  }
  return null;
}

// === CRUD ===

/**
 * Create a new CalendarEvent with auto-generated id and timestamps.
 */
export async function createCalendarEvent(
  input: CreateCalendarEventInput
): Promise<CalendarEventResult<CalendarEvent>> {
  // Normalize empty strings to null at domain boundary
  const startTime = normalizeTime(input.startTime);
  const endTime = normalizeTime(input.endTime);

  const formatError = validateFieldFormats({
    title: input.title,
    date: input.date,
    startTime,
    endTime,
  });
  if (formatError) return validationError(formatError);

  const timeError = validateTimeConstraints(startTime, endTime);
  if (timeError) return validationError(timeError);

  const now = Date.now();
  const event: CalendarEvent = {
    id: generateUUID(),
    title: input.title,
    date: input.date,
    startTime,
    endTime,
    type: input.type,
    color: input.color,
    customerId: input.customerId ?? null,
    note: input.note ?? null,
    createdAt: now,
    updatedAt: now,
  };

  return addToStorage(event);
}

/**
 * Update an existing CalendarEvent. Only specified fields are updated.
 * updatedAt is automatically refreshed.
 */
export async function updateCalendarEvent(
  id: string,
  input: UpdateCalendarEventInput
): Promise<CalendarEventResult<CalendarEvent>> {
  // Normalize empty strings to null at domain boundary
  const normalizedInput = { ...input };
  if (normalizedInput.startTime !== undefined) {
    normalizedInput.startTime = normalizeTime(normalizedInput.startTime);
  }
  if (normalizedInput.endTime !== undefined) {
    normalizedInput.endTime = normalizeTime(normalizedInput.endTime);
  }

  // Validate individual field formats first (no need to fetch existing event)
  const formatError = validateFieldFormats({
    title: normalizedInput.title,
    date: normalizedInput.date,
    startTime: normalizedInput.startTime,
    endTime: normalizedInput.endTime,
  });
  if (formatError) return validationError(formatError);

  // Cross-field validation runs inside the queue via preValidator
  // to ensure it uses the latest state (prevents race conditions).
  const preValidator = (existing: Readonly<CalendarEvent>): string | null => {
    const mergedStartTime = normalizedInput.startTime !== undefined
      ? normalizedInput.startTime
      : existing.startTime;
    const mergedEndTime = normalizedInput.endTime !== undefined
      ? normalizedInput.endTime
      : existing.endTime;
    return validateTimeConstraints(mergedStartTime, mergedEndTime);
  };

  return updateInStorage(id, { ...normalizedInput, updatedAt: Date.now() }, preValidator);
}

/**
 * Delete a CalendarEvent by id.
 */
export async function deleteCalendarEvent(
  id: string
): Promise<CalendarEventResult<void>> {
  return deleteFromStorage(id);
}

/**
 * Get all CalendarEvents.
 */
export async function getCalendarEvents(): Promise<
  CalendarEventResult<CalendarEvent[]>
> {
  return loadCalendarEvents();
}
