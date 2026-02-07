/**
 * Tests for v8-add-calendar-events migration
 *
 * TDD approach: Write tests first, then implement to make them pass.
 *
 * v8 adds a CALENDAR_EVENTS storage key initialized to an empty array.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v8AddCalendarEventsMigration } from '@/storage/migrations/v8-add-calendar-events';
import { STORAGE_KEYS } from '@/utils/constants';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockedAsyncStorage = jest.mocked(AsyncStorage);

describe('v8-add-calendar-events migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('migration metadata', () => {
    it('should have correct version numbers', () => {
      expect(v8AddCalendarEventsMigration.fromVersion).toBe(7);
      expect(v8AddCalendarEventsMigration.toVersion).toBe(8);
    });

    it('should have a description', () => {
      expect(v8AddCalendarEventsMigration.description).toBeTruthy();
      expect(typeof v8AddCalendarEventsMigration.description).toBe('string');
    });
  });

  describe('calendar events initialization', () => {
    it('should initialize CALENDAR_EVENTS with empty array when key does not exist', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);
      mockedAsyncStorage.setItem.mockResolvedValue();

      const result = await v8AddCalendarEventsMigration.migrate();

      expect(result.success).toBe(true);

      const setItemCalls = mockedAsyncStorage.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEYS.CALENDAR_EVENTS
      );
      expect(setItemCalls).toHaveLength(1);
      expect(JSON.parse(setItemCalls[0][1])).toEqual([]);
    });

    it('should skip initialization when CALENDAR_EVENTS already exists', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([{ id: 'existing' }]));

      const result = await v8AddCalendarEventsMigration.migrate();

      expect(result.success).toBe(true);
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should return failure result on storage write error', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);
      mockedAsyncStorage.setItem.mockRejectedValue(
        new Error('Storage write error')
      );

      const result = await v8AddCalendarEventsMigration.migrate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('MIGRATION_FAILED');
      expect(result.error?.fromVersion).toBe(7);
      expect(result.error?.toVersion).toBe(8);
    });
  });
});
