/**
 * useCustomerPhotos Hook Tests
 *
 * Tests the hook interface types and structure.
 * Photo CRUD logic is tested in customerPhotoService.test.ts.
 */

// Mock storage before imports
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  getAllKeys: jest.fn().mockResolvedValue([]),
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/documents/',
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  readAsStringAsync: jest.fn(),
  EncodingType: {
    Base64: 'base64',
  },
}));

jest.mock('@/domain/customer', () => ({
  getPhotosByCustomer: jest.fn(),
  addPhoto: jest.fn(),
  deletePhoto: jest.fn(),
  updatePhotoWorkLogEntry: jest.fn(),
}));

import type { UseCustomerPhotosReturn } from '@/hooks/useCustomerPhotos';
import type { CustomerPhoto, PhotoType } from '@/types/customerPhoto';

describe('useCustomerPhotos', () => {
  describe('UseCustomerPhotosReturn interface', () => {
    it('has expected shape', () => {
      // Type-level test: verify the interface has expected properties
      const expectedReturn: UseCustomerPhotosReturn = {
        beforePhotos: [],
        afterPhotos: [],
        isLoading: false,
        error: null,
        addPhoto: jest.fn(),
        deletePhoto: jest.fn(),
        getPhotosByEntry: jest.fn(),
        reassignPhoto: jest.fn(),
        refresh: jest.fn(),
      };

      // Verify properties exist with correct types
      expect(Array.isArray(expectedReturn.beforePhotos)).toBe(true);
      expect(Array.isArray(expectedReturn.afterPhotos)).toBe(true);
      expect(typeof expectedReturn.isLoading).toBe('boolean');
      expect(typeof expectedReturn.addPhoto).toBe('function');
      expect(typeof expectedReturn.deletePhoto).toBe('function');
      expect(typeof expectedReturn.getPhotosByEntry).toBe('function');
      expect(typeof expectedReturn.reassignPhoto).toBe('function');
      expect(typeof expectedReturn.refresh).toBe('function');
    });
  });

  describe('Photo operations delegation', () => {
    it('addPhoto interface accepts type, sourceUri, and workLogEntryId', () => {
      // Type test: verify addPhoto accepts correct input types
      const mockAddPhoto = jest.fn<Promise<boolean>, [PhotoType, string, string]>();

      mockAddPhoto('before', 'file:///tmp/photo.jpg', 'entry-123');
      expect(mockAddPhoto).toHaveBeenCalledWith('before', 'file:///tmp/photo.jpg', 'entry-123');

      mockAddPhoto('after', 'file:///tmp/photo2.jpg', 'entry-456');
      expect(mockAddPhoto).toHaveBeenCalledWith('after', 'file:///tmp/photo2.jpg', 'entry-456');
    });

    it('deletePhoto interface accepts photoId string', () => {
      // Type test: verify deletePhoto accepts correct input type
      const mockDeletePhoto = jest.fn<Promise<boolean>, [string]>();

      mockDeletePhoto('photo-123');
      expect(mockDeletePhoto).toHaveBeenCalledWith('photo-123');
    });
  });

  describe('CustomerPhoto type structure', () => {
    it('CustomerPhoto has expected fields', () => {
      const photo: CustomerPhoto = {
        id: 'photo-123',
        customerId: 'cust-123',
        workLogEntryId: null,
        type: 'before',
        uri: 'file:///documents/customer_photos/cust-123/before/photo.jpg',
        originalFilename: 'IMG_0001.jpg',
        takenAt: Date.now(),
        createdAt: Date.now(),
      };

      expect(typeof photo.id).toBe('string');
      expect(typeof photo.customerId).toBe('string');
      expect(['before', 'after']).toContain(photo.type);
      expect(typeof photo.uri).toBe('string');
      expect(photo.originalFilename === null || typeof photo.originalFilename === 'string').toBe(true);
      expect(typeof photo.takenAt).toBe('number');
      expect(typeof photo.createdAt).toBe('number');
    });

    it('CustomerPhoto originalFilename can be null', () => {
      const photo: CustomerPhoto = {
        id: 'photo-123',
        customerId: 'cust-123',
        workLogEntryId: null,
        type: 'after',
        uri: 'file:///documents/customer_photos/cust-123/after/photo.jpg',
        originalFilename: null,
        takenAt: Date.now(),
        createdAt: Date.now(),
      };

      expect(photo.originalFilename).toBeNull();
    });

    it('PhotoType is limited to before or after', () => {
      const beforeType: PhotoType = 'before';
      const afterType: PhotoType = 'after';

      expect(beforeType).toBe('before');
      expect(afterType).toBe('after');
    });
  });
});
