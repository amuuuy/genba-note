/**
 * Tests for calendarService
 *
 * TDD approach: Write tests first, then implement to make them pass.
 *
 * Tests CRUD operations for CalendarEvent:
 * - createCalendarEvent: auto-generates id, createdAt, updatedAt
 * - updateCalendarEvent: updates fields and refreshes updatedAt
 * - deleteCalendarEvent: removes event from storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
} from '@/domain/calendar/calendarService';
import { STORAGE_KEYS } from '@/utils/constants';
import { createTestCalendarEvent } from './helpers';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock uuid to return deterministic values
jest.mock('@/utils/uuid', () => ({
  generateUUID: jest.fn(() => 'test-uuid-123'),
}));

// Mock read-only mode
jest.mock('@/storage/readOnlyModeState', () => ({
  getReadOnlyMode: jest.fn(() => false),
}));

const mockedAsyncStorage = jest.mocked(AsyncStorage);

describe('calendarService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCalendarEvent', () => {
    it('should create event with auto-generated id and timestamps', async () => {
      const now = 1700000000000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await createCalendarEvent({
        title: '現場打ち合わせ',
        date: '2026-02-15',
        type: 'appointment',
        color: '#007AFF',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe('test-uuid-123');
      expect(result.data!.title).toBe('現場打ち合わせ');
      expect(result.data!.date).toBe('2026-02-15');
      expect(result.data!.type).toBe('appointment');
      expect(result.data!.color).toBe('#007AFF');
      expect(result.data!.startTime).toBeNull();
      expect(result.data!.endTime).toBeNull();
      expect(result.data!.customerId).toBeNull();
      expect(result.data!.note).toBeNull();
      expect(result.data!.createdAt).toBe(now);
      expect(result.data!.updatedAt).toBe(now);

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should preserve optional fields when provided', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await createCalendarEvent({
        title: '打ち合わせ',
        date: '2026-02-20',
        startTime: '10:00',
        endTime: '11:30',
        type: 'schedule',
        color: '#FF9500',
        customerId: 'cust-001',
        note: 'メモ',
      });

      expect(result.success).toBe(true);
      expect(result.data!.startTime).toBe('10:00');
      expect(result.data!.endTime).toBe('11:30');
      expect(result.data!.customerId).toBe('cust-001');
      expect(result.data!.note).toBe('メモ');

      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('createCalendarEvent validation', () => {
    it('should reject empty title', async () => {
      const result = await createCalendarEvent({
        title: '   ',
        date: '2026-02-15',
        type: 'schedule',
        color: '#007AFF',
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('タイトル');
    });

    it('should reject invalid date format', async () => {
      const result = await createCalendarEvent({
        title: 'テスト',
        date: 'invalid',
        type: 'schedule',
        color: '#007AFF',
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('日付');
    });

    it('should reject invalid date (non-existent)', async () => {
      const result = await createCalendarEvent({
        title: 'テスト',
        date: '2026-02-30',
        type: 'schedule',
        color: '#007AFF',
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('日付');
    });

    it('should reject invalid start time', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      const result = await createCalendarEvent({
        title: 'テスト',
        date: '2026-02-15',
        startTime: '25:00',
        type: 'schedule',
        color: '#007AFF',
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('開始時間');
    });

    it('should reject end time before start time', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      const result = await createCalendarEvent({
        title: 'テスト',
        date: '2026-02-15',
        startTime: '14:00',
        endTime: '10:00',
        type: 'schedule',
        color: '#007AFF',
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('終了時間');
    });

    it('should reject endTime without startTime', async () => {
      const result = await createCalendarEvent({
        title: 'テスト',
        date: '2026-02-15',
        endTime: '17:00',
        type: 'schedule',
        color: '#007AFF',
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('開始時間');
    });

    it('should normalize empty string time to null on create', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await createCalendarEvent({
        title: 'テスト',
        date: '2026-02-15',
        startTime: '',
        endTime: '',
        type: 'schedule',
        color: '#007AFF',
      });

      expect(result.success).toBe(true);
      expect(result.data!.startTime).toBeNull();
      expect(result.data!.endTime).toBeNull();

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should normalize empty string time to null on update', async () => {
      const existing = createTestCalendarEvent({
        id: 'evt-001',
        startTime: '09:00',
        endTime: '17:00',
      });
      jest.spyOn(Date, 'now').mockReturnValue(1700000001000);
      mockedAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([existing])
      );
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await updateCalendarEvent('evt-001', {
        startTime: '',
        endTime: '',
      });

      expect(result.success).toBe(true);
      expect(result.data!.startTime).toBeNull();
      expect(result.data!.endTime).toBeNull();

      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('updateCalendarEvent', () => {
    it('should update specified fields and refresh updatedAt', async () => {
      const existing = createTestCalendarEvent({
        id: 'evt-001',
        title: '旧タイトル',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      });

      const newTime = 1700000001000;
      jest.spyOn(Date, 'now').mockReturnValue(newTime);
      mockedAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([existing])
      );
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await updateCalendarEvent('evt-001', {
        title: '新タイトル',
      });

      expect(result.success).toBe(true);
      expect(result.data!.title).toBe('新タイトル');
      expect(result.data!.updatedAt).toBe(newTime);
      expect(result.data!.createdAt).toBe(1700000000000); // preserved

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should return error when event not found', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await updateCalendarEvent('nonexistent', {
        title: 'test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject empty title on update', async () => {
      const result = await updateCalendarEvent('evt-001', {
        title: '',
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('タイトル');
    });

    it('should reject invalid date on update', async () => {
      const result = await updateCalendarEvent('evt-001', {
        date: 'bad-date',
      });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('日付');
    });

    it('should allow endTime-only update when existing event has startTime', async () => {
      const existing = createTestCalendarEvent({
        id: 'evt-001',
        startTime: '09:00',
        endTime: null,
      });
      jest.spyOn(Date, 'now').mockReturnValue(1700000001000);
      mockedAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([existing])
      );
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await updateCalendarEvent('evt-001', {
        endTime: '17:00',
      });

      expect(result.success).toBe(true);
      expect(result.data!.endTime).toBe('17:00');
      expect(result.data!.startTime).toBe('09:00');

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should reject endTime-only update when existing event has no startTime', async () => {
      const existing = createTestCalendarEvent({
        id: 'evt-001',
        startTime: null,
        endTime: null,
      });
      mockedAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([existing])
      );

      const result = await updateCalendarEvent('evt-001', {
        endTime: '17:00',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('開始時間');
    });

    it('should reject update that results in endTime before startTime', async () => {
      const existing = createTestCalendarEvent({
        id: 'evt-001',
        startTime: '14:00',
        endTime: '17:00',
      });
      mockedAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([existing])
      );

      const result = await updateCalendarEvent('evt-001', {
        endTime: '10:00',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('終了時間');
    });

    it('should load events only once (inside queue) during update', async () => {
      const existing = createTestCalendarEvent({
        id: 'evt-001',
        startTime: '09:00',
        endTime: '17:00',
      });
      jest.spyOn(Date, 'now').mockReturnValue(1700000001000);
      mockedAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([existing])
      );
      mockedAsyncStorage.setItem.mockResolvedValue();

      await updateCalendarEvent('evt-001', { endTime: '18:00' });

      // Should load only once (inside the queue), not twice
      const getItemCalls = mockedAsyncStorage.getItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEYS.CALENDAR_EVENTS
      );
      expect(getItemCalls).toHaveLength(1);

      jest.spyOn(Date, 'now').mockRestore();
    });
  });

  describe('deleteCalendarEvent', () => {
    it('should remove event from storage', async () => {
      const existing = createTestCalendarEvent({ id: 'evt-001' });
      mockedAsyncStorage.getItem.mockResolvedValue(
        JSON.stringify([existing])
      );
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await deleteCalendarEvent('evt-001');

      expect(result.success).toBe(true);

      // Verify the event was removed
      const setItemCalls = mockedAsyncStorage.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEYS.CALENDAR_EVENTS
      );
      expect(setItemCalls.length).toBeGreaterThan(0);
      const savedEvents = JSON.parse(
        setItemCalls[setItemCalls.length - 1][1]
      );
      expect(savedEvents).toHaveLength(0);
    });

    it('should return error when event not found', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await deleteCalendarEvent('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getCalendarEvents', () => {
    it('should return all calendar events', async () => {
      const events = [
        createTestCalendarEvent({ id: 'evt-001' }),
        createTestCalendarEvent({ id: 'evt-002' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(events));

      const result = await getCalendarEvents();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should return empty array when no events exist', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const result = await getCalendarEvents();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });
});
