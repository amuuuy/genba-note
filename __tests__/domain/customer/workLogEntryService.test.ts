/**
 * Tests for workLogEntryService.ts
 * ReadOnly mode guard tests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createWorkLogEntry,
  updateWorkLogEntry,
  deleteWorkLogEntry,
  deleteWorkLogEntryOnly,
  deleteWorkLogEntriesByCustomer,
} from '@/domain/customer/workLogEntryService';
import { setReadOnlyMode } from '@/storage/readOnlyModeState';
import { workLogEntriesQueue, photosQueue } from '@/utils/writeQueue';
import { STORAGE_KEYS } from '@/utils/constants';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock uuid
jest.mock('@/utils/uuid', () => ({
  generateUUID: jest.fn(() => 'test-entry-uuid'),
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

const mockedAsyncStorage = jest.mocked(AsyncStorage);

describe('workLogEntryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setReadOnlyMode(false);
  });

  describe('Date validation', () => {
    beforeEach(() => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    });

    it('should reject non-existent date 2026-02-31', async () => {
      const result = await createWorkLogEntry({
        customerId: 'customer-1',
        workDate: '2026-02-31',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should reject 2025-02-29 (non-leap year)', async () => {
      const result = await createWorkLogEntry({
        customerId: 'customer-1',
        workDate: '2025-02-29',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should accept 2024-02-29 (leap year)', async () => {
      const result = await createWorkLogEntry({
        customerId: 'customer-1',
        workDate: '2024-02-29',
      });

      expect(result.success).toBe(true);
    });

    it('should accept valid date 2026-01-30', async () => {
      const result = await createWorkLogEntry({
        customerId: 'customer-1',
        workDate: '2026-01-30',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Read-only mode', () => {
    it('should block createWorkLogEntry in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await createWorkLogEntry({
        customerId: 'customer-1',
        workDate: '2026-01-30',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should block updateWorkLogEntry in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await updateWorkLogEntry('entry-1', { note: 'Updated' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should block deleteWorkLogEntry in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await deleteWorkLogEntry('entry-1');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should block deleteWorkLogEntryOnly in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await deleteWorkLogEntryOnly('entry-1');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should block deleteWorkLogEntriesByCustomer in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await deleteWorkLogEntriesByCustomer('customer-1');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('deleteWorkLogEntriesByCustomer photo cascade', () => {
    const FileSystem = require('expo-file-system');

    beforeEach(() => {
      FileSystem.getInfoAsync.mockResolvedValue({ exists: true });
      FileSystem.deleteAsync.mockResolvedValue(undefined);
    });

    it('should delete photo files for entries being removed', async () => {
      const entries = [
        { id: 'entry-1', customerId: 'cust-1', workDate: '2026-01-01', note: null, createdAt: 1000, updatedAt: 1000 },
        { id: 'entry-2', customerId: 'cust-1', workDate: '2026-01-02', note: null, createdAt: 2000, updatedAt: 2000 },
        { id: 'entry-3', customerId: 'cust-2', workDate: '2026-01-01', note: null, createdAt: 3000, updatedAt: 3000 },
      ];
      const photos = [
        { id: 'photo-1', customerId: 'cust-1', workLogEntryId: 'entry-1', type: 'before', uri: 'file:///photos/p1.jpg', createdAt: 1000, updatedAt: 1000 },
        { id: 'photo-2', customerId: 'cust-1', workLogEntryId: 'entry-2', type: 'after', uri: 'file:///photos/p2.jpg', createdAt: 2000, updatedAt: 2000 },
        { id: 'photo-3', customerId: 'cust-2', workLogEntryId: 'entry-3', type: 'before', uri: 'file:///photos/p3.jpg', createdAt: 3000, updatedAt: 3000 },
      ];

      mockedAsyncStorage.getItem.mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.WORK_LOG_ENTRIES) return JSON.stringify(entries);
        if (key === STORAGE_KEYS.CUSTOMER_PHOTOS) return JSON.stringify(photos);
        return null;
      });
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await deleteWorkLogEntriesByCustomer('cust-1');

      expect(result.success).toBe(true);

      // Should delete photo files for cust-1 entries only
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///photos/p1.jpg', { idempotent: true });
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///photos/p2.jpg', { idempotent: true });
      expect(FileSystem.deleteAsync).not.toHaveBeenCalledWith('file:///photos/p3.jpg', expect.anything());
    });

    it('should remove photo metadata for deleted entries', async () => {
      const entries = [
        { id: 'entry-1', customerId: 'cust-1', workDate: '2026-01-01', note: null, createdAt: 1000, updatedAt: 1000 },
      ];
      const photos = [
        { id: 'photo-1', customerId: 'cust-1', workLogEntryId: 'entry-1', type: 'before', uri: 'file:///photos/p1.jpg', createdAt: 1000, updatedAt: 1000 },
        { id: 'photo-other', customerId: 'cust-2', workLogEntryId: 'entry-other', type: 'before', uri: 'file:///photos/other.jpg', createdAt: 2000, updatedAt: 2000 },
      ];

      mockedAsyncStorage.getItem.mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.WORK_LOG_ENTRIES) return JSON.stringify(entries);
        if (key === STORAGE_KEYS.CUSTOMER_PHOTOS) return JSON.stringify(photos);
        return null;
      });
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);

      await deleteWorkLogEntriesByCustomer('cust-1');

      // Check photo metadata was updated
      const photosSetCall = mockedAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEYS.CUSTOMER_PHOTOS
      );
      expect(photosSetCall).toBeDefined();
      const remainingPhotos = JSON.parse(photosSetCall![1]);
      expect(remainingPhotos).toHaveLength(1);
      expect(remainingPhotos[0].id).toBe('photo-other');
    });

    it('should succeed even if photo file deletion fails', async () => {
      const entries = [
        { id: 'entry-1', customerId: 'cust-1', workDate: '2026-01-01', note: null, createdAt: 1000, updatedAt: 1000 },
      ];
      const photos = [
        { id: 'photo-1', customerId: 'cust-1', workLogEntryId: 'entry-1', type: 'before', uri: 'file:///photos/p1.jpg', createdAt: 1000, updatedAt: 1000 },
      ];

      mockedAsyncStorage.getItem.mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.WORK_LOG_ENTRIES) return JSON.stringify(entries);
        if (key === STORAGE_KEYS.CUSTOMER_PHOTOS) return JSON.stringify(photos);
        return null;
      });
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);
      FileSystem.deleteAsync.mockRejectedValue(new Error('FS error'));
      jest.spyOn(console, 'warn').mockImplementation();

      const result = await deleteWorkLogEntriesByCustomer('cust-1');

      expect(result.success).toBe(true);

      // Photo metadata should be kept for retry when file deletion fails
      const photosSetCall = mockedAsyncStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEYS.CUSTOMER_PHOTOS
      );
      expect(photosSetCall).toBeDefined();
      const remainingPhotos = JSON.parse(photosSetCall![1]);
      expect(remainingPhotos).toHaveLength(1);
      expect(remainingPhotos[0].id).toBe('photo-1');
    });

    it('should handle no photos gracefully', async () => {
      const entries = [
        { id: 'entry-1', customerId: 'cust-1', workDate: '2026-01-01', note: null, createdAt: 1000, updatedAt: 1000 },
      ];

      mockedAsyncStorage.getItem.mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.WORK_LOG_ENTRIES) return JSON.stringify(entries);
        if (key === STORAGE_KEYS.CUSTOMER_PHOTOS) return null;
        return null;
      });
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await deleteWorkLogEntriesByCustomer('cust-1');

      expect(result.success).toBe(true);
      expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
    });

    it('should block createWorkLogEntry when read-only mode activates during queue wait', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);

      // Block the queue with a prior job
      let releaseBlocker!: () => void;
      const blocker = new Promise<void>((resolve) => { releaseBlocker = resolve; });
      const blockerJob = workLogEntriesQueue.enqueue(async () => { await blocker; });

      // Start createWorkLogEntry while queue is occupied (readOnly=false at entry)
      const createPromise = createWorkLogEntry({
        customerId: 'customer-1',
        workDate: '2026-01-30',
      });

      // Switch to read-only while createWorkLogEntry waits in queue
      setReadOnlyMode(true);

      // Release the blocker
      releaseBlocker();
      await blockerJob;

      const result = await createPromise;

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should still clean up photos after entry deletion even if read-only activates during photosQueue wait', async () => {
      const entry = {
        id: 'entry-1',
        customerId: 'customer-1',
        workDate: '2026-01-30',
        note: null,
        createdAt: 1000,
        updatedAt: 1000,
      };
      const photo = {
        id: 'photo-1',
        customerId: 'customer-1',
        workLogEntryId: 'entry-1',
        type: 'before',
        uri: 'file:///photos/photo-1.jpg',
        createdAt: 1000,
        updatedAt: 1000,
      };

      // Mock: entries storage returns our entry, then empty after deletion
      let entriesCallCount = 0;
      mockedAsyncStorage.getItem.mockImplementation(async (key: string) => {
        if (key === STORAGE_KEYS.WORK_LOG_ENTRIES) {
          entriesCallCount++;
          // First call reads entry, second call (if any) sees it deleted
          return entriesCallCount === 1 ? JSON.stringify([entry]) : JSON.stringify([]);
        }
        if (key === STORAGE_KEYS.CUSTOMER_PHOTOS) {
          return JSON.stringify([photo]);
        }
        return null;
      });
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);

      const FileSystem = require('expo-file-system');
      FileSystem.getInfoAsync.mockResolvedValue({ exists: true });
      FileSystem.deleteAsync.mockResolvedValue(undefined);

      // Block the photosQueue so we can toggle read-only mid-operation
      let releasePhotosBlocker!: () => void;
      const photosBlocker = new Promise<void>((resolve) => { releasePhotosBlocker = resolve; });
      const photosBlockerJob = photosQueue.enqueue(async () => { await photosBlocker; });

      // Start deleteWorkLogEntry (entry deletion will proceed, then wait for photosQueue)
      const deletePromise = deleteWorkLogEntry('entry-1');

      // Wait a tick for the entry queue to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Activate read-only while photosQueue is blocked
      setReadOnlyMode(true);

      // Release the photos blocker
      releasePhotosBlocker();
      await photosBlockerJob;

      const result = await deletePromise;

      // Entry deletion succeeded
      expect(result.success).toBe(true);

      // Photo cleanup should still have proceeded despite read-only mode
      expect(FileSystem.getInfoAsync).toHaveBeenCalledWith('file:///photos/photo-1.jpg');
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///photos/photo-1.jpg', { idempotent: true });

      // Photo metadata should have been updated (setItem called for both entries and photos)
      const setItemCalls = mockedAsyncStorage.setItem.mock.calls;
      const photosSetCall = setItemCalls.find((call) => call[0] === STORAGE_KEYS.CUSTOMER_PHOTOS);
      expect(photosSetCall).toBeDefined();
      // Verify the photo was removed from metadata
      const remainingPhotos = JSON.parse(photosSetCall![1]);
      expect(remainingPhotos).toEqual([]);
    });
  });
});
