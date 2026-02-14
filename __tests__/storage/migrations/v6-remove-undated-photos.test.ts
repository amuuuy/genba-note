/**
 * Tests for v6-remove-undated-photos migration
 *
 * v6:
 * 1. Removes orphaned photos (referencing non-existent work log entries)
 * 2. Keeps photos with workLogEntryId = null (unassigned, set by v5)
 * 3. Keeps photos with valid workLogEntryId
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import {
  v6RemoveUndatedPhotosMigration,
  cleanupOrphanedPhotos,
} from '@/storage/migrations/v6-remove-undated-photos';
import { STORAGE_KEYS } from '@/utils/constants';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(async () => ({ exists: true })),
  deleteAsync: jest.fn(async () => {}),
}));

// Mock writeQueue — photosQueue.enqueue should just execute the callback
jest.mock('@/utils/writeQueue', () => ({
  photosQueue: {
    enqueue: jest.fn(async <T>(fn: () => Promise<T>): Promise<T> => fn()),
  },
}));

describe('v6-remove-undated-photos migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should upgrade from version 5 to 6', () => {
      expect(v6RemoveUndatedPhotosMigration.fromVersion).toBe(5);
      expect(v6RemoveUndatedPhotosMigration.toVersion).toBe(6);
    });

    it('should have a description', () => {
      expect(v6RemoveUndatedPhotosMigration.description).toBeTruthy();
      expect(typeof v6RemoveUndatedPhotosMigration.description).toBe('string');
    });
  });

  describe('cleanupOrphanedPhotos', () => {
    it('should NOT delete photos with workLogEntryId === null (unassigned)', async () => {
      const photos = [
        {
          id: 'photo-1',
          customerId: 'cust-1',
          type: 'before',
          uri: '/path/to/photo1.jpg',
          originalFilename: null,
          takenAt: 1000,
          createdAt: 1000,
          workLogEntryId: null,
        },
        {
          id: 'photo-2',
          customerId: 'cust-1',
          type: 'after',
          uri: '/path/to/photo2.jpg',
          originalFilename: null,
          takenAt: 2000,
          createdAt: 2000,
          workLogEntryId: null,
        },
      ];
      const entries: unknown[] = [];

      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.CUSTOMER_PHOTOS) return JSON.stringify(photos);
        if (key === STORAGE_KEYS.WORK_LOG_ENTRIES) return JSON.stringify(entries);
        return null;
      });

      const result = await cleanupOrphanedPhotos();

      expect(result.deleted).toBe(0);
      expect(FileSystem.deleteAsync).not.toHaveBeenCalled();

      // Photos should be preserved in storage
      const savedPhotos = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.CUSTOMER_PHOTOS
        )[1]
      );
      expect(savedPhotos).toHaveLength(2);
      expect(savedPhotos[0].id).toBe('photo-1');
      expect(savedPhotos[1].id).toBe('photo-2');
    });

    it('should delete photos referencing non-existent entries (truly orphaned)', async () => {
      const photos = [
        {
          id: 'photo-orphan',
          customerId: 'cust-1',
          type: 'before',
          uri: '/path/to/orphan.jpg',
          originalFilename: null,
          takenAt: 1000,
          createdAt: 1000,
          workLogEntryId: 'deleted-entry-id',
        },
      ];
      const entries = [
        { id: 'existing-entry-id', customerId: 'cust-1', date: '2024-01-01', notes: '' },
      ];

      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.CUSTOMER_PHOTOS) return JSON.stringify(photos);
        if (key === STORAGE_KEYS.WORK_LOG_ENTRIES) return JSON.stringify(entries);
        return null;
      });

      const result = await cleanupOrphanedPhotos();

      expect(result.deleted).toBe(1);
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith('/path/to/orphan.jpg', {
        idempotent: true,
      });

      const savedPhotos = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.CUSTOMER_PHOTOS
        )[1]
      );
      expect(savedPhotos).toHaveLength(0);
    });

    it('should keep photos with valid workLogEntryId', async () => {
      const photos = [
        {
          id: 'photo-valid',
          customerId: 'cust-1',
          type: 'before',
          uri: '/path/to/valid.jpg',
          originalFilename: null,
          takenAt: 1000,
          createdAt: 1000,
          workLogEntryId: 'entry-1',
        },
      ];
      const entries = [
        { id: 'entry-1', customerId: 'cust-1', date: '2024-01-01', notes: '' },
      ];

      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.CUSTOMER_PHOTOS) return JSON.stringify(photos);
        if (key === STORAGE_KEYS.WORK_LOG_ENTRIES) return JSON.stringify(entries);
        return null;
      });

      const result = await cleanupOrphanedPhotos();

      expect(result.deleted).toBe(0);
      expect(FileSystem.deleteAsync).not.toHaveBeenCalled();

      const savedPhotos = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.CUSTOMER_PHOTOS
        )[1]
      );
      expect(savedPhotos).toHaveLength(1);
      expect(savedPhotos[0].id).toBe('photo-valid');
    });

    it('should handle mix of null, valid, and orphaned photos correctly', async () => {
      const photos = [
        {
          id: 'photo-null',
          customerId: 'cust-1',
          type: 'before',
          uri: '/path/to/null.jpg',
          originalFilename: null,
          takenAt: 1000,
          createdAt: 1000,
          workLogEntryId: null,
        },
        {
          id: 'photo-valid',
          customerId: 'cust-1',
          type: 'after',
          uri: '/path/to/valid.jpg',
          originalFilename: null,
          takenAt: 2000,
          createdAt: 2000,
          workLogEntryId: 'entry-1',
        },
        {
          id: 'photo-orphan',
          customerId: 'cust-1',
          type: 'before',
          uri: '/path/to/orphan.jpg',
          originalFilename: null,
          takenAt: 3000,
          createdAt: 3000,
          workLogEntryId: 'deleted-entry',
        },
      ];
      const entries = [
        { id: 'entry-1', customerId: 'cust-1', date: '2024-01-01', notes: '' },
      ];

      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.CUSTOMER_PHOTOS) return JSON.stringify(photos);
        if (key === STORAGE_KEYS.WORK_LOG_ENTRIES) return JSON.stringify(entries);
        return null;
      });

      const result = await cleanupOrphanedPhotos();

      // Only orphan deleted, null and valid kept
      expect(result.deleted).toBe(1);
      expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(1);
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith('/path/to/orphan.jpg', {
        idempotent: true,
      });

      const savedPhotos = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.CUSTOMER_PHOTOS
        )[1]
      );
      expect(savedPhotos).toHaveLength(2);
      expect(savedPhotos.map((p: { id: string }) => p.id)).toEqual(['photo-null', 'photo-valid']);
    });

    it('should succeed with empty photos', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await cleanupOrphanedPhotos();

      expect(result.deleted).toBe(0);
    });

    it('should keep photo metadata when file deletion fails', async () => {
      const photos = [
        {
          id: 'photo-orphan',
          customerId: 'cust-1',
          type: 'before',
          uri: '/path/to/orphan.jpg',
          originalFilename: null,
          takenAt: 1000,
          createdAt: 1000,
          workLogEntryId: 'deleted-entry',
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.CUSTOMER_PHOTOS) return JSON.stringify(photos);
        if (key === STORAGE_KEYS.WORK_LOG_ENTRIES) return JSON.stringify([]);
        return null;
      });
      (FileSystem.deleteAsync as jest.Mock).mockRejectedValue(new Error('FS error'));

      const result = await cleanupOrphanedPhotos();

      // File deletion failed, so photo metadata kept for retry
      expect(result.deleted).toBe(0);
      const savedPhotos = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: string[]) => c[0] === STORAGE_KEYS.CUSTOMER_PHOTOS
        )[1]
      );
      expect(savedPhotos).toHaveLength(1);
      expect(savedPhotos[0].id).toBe('photo-orphan');
    });
  });

  describe('migration wrapper', () => {
    it('should return success when cleanup succeeds', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await v6RemoveUndatedPhotosMigration.migrate();

      expect(result.success).toBe(true);
    });

    it('should return error on failure', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await v6RemoveUndatedPhotosMigration.migrate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('MIGRATION_FAILED');
      expect(result.error!.fromVersion).toBe(5);
      expect(result.error!.toVersion).toBe(6);
    });
  });
});
