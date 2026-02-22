/**
 * Tests for customerPhotoService.ts
 * TDD: Tests are written first, implementation follows
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  addPhoto,
  getPhotosByCustomer,
  deletePhoto,
  deletePhotosByCustomer,
  deletePhotoMetadataOnly,
  getPhotoDataUrlsForPdf,
  getTotalPhotoCount,
  validatePhotoLimits,
  updatePhotoWorkLogEntry,
  addPhotoRecord,
} from '@/domain/customer/customerPhotoService';
import { setReadOnlyMode } from '@/storage/readOnlyModeState';
import { photosQueue } from '@/utils/writeQueue';
import type { CustomerPhoto, AddPhotoInput } from '@/types/customerPhoto';
import {
  STORAGE_KEYS,
  MAX_TOTAL_PHOTOS,
  MAX_PHOTO_SIZE_ACTIVE_BYTES,
  MAX_PHOTO_SIZE_STORE_BYTES,
} from '@/utils/constants';
import * as imageUtils from '@/utils/imageUtils';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock uuid
jest.mock('@/utils/uuid', () => ({
  generateUUID: jest.fn(() => 'test-photo-uuid'),
}));

// Mock imageUtils
jest.mock('@/utils/imageUtils', () => ({
  copyCustomerPhotoToPermanentStorage: jest.fn(),
  deleteStoredImage: jest.fn(),
  deleteCustomerPhotosDirectory: jest.fn(),
  imageUriToDataUrl: jest.fn(),
  getFileSize: jest.fn(),
}));

const mockedAsyncStorage = jest.mocked(AsyncStorage);
const mockedImageUtils = jest.mocked(imageUtils);

// Test helpers
function createTestPhoto(overrides?: Partial<CustomerPhoto>): CustomerPhoto {
  return {
    id: 'photo-1',
    customerId: 'customer-1',
    workLogEntryId: null,
    type: 'before',
    uri: 'file:///path/to/photo.jpg',
    originalFilename: 'photo.jpg',
    takenAt: Date.now(),
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('customerPhotoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setReadOnlyMode(false);
  });

  describe('addPhoto', () => {
    it('should add a new photo', async () => {
      mockedImageUtils.copyCustomerPhotoToPermanentStorage.mockResolvedValue(
        'file:///permanent/path/photo.jpg'
      );
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);
      mockedImageUtils.getFileSize
        .mockResolvedValueOnce({ success: true, size: 1_000_000 }) // Source check
        .mockResolvedValueOnce({ success: true, size: 1_000_000 }); // Stored check

      const input: AddPhotoInput = {
        customerId: 'customer-1',
        workLogEntryId: 'entry-1',
        type: 'before',
        sourceUri: 'file:///temp/photo.jpg',
        originalFilename: 'photo.jpg',
      };

      const result = await addPhoto(input);

      expect(result.success).toBe(true);
      expect(result.data?.customerId).toBe('customer-1');
      expect(result.data?.type).toBe('before');
      expect(result.data?.uri).toBe('file:///permanent/path/photo.jpg');
      expect(result.data?.originalFilename).toBe('photo.jpg');
    });

    it('should fail if photo copy fails', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedImageUtils.getFileSize.mockResolvedValue({ success: true, size: 1_000_000 });
      mockedImageUtils.copyCustomerPhotoToPermanentStorage.mockResolvedValue(null);

      const input: AddPhotoInput = {
        customerId: 'customer-1',
        workLogEntryId: 'entry-1',
        type: 'before',
        sourceUri: 'file:///temp/photo.jpg',
      };

      const result = await addPhoto(input);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
    });
  });

  describe('getPhotosByCustomer', () => {
    it('should return all photos for a customer', async () => {
      const photos = [
        createTestPhoto({ id: 'photo-1', customerId: 'customer-1', type: 'before' }),
        createTestPhoto({ id: 'photo-2', customerId: 'customer-1', type: 'after' }),
        createTestPhoto({ id: 'photo-3', customerId: 'customer-2', type: 'before' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(photos));

      const result = await getPhotosByCustomer('customer-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.every((p) => p.customerId === 'customer-1')).toBe(true);
    });

    it('should filter by photo type', async () => {
      const photos = [
        createTestPhoto({ id: 'photo-1', customerId: 'customer-1', type: 'before' }),
        createTestPhoto({ id: 'photo-2', customerId: 'customer-1', type: 'after' }),
        createTestPhoto({ id: 'photo-3', customerId: 'customer-1', type: 'before' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(photos));

      const result = await getPhotosByCustomer('customer-1', 'before');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.every((p) => p.type === 'before')).toBe(true);
    });

    it('should return empty array for customer with no photos', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await getPhotosByCustomer('customer-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should sort photos by takenAt (newest first)', async () => {
      const now = Date.now();
      const photos = [
        createTestPhoto({ id: 'photo-1', customerId: 'customer-1', takenAt: now - 1000 }),
        createTestPhoto({ id: 'photo-2', customerId: 'customer-1', takenAt: now }),
        createTestPhoto({ id: 'photo-3', customerId: 'customer-1', takenAt: now - 2000 }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(photos));

      const result = await getPhotosByCustomer('customer-1');

      expect(result.success).toBe(true);
      expect(result.data?.[0].id).toBe('photo-2'); // newest
      expect(result.data?.[2].id).toBe('photo-3'); // oldest
    });
  });

  describe('deletePhoto', () => {
    it('should delete a photo by id', async () => {
      const photo = createTestPhoto({ id: 'photo-1' });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([photo]));
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);
      mockedImageUtils.deleteStoredImage.mockResolvedValue(undefined);

      const result = await deletePhoto('photo-1');

      expect(result.success).toBe(true);
      expect(mockedImageUtils.deleteStoredImage).toHaveBeenCalledWith(photo.uri);
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.CUSTOMER_PHOTOS,
        JSON.stringify([])
      );
    });

    it('should fail if photo not found', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await deletePhoto('non-existent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CUSTOMER_NOT_FOUND');
    });
  });

  describe('deletePhotosByCustomer', () => {
    it('should delete all photos for a customer', async () => {
      const photos = [
        createTestPhoto({ id: 'photo-1', customerId: 'customer-1' }),
        createTestPhoto({ id: 'photo-2', customerId: 'customer-1' }),
        createTestPhoto({ id: 'photo-3', customerId: 'customer-2' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(photos));
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);
      mockedImageUtils.deleteCustomerPhotosDirectory.mockResolvedValue(undefined);

      const result = await deletePhotosByCustomer('customer-1');

      expect(result.success).toBe(true);
      expect(mockedImageUtils.deleteCustomerPhotosDirectory).toHaveBeenCalledWith('customer-1');

      // Verify only customer-2's photo remains
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.CUSTOMER_PHOTOS,
        JSON.stringify([photos[2]])
      );
    });
  });

  describe('getPhotoDataUrlsForPdf', () => {
    it('should return data URLs for all photos of a type', async () => {
      const photos = [
        createTestPhoto({ id: 'photo-1', customerId: 'customer-1', type: 'before', uri: 'file:///1.jpg' }),
        createTestPhoto({ id: 'photo-2', customerId: 'customer-1', type: 'before', uri: 'file:///2.jpg' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(photos));
      mockedImageUtils.imageUriToDataUrl
        .mockResolvedValueOnce('data:image/jpeg;base64,abc123')
        .mockResolvedValueOnce('data:image/jpeg;base64,def456');

      const result = await getPhotoDataUrlsForPdf('customer-1', 'before');

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('data:image/jpeg;base64,abc123');
      expect(result[1]).toBe('data:image/jpeg;base64,def456');
    });

    it('should return empty array if no photos', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await getPhotoDataUrlsForPdf('customer-1', 'before');

      expect(result).toHaveLength(0);
    });

    it('should skip photos that fail to convert', async () => {
      const photos = [
        createTestPhoto({ id: 'photo-1', customerId: 'customer-1', type: 'before', uri: 'file:///1.jpg' }),
        createTestPhoto({ id: 'photo-2', customerId: 'customer-1', type: 'before', uri: 'file:///2.jpg' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(photos));
      mockedImageUtils.imageUriToDataUrl
        .mockResolvedValueOnce('data:image/jpeg;base64,abc123')
        .mockResolvedValueOnce(null); // Fails to convert

      const result = await getPhotoDataUrlsForPdf('customer-1', 'before');

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('data:image/jpeg;base64,abc123');
    });
  });

  // ==========================================
  // Photo Limits Tests (TDD - RED phase)
  // ==========================================

  describe('getTotalPhotoCount', () => {
    it('should return 0 for empty storage', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const result = await getTotalPhotoCount();

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });

    it('should return correct count of all photos', async () => {
      const photos = [
        createTestPhoto({ id: 'photo-1', customerId: 'customer-1' }),
        createTestPhoto({ id: 'photo-2', customerId: 'customer-1' }),
        createTestPhoto({ id: 'photo-3', customerId: 'customer-2' }),
        createTestPhoto({ id: 'photo-4', customerId: 'customer-3' }),
        createTestPhoto({ id: 'photo-5', customerId: 'customer-1' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(photos));

      const result = await getTotalPhotoCount();

      expect(result.success).toBe(true);
      expect(result.data).toBe(5);
    });

    it('should return error on storage failure', async () => {
      mockedAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await getTotalPhotoCount();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
    });
  });

  describe('validatePhotoLimits', () => {
    it('should allow when under count limit and size OK', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedImageUtils.getFileSize.mockResolvedValue({ success: true, size: 1_000_000 }); // 1MB

      const result = await validatePhotoLimits('file:///test.jpg');

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
    });

    it('should reject when count limit reached', async () => {
      // Create 1000 photos to hit the limit
      const photos = Array(MAX_TOTAL_PHOTOS)
        .fill(null)
        .map((_, i) => createTestPhoto({ id: `photo-${i}` }));
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(photos));
      mockedImageUtils.getFileSize.mockResolvedValue({ success: true, size: 1_000_000 }); // 1MB

      const result = await validatePhotoLimits('file:///test.jpg');

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(false);
      expect(result.data?.errorCode).toBe('PHOTO_COUNT_LIMIT_EXCEEDED');
      expect(result.data?.message).toContain('上限');
    });

    it('should reject when file size exceeds active limit', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedImageUtils.getFileSize.mockResolvedValue({ success: true, size: MAX_PHOTO_SIZE_ACTIVE_BYTES + 1 }); // Exceeds 4.5MB

      const result = await validatePhotoLimits('file:///test.jpg');

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(false);
      expect(result.data?.errorCode).toBe('PHOTO_SIZE_LIMIT_EXCEEDED');
      expect(result.data?.message).toContain('サイズ');
    });

    it('should allow when exactly at count limit - 1', async () => {
      const photos = Array(MAX_TOTAL_PHOTOS - 1)
        .fill(null)
        .map((_, i) => createTestPhoto({ id: `photo-${i}` }));
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(photos));
      mockedImageUtils.getFileSize.mockResolvedValue({ success: true, size: 1_000_000 }); // 1MB

      const result = await validatePhotoLimits('file:///test.jpg');

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
    });

    it('should fail when file size check fails (fail-closed)', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedImageUtils.getFileSize.mockResolvedValue({ success: false, error: 'File does not exist' });

      const result = await validatePhotoLimits('file:///test.jpg');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
    });

    it('should allow when exactly at active size limit', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedImageUtils.getFileSize.mockResolvedValue({ success: true, size: MAX_PHOTO_SIZE_ACTIVE_BYTES }); // Exactly 4.5MB

      const result = await validatePhotoLimits('file:///test.jpg');

      expect(result.success).toBe(true);
      expect(result.data?.allowed).toBe(true);
    });
  });

  describe('addPhoto with limits', () => {
    it('should fail with PHOTO_COUNT_LIMIT_EXCEEDED when limit reached', async () => {
      const photos = Array(MAX_TOTAL_PHOTOS)
        .fill(null)
        .map((_, i) => createTestPhoto({ id: `photo-${i}` }));
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(photos));
      mockedImageUtils.getFileSize.mockResolvedValue({ success: true, size: 1_000_000 }); // 1MB

      const input: AddPhotoInput = {
        customerId: 'customer-1',
        workLogEntryId: 'entry-1',
        type: 'before',
        sourceUri: 'file:///temp/photo.jpg',
      };

      const result = await addPhoto(input);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PHOTO_COUNT_LIMIT_EXCEEDED');
    });

    it('should fail with PHOTO_SIZE_LIMIT_EXCEEDED when source file too large', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedImageUtils.getFileSize.mockResolvedValue({ success: true, size: MAX_PHOTO_SIZE_ACTIVE_BYTES + 1 }); // Exceeds 4.5MB

      const input: AddPhotoInput = {
        customerId: 'customer-1',
        workLogEntryId: 'entry-1',
        type: 'before',
        sourceUri: 'file:///temp/photo.jpg',
      };

      const result = await addPhoto(input);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PHOTO_SIZE_LIMIT_EXCEEDED');
    });

    it('should fail with PHOTO_SIZE_LIMIT_EXCEEDED when stored file exceeds store limit', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      // Source file is within active limit
      mockedImageUtils.getFileSize
        .mockResolvedValueOnce({ success: true, size: MAX_PHOTO_SIZE_ACTIVE_BYTES }) // Source check
        .mockResolvedValueOnce({ success: true, size: MAX_PHOTO_SIZE_STORE_BYTES + 1 }); // Stored file check - exceeds store limit
      mockedImageUtils.copyCustomerPhotoToPermanentStorage.mockResolvedValue(
        'file:///permanent/path/photo.jpg'
      );
      mockedImageUtils.deleteStoredImage.mockResolvedValue(undefined);

      const input: AddPhotoInput = {
        customerId: 'customer-1',
        workLogEntryId: 'entry-1',
        type: 'before',
        sourceUri: 'file:///temp/photo.jpg',
      };

      const result = await addPhoto(input);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PHOTO_SIZE_LIMIT_EXCEEDED');
      // Should clean up the copied file
      expect(mockedImageUtils.deleteStoredImage).toHaveBeenCalledWith(
        'file:///permanent/path/photo.jpg'
      );
    });

    it('should succeed when within all limits', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedImageUtils.getFileSize
        .mockResolvedValueOnce({ success: true, size: 1_000_000 }) // Source check - 1MB
        .mockResolvedValueOnce({ success: true, size: 1_000_000 }); // Stored check - 1MB
      mockedImageUtils.copyCustomerPhotoToPermanentStorage.mockResolvedValue(
        'file:///permanent/path/photo.jpg'
      );
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);

      const input: AddPhotoInput = {
        customerId: 'customer-1',
        workLogEntryId: 'entry-1',
        type: 'before',
        sourceUri: 'file:///temp/photo.jpg',
        originalFilename: 'photo.jpg',
      };

      const result = await addPhoto(input);

      expect(result.success).toBe(true);
      expect(result.data?.customerId).toBe('customer-1');
    });
  });

  describe('Read-only mode', () => {
    it('should block addPhoto in read-only mode', async () => {
      setReadOnlyMode(true);

      const input: AddPhotoInput = {
        customerId: 'customer-1',
        workLogEntryId: 'entry-1',
        type: 'before',
        sourceUri: 'file:///temp/photo.jpg',
      };

      const result = await addPhoto(input);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
      expect(mockedImageUtils.copyCustomerPhotoToPermanentStorage).not.toHaveBeenCalled();
    });

    it('should block deletePhoto in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await deletePhoto('photo-1');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
      expect(mockedImageUtils.deleteStoredImage).not.toHaveBeenCalled();
    });

    it('should block deletePhotoMetadataOnly in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await deletePhotoMetadataOnly('photo-1');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should block deletePhotosByCustomer in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await deletePhotosByCustomer('customer-1');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should block updatePhotoWorkLogEntry in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await updatePhotoWorkLogEntry('photo-1', 'entry-2');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should block addPhotoRecord in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await addPhotoRecord({
        customerId: 'customer-1',
        workLogEntryId: 'entry-1',
        type: 'before',
        uri: 'file:///permanent/photo.jpg',
        originalFilename: 'photo.jpg',
        takenAt: Date.now(),
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should block addPhoto when read-only mode activates during queue wait and clean up copied file', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedImageUtils.getFileSize.mockResolvedValue({ success: true, size: 1_000_000 });
      mockedImageUtils.copyCustomerPhotoToPermanentStorage.mockResolvedValue(
        'file:///permanent/path/photo.jpg'
      );
      mockedImageUtils.deleteStoredImage.mockResolvedValue(undefined);

      // Block the queue with a prior job
      let releaseBlocker!: () => void;
      const blocker = new Promise<void>((resolve) => { releaseBlocker = resolve; });
      const blockerJob = photosQueue.enqueue(async () => { await blocker; });

      // Start addPhoto while queue is occupied (readOnly=false at entry)
      const addPromise = addPhoto({
        customerId: 'customer-1',
        workLogEntryId: 'entry-1',
        type: 'before',
        sourceUri: 'file:///temp/photo.jpg',
      });

      // Switch to read-only while addPhoto waits in queue
      setReadOnlyMode(true);

      // Release the blocker
      releaseBlocker();
      await blockerJob;

      const result = await addPromise;

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
      // Copied file should be cleaned up
      expect(mockedImageUtils.deleteStoredImage).toHaveBeenCalledWith(
        'file:///permanent/path/photo.jpg'
      );
    });

    it('should clean up copied file when queue throws exception after file copy', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedImageUtils.getFileSize.mockResolvedValue({ success: true, size: 1_000_000 });
      mockedImageUtils.copyCustomerPhotoToPermanentStorage.mockResolvedValue(
        'file:///permanent/path/photo.jpg'
      );
      mockedImageUtils.deleteStoredImage.mockResolvedValue(undefined);
      // setItem throws inside queue
      mockedAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));

      const result = await addPhoto({
        customerId: 'customer-1',
        workLogEntryId: 'entry-1',
        type: 'before',
        sourceUri: 'file:///temp/photo.jpg',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
      // Copied file should be cleaned up
      expect(mockedImageUtils.deleteStoredImage).toHaveBeenCalledWith(
        'file:///permanent/path/photo.jpg'
      );
    });

    it('should console.warn when deleteStoredImage fails during cleanup in __DEV__', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedImageUtils.getFileSize.mockResolvedValue({ success: true, size: 1_000_000 });
      mockedImageUtils.copyCustomerPhotoToPermanentStorage.mockResolvedValue(
        'file:///permanent/path/photo.jpg'
      );
      // deleteStoredImage rejects during cleanup
      mockedImageUtils.deleteStoredImage.mockRejectedValue(new Error('Delete failed'));
      // setItem throws to trigger the catch block
      mockedAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));

      const result = await addPhoto({
        customerId: 'customer-1',
        workLogEntryId: 'entry-1',
        type: 'before',
        sourceUri: 'file:///temp/photo.jpg',
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to delete copied photo during cleanup:',
        'file:///permanent/path/photo.jpg',
        expect.any(Error)
      );

      warnSpy.mockRestore();
    });
  });
});
