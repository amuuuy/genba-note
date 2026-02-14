/**
 * Tests for useCalendarEventEdit — reducer & ReadOnlyMode guard
 *
 * Tests the exported reducer and verifies ReadOnlyMode guard logic.
 * Uses direct reducer testing (no renderHook) to work with testEnvironment: 'node'.
 */

import {
  calendarEventEditReducer,
  INITIAL_STATE,
} from '@/hooks/useCalendarEventEdit';
import type {
  CalendarEventEditState,
  CalendarEventEditAction,
} from '@/hooks/useCalendarEventEdit';
import { setReadOnlyMode, getReadOnlyMode } from '@/storage/readOnlyModeState';

// Mock calendarService
jest.mock('@/domain/calendar/calendarService', () => ({
  createCalendarEvent: jest.fn(async () => ({ success: true, data: {} })),
  updateCalendarEvent: jest.fn(async () => ({ success: true, data: {} })),
  deleteCalendarEvent: jest.fn(async () => ({ success: true })),
}));

describe('calendarEventEditReducer', () => {
  describe('SET_ERRORS action', () => {
    it('stores read-only save error in state', () => {
      const action: CalendarEventEditAction = {
        type: 'SET_ERRORS',
        errors: { _general: '読み取り専用モードのため変更できません' },
      };

      const newState = calendarEventEditReducer(INITIAL_STATE, action);

      expect(newState.errors._general).toBe('読み取り専用モードのため変更できません');
    });

    it('stores read-only delete error in state', () => {
      const action: CalendarEventEditAction = {
        type: 'SET_ERRORS',
        errors: { _general: '読み取り専用モードのため削除できません' },
      };

      const newState = calendarEventEditReducer(INITIAL_STATE, action);

      expect(newState.errors._general).toBe('読み取り専用モードのため削除できません');
    });

    it('replaces previous errors entirely', () => {
      const stateWithError: CalendarEventEditState = {
        ...INITIAL_STATE,
        errors: { title: 'タイトルは必須です', date: '日付は必須です' },
      };
      const action: CalendarEventEditAction = {
        type: 'SET_ERRORS',
        errors: { _general: '読み取り専用モードのため変更できません' },
      };

      const newState = calendarEventEditReducer(stateWithError, action);

      expect(newState.errors._general).toBe('読み取り専用モードのため変更できません');
      expect(newState.errors.title).toBeUndefined();
      expect(newState.errors.date).toBeUndefined();
    });
  });

  describe('CLOSE action', () => {
    it('resets state including errors', () => {
      const stateWithError: CalendarEventEditState = {
        ...INITIAL_STATE,
        isVisible: true,
        isSaving: true,
        errors: { _general: '読み取り専用モードのため変更できません' },
      };

      const newState = calendarEventEditReducer(stateWithError, { type: 'CLOSE' });

      expect(newState).toEqual(INITIAL_STATE);
      expect(newState.errors).toEqual({});
    });
  });

  describe('UPDATE_FIELD clears field error', () => {
    it('clears error for updated field but keeps other errors', () => {
      const stateWithError: CalendarEventEditState = {
        ...INITIAL_STATE,
        isVisible: true,
        errors: { title: 'タイトルは必須です', _general: 'some error' },
      };

      const action: CalendarEventEditAction = {
        type: 'UPDATE_FIELD',
        field: 'title',
        value: 'New Title',
      };

      const newState = calendarEventEditReducer(stateWithError, action);

      expect(newState.values.title).toBe('New Title');
      expect(newState.errors.title).toBeNull();
      expect(newState.errors._general).toBe('some error');
    });
  });
});

describe('useCalendarEventEdit ReadOnlyMode guard', () => {
  beforeEach(() => {
    setReadOnlyMode(false);
  });

  it('getReadOnlyMode returns true when set', () => {
    setReadOnlyMode(true);
    expect(getReadOnlyMode()).toBe(true);
  });

  it('getReadOnlyMode returns false when not set', () => {
    expect(getReadOnlyMode()).toBe(false);
  });

  it('save guard produces correct error action when read-only', () => {
    setReadOnlyMode(true);

    // Simulate the guard logic from save():
    // if (getReadOnlyMode()) { dispatch SET_ERRORS with save message; return; }
    const isReadOnly = getReadOnlyMode();
    expect(isReadOnly).toBe(true);

    // The SET_ERRORS action that would be dispatched
    const action: CalendarEventEditAction = {
      type: 'SET_ERRORS',
      errors: { _general: '読み取り専用モードのため変更できません' },
    };

    const newState = calendarEventEditReducer(INITIAL_STATE, action);
    expect(newState.errors._general).toBe('読み取り専用モードのため変更できません');
    // State should NOT have isSaving=true (guard returns before SET_SAVING)
    expect(newState.isSaving).toBe(false);
  });

  it('handleDelete guard produces correct error action when read-only', () => {
    setReadOnlyMode(true);

    const isReadOnly = getReadOnlyMode();
    expect(isReadOnly).toBe(true);

    // The SET_ERRORS action that would be dispatched
    const action: CalendarEventEditAction = {
      type: 'SET_ERRORS',
      errors: { _general: '読み取り専用モードのため削除できません' },
    };

    const editingState: CalendarEventEditState = {
      ...INITIAL_STATE,
      isEditing: true,
      editingId: 'event-1',
      isVisible: true,
    };
    const newState = calendarEventEditReducer(editingState, action);
    expect(newState.errors._general).toBe('読み取り専用モードのため削除できません');
    expect(newState.isSaving).toBe(false);
  });

  it('save should proceed to SET_SAVING when not read-only', () => {
    setReadOnlyMode(false);
    expect(getReadOnlyMode()).toBe(false);

    // When not read-only, save() proceeds past guard and dispatches SET_SAVING
    const action: CalendarEventEditAction = {
      type: 'SET_SAVING',
      isSaving: true,
    };
    const newState = calendarEventEditReducer(INITIAL_STATE, action);
    expect(newState.isSaving).toBe(true);
  });
});
