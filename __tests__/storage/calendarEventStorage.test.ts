/**
 * Tests for calendarEventStorage
 *
 * TDD approach: Write tests first, then implement to make them pass.
 *
 * Tests AsyncStorage-based CRUD operations for CalendarEvent.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadCalendarEvents,
  addCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/storage/calendarEventStorage';
import { STORAGE_KEYS } from '@/utils/constants';
import { createTestCalendarEvent } from '../domain/calendar/helpers';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock read-only mode
const mockGetReadOnlyMode = jest.fn(() => false);
jest.mock('@/storage/readOnlyModeState', () => ({
  getReadOnlyMode: () => mockGetReadOnlyMode(),
}));

const mockedAsyncStorage = jest.mocked(AsyncStorage);

describe('calendarEventStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetReadOnlyMode.mockReturnValue(false);
  });

  describe('loadCalendarEvents', () => {
    it('should return empty array when storage is null', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const result = await loadCalendarEvents();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return parsed events from storage', async () => {
      const events = [
        createTestCalendarEvent({ id: 'evt-001' }),
        createTestCalendarEvent({ id: 'evt-002' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(events));

      const result = await loadCalendarEvents();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0].id).toBe('evt-001');
    });

    it('should return error on parse failure', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue('invalid json{{{');

      const result = await loadCalendarEvents();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PARSE_ERROR');
    });

    it('should return error on storage read failure', async () => {
      mockedAsyncStorage.getItem.mockRejectedValue(new Error('Read error'));

      const result = await loadCalendarEvents();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READ_ERROR');
    });
  });

  describe('addCalendarEvent', () => {
    it('should append event to existing array', async () => {
      const existing = [createTestCalendarEvent({ id: 'evt-001' })];
      const newEvent = createTestCalendarEvent({ id: 'evt-002' });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existing));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await addCalendarEvent(newEvent);

      expect(result.success).toBe(true);
      expect(result.data!.id).toBe('evt-002');

      const setItemCalls = mockedAsyncStorage.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEYS.CALENDAR_EVENTS
      );
      const savedEvents = JSON.parse(setItemCalls[setItemCalls.length - 1][1]);
      expect(savedEvents).toHaveLength(2);
    });

    it('should handle empty storage', async () => {
      const newEvent = createTestCalendarEvent({ id: 'evt-001' });
      mockedAsyncStorage.getItem.mockResolvedValue(null);
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await addCalendarEvent(newEvent);

      expect(result.success).toBe(true);
    });

    it('should return error in read-only mode', async () => {
      mockGetReadOnlyMode.mockReturnValue(true);
      const newEvent = createTestCalendarEvent();

      const result = await addCalendarEvent(newEvent);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
    });
  });

  describe('updateCalendarEvent', () => {
    it('should update specified fields', async () => {
      const existing = createTestCalendarEvent({
        id: 'evt-001',
        title: '旧タイトル',
      });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([existing]));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await updateCalendarEvent('evt-001', {
        title: '新タイトル',
        updatedAt: 9999999999999,
      });

      expect(result.success).toBe(true);
      expect(result.data!.title).toBe('新タイトル');
      expect(result.data!.id).toBe('evt-001');
    });

    it('should return error when event not found', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await updateCalendarEvent('nonexistent', {
        title: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should return error in read-only mode', async () => {
      mockGetReadOnlyMode.mockReturnValue(true);

      const result = await updateCalendarEvent('evt-001', { title: 'test' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
    });

    it('should call preValidator with existing event and abort on error', async () => {
      const existing = createTestCalendarEvent({
        id: 'evt-001',
        startTime: '09:00',
        endTime: '17:00',
      });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([existing]));

      const validator = jest.fn(() => '終了時間は開始時間以降にしてください');

      const result = await updateCalendarEvent(
        'evt-001',
        { endTime: '08:00', updatedAt: 9999999999999 },
        validator
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(validator).toHaveBeenCalledWith(existing);
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should proceed when preValidator returns null', async () => {
      const existing = createTestCalendarEvent({
        id: 'evt-001',
        startTime: '09:00',
        endTime: '17:00',
      });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([existing]));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const validator = jest.fn(() => null);

      const result = await updateCalendarEvent(
        'evt-001',
        { endTime: '18:00', updatedAt: 9999999999999 },
        validator
      );

      expect(result.success).toBe(true);
      expect(validator).toHaveBeenCalledWith(existing);
    });
  });

  describe('deleteCalendarEvent', () => {
    it('should remove event from storage', async () => {
      const events = [
        createTestCalendarEvent({ id: 'evt-001' }),
        createTestCalendarEvent({ id: 'evt-002' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(events));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await deleteCalendarEvent('evt-001');

      expect(result.success).toBe(true);

      const setItemCalls = mockedAsyncStorage.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEYS.CALENDAR_EVENTS
      );
      const savedEvents = JSON.parse(setItemCalls[setItemCalls.length - 1][1]);
      expect(savedEvents).toHaveLength(1);
      expect(savedEvents[0].id).toBe('evt-002');
    });

    it('should return error when event not found', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await deleteCalendarEvent('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should return error in read-only mode', async () => {
      mockGetReadOnlyMode.mockReturnValue(true);

      const result = await deleteCalendarEvent('evt-001');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
    });
  });
});
