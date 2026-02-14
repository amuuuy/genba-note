/**
 * useCalendarEventEdit Hook
 *
 * Manages create/edit form state for CalendarEvent.
 * Uses useReducer for complex form state management.
 */

import { useReducer, useCallback } from 'react';
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/domain/calendar/calendarService';
import { isValidDateFormat } from '@/utils/dateUtils';
import { getReadOnlyMode } from '@/storage/readOnlyModeState';
import type {
  CalendarEvent,
  CalendarEventType,
} from '@/types/calendarEvent';

// === State (exported for testing) ===

export interface CalendarEventFormValues {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: CalendarEventType;
  color: string;
  customerId: string | null;
  note: string;
}

export interface CalendarEventEditState {
  values: CalendarEventFormValues;
  isEditing: boolean;
  editingId: string | null;
  isVisible: boolean;
  isSaving: boolean;
  errors: Record<string, string | null>;
}

const DEFAULT_VALUES: CalendarEventFormValues = {
  title: '',
  date: '',
  startTime: '',
  endTime: '',
  type: 'schedule',
  color: '#007AFF',
  customerId: null,
  note: '',
};

export const INITIAL_STATE: CalendarEventEditState = {
  values: DEFAULT_VALUES,
  isEditing: false,
  editingId: null,
  isVisible: false,
  isSaving: false,
  errors: {},
};

// === Actions (exported for testing) ===

export type CalendarEventEditAction =
  | { type: 'START_CREATE'; date?: string }
  | { type: 'START_EDIT'; event: CalendarEvent }
  | { type: 'UPDATE_FIELD'; field: keyof CalendarEventFormValues; value: string | null }
  | { type: 'SET_SAVING'; isSaving: boolean }
  | { type: 'SET_ERRORS'; errors: Record<string, string | null> }
  | { type: 'CLOSE' };

export function calendarEventEditReducer(state: CalendarEventEditState, action: CalendarEventEditAction): CalendarEventEditState {
  switch (action.type) {
    case 'START_CREATE':
      return {
        ...INITIAL_STATE,
        isVisible: true,
        values: {
          ...DEFAULT_VALUES,
          date: action.date ?? '',
        },
      };
    case 'START_EDIT':
      return {
        ...state,
        isVisible: true,
        isEditing: true,
        editingId: action.event.id,
        values: {
          title: action.event.title,
          date: action.event.date,
          startTime: action.event.startTime ?? '',
          endTime: action.event.endTime ?? '',
          type: action.event.type,
          color: action.event.color,
          customerId: action.event.customerId,
          note: action.event.note ?? '',
        },
        errors: {},
      };
    case 'UPDATE_FIELD':
      return {
        ...state,
        values: {
          ...state.values,
          [action.field]: action.value,
        },
        errors: {
          ...state.errors,
          [action.field]: null, // Clear error on field change
        },
      };
    case 'SET_SAVING':
      return { ...state, isSaving: action.isSaving };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'CLOSE':
      return INITIAL_STATE;
    default:
      return state;
  }
}

// === Hook ===

export function useCalendarEventEdit(onSuccess?: () => void) {
  const [state, dispatch] = useReducer(calendarEventEditReducer, INITIAL_STATE);

  const startCreate = useCallback((date?: string) => {
    dispatch({ type: 'START_CREATE', date });
  }, []);

  const startEdit = useCallback((event: CalendarEvent) => {
    dispatch({ type: 'START_EDIT', event });
  }, []);

  const updateField = useCallback(
    (field: keyof CalendarEventFormValues, value: string | null) => {
      dispatch({ type: 'UPDATE_FIELD', field, value });
    },
    []
  );

  const close = useCallback(() => {
    dispatch({ type: 'CLOSE' });
  }, []);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string | null> = {};
    if (!state.values.title.trim()) {
      errors.title = 'タイトルは必須です';
    }
    if (!state.values.date) {
      errors.date = '日付は必須です';
    } else if (!isValidDateFormat(state.values.date)) {
      errors.date = '日付の形式が正しくありません（YYYY-MM-DD）';
    }
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors });
      return false;
    }
    return true;
  }, [state.values]);

  const save = useCallback(async () => {
    if (getReadOnlyMode()) {
      dispatch({
        type: 'SET_ERRORS',
        errors: { _general: '読み取り専用モードのため変更できません' },
      });
      return;
    }
    if (!validate()) return;

    dispatch({ type: 'SET_SAVING', isSaving: true });

    try {
      const { values, isEditing, editingId } = state;

      if (isEditing && editingId) {
        const result = await updateCalendarEvent(editingId, {
          title: values.title.trim(),
          date: values.date,
          startTime: values.startTime || null,
          endTime: values.endTime || null,
          type: values.type,
          color: values.color,
          customerId: values.customerId,
          note: values.note || null,
        });
        if (!result.success) {
          dispatch({
            type: 'SET_ERRORS',
            errors: { _general: result.error?.message ?? '保存に失敗しました' },
          });
          return;
        }
      } else {
        const result = await createCalendarEvent({
          title: values.title.trim(),
          date: values.date,
          startTime: values.startTime || null,
          endTime: values.endTime || null,
          type: values.type,
          color: values.color,
          customerId: values.customerId,
          note: values.note || null,
        });
        if (!result.success) {
          dispatch({
            type: 'SET_ERRORS',
            errors: { _general: result.error?.message ?? '保存に失敗しました' },
          });
          return;
        }
      }

      dispatch({ type: 'CLOSE' });
      onSuccess?.();
    } finally {
      dispatch({ type: 'SET_SAVING', isSaving: false });
    }
  }, [state, validate, onSuccess]);

  const handleDelete = useCallback(async () => {
    if (getReadOnlyMode()) {
      dispatch({
        type: 'SET_ERRORS',
        errors: { _general: '読み取り専用モードのため削除できません' },
      });
      return;
    }
    if (!state.editingId) return;

    dispatch({ type: 'SET_SAVING', isSaving: true });

    try {
      const result = await deleteCalendarEvent(state.editingId);
      if (!result.success) {
        dispatch({
          type: 'SET_ERRORS',
          errors: { _general: result.error?.message ?? '削除に失敗しました' },
        });
        return;
      }

      dispatch({ type: 'CLOSE' });
      onSuccess?.();
    } finally {
      dispatch({ type: 'SET_SAVING', isSaving: false });
    }
  }, [state.editingId, onSuccess]);

  return {
    ...state,
    startCreate,
    startEdit,
    updateField,
    save,
    handleDelete,
    close,
  };
}
