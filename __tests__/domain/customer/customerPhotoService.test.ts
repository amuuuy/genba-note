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
  getPhotoDataUrlsForPdf,
} from '@/domain/customer/customerPhotoService';
import type { CustomerPhoto, AddPhotoInput } from '@/types/customerPhoto';
import { STORAGE_KEYS } from '@/utils/constants';
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
}));

const mockedAsyncStorage = jest.mocked(AsyncStorage);
const mockedImageUtils = jest.mocked(imageUtils);

// Test helpers
function createTestPhoto(overrides?: Partial<CustomerPhoto>): CustomerPhoto {
  return {
    id: 'photo-1',
    customerId: 'customer-1',
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
  });

  describe('addPhoto', () => {
    it('should add a new photo', async () => {
      mockedImageUtils.copyCustomerPhotoToPermanentStorage.mockResolvedValue(
        'file:///permanent/path/photo.jpg'
      );
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);

      const input: AddPhotoInput = {
        customerId: 'customer-1',
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
      mockedImageUtils.copyCustomerPhotoToPermanentStorage.mockResolvedValue(null);

      const input: AddPhotoInput = {
        customerId: 'customer-1',
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
});
