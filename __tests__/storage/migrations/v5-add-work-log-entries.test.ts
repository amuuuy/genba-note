/**
 * Tests for v5-add-work-log-entries migration
 *
 * v5:
 * 1. Initializes empty work_log_entries collection
 * 2. Adds workLogEntryId: null to all existing CustomerPhoto records
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v5AddWorkLogEntriesMigration } from '@/storage/migrations/v5-add-work-log-entries';
import { STORAGE_KEYS } from '@/utils/constants';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('v5-add-work-log-entries migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should upgrade from version 4 to 5', () => {
      expect(v5AddWorkLogEntriesMigration.fromVersion).toBe(4);
      expect(v5AddWorkLogEntriesMigration.toVersion).toBe(5);
    });

    it('should have a description', () => {
      expect(v5AddWorkLogEntriesMigration.description).toBeTruthy();
      expect(typeof v5AddWorkLogEntriesMigration.description).toBe('string');
    });
  });

  describe('work_log_entries initialization', () => {
    it('should initialize WORK_LOG_ENTRIES to empty array', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await v5AddWorkLogEntriesMigration.migrate();

      expect(result.success).toBe(true);
      const entriesCalls = (AsyncStorage.setItem as jest.Mock).mock.calls.filter(
        (c: string[]) => c[0] === STORAGE_KEYS.WORK_LOG_ENTRIES
      );
      expect(entriesCalls).toHaveLength(1);
      expect(JSON.parse(entriesCalls[0][1])).toEqual([]);
    });
  });

  describe('photos migration', () => {
    it('should add workLogEntryId: null to existing photos', async () => {
      const photos = [
        {
          id: 'photo-1',
          customerId: 'cust-1',
          type: 'before',
          uri: '/path/to/photo.jpg',
          originalFilename: null,
          takenAt: 1000,
          createdAt: 1000,
        },
        {
          id: 'photo-2',
          customerId: 'cust-1',
          type: 'after',
          uri: '/path/to/photo2.jpg',
          originalFilename: null,
          takenAt: 2000,
          createdAt: 2000,
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.CUSTOMER_PHOTOS) return JSON.stringify(photos);
        return null;
      });

      const result = await v5AddWorkLogEntriesMigration.migrate();

      expect(result.success).toBe(true);
      const savedPhotos = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.CUSTOMER_PHOTOS
        )[1]
      );
      expect(savedPhotos).toHaveLength(2);
      expect(savedPhotos[0].workLogEntryId).toBeNull();
      expect(savedPhotos[1].workLogEntryId).toBeNull();
      // Original fields preserved
      expect(savedPhotos[0].id).toBe('photo-1');
      expect(savedPhotos[1].id).toBe('photo-2');
    });

    it('should reset workLogEntryId to null even if pre-existing (migration initializes all as undated)', async () => {
      // v5 migration deliberately sets all photos to undated (workLogEntryId: null).
      // Pre-v5 photos had no concept of work log entries, so any stale value
      // from data corruption should be normalized to null.
      const photos = [
        {
          id: 'photo-1',
          customerId: 'cust-1',
          type: 'before',
          uri: '/path/to/photo.jpg',
          originalFilename: null,
          takenAt: 1000,
          createdAt: 1000,
          workLogEntryId: 'entry-1', // stale/corrupt value
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.CUSTOMER_PHOTOS) return JSON.stringify(photos);
        return null;
      });

      const result = await v5AddWorkLogEntriesMigration.migrate();

      expect(result.success).toBe(true);
      const savedPhotos = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.CUSTOMER_PHOTOS
        )[1]
      );
      expect(savedPhotos[0].workLogEntryId).toBeNull();
    });
  });

  describe('no photos', () => {
    it('should succeed with empty migrated photos when no photos exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await v5AddWorkLogEntriesMigration.migrate();

      expect(result.success).toBe(true);
      const savedPhotos = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.CUSTOMER_PHOTOS
        )[1]
      );
      expect(savedPhotos).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should return error on failure', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await v5AddWorkLogEntriesMigration.migrate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('MIGRATION_FAILED');
      expect(result.error!.fromVersion).toBe(4);
      expect(result.error!.toVersion).toBe(5);
    });
  });
});
