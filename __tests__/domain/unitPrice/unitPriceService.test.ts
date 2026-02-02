/**
 * Tests for UnitPrice CRUD service
 *
 * TDD: These tests are written first, then implementation follows.
 */

// Mock expo-secure-store FIRST before any imports
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock AsyncStorage (required by modules)
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock storage services
jest.mock('@/storage/asyncStorageService');
jest.mock('@/storage/secureStorageService');

import {
  createUnitPrice,
  getUnitPrice,
  listUnitPrices,
  updateUnitPrice,
  deleteUnitPriceById,
  duplicateUnitPrice,
  unitPriceToLineItemInput,
} from '@/domain/unitPrice/unitPriceService';
import { createTestUnitPrice, createTestUnitPricesWithCategories } from './helpers';
import * as asyncStorageService from '@/storage/asyncStorageService';

const mockedStorage = jest.mocked(asyncStorageService);

describe('unitPriceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedStorage.getReadOnlyMode.mockReturnValue(false);
  });

  describe('createUnitPrice', () => {
    it('should create a valid unit price with UUID', async () => {
      mockedStorage.saveUnitPrice.mockImplementation(async (up) => ({
        success: true,
        data: up,
      }));

      const result = await createUnitPrice({
        name: '塗装工事',
        unit: '式',
        defaultPrice: 10000,
        defaultTaxRate: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).toBe('塗装工事');
      expect(result.data!.unit).toBe('式');
      expect(result.data!.defaultPrice).toBe(10000);
      expect(result.data!.defaultTaxRate).toBe(10);
      expect(result.data!.id).toBeDefined();
      expect(result.data!.id.length).toBeGreaterThan(0);
      expect(result.data!.createdAt).toBeDefined();
      expect(result.data!.updatedAt).toBeDefined();
    });

    it('should return validation errors for invalid input', async () => {
      const result = await createUnitPrice({
        name: '',
        unit: '',
        defaultPrice: -100,
        defaultTaxRate: 5 as 0 | 10,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.validationErrors).toBeDefined();
      expect(result.error?.validationErrors?.length).toBeGreaterThan(0);
    });

    it('should normalize optional fields (empty string to null)', async () => {
      mockedStorage.saveUnitPrice.mockImplementation(async (up) => ({
        success: true,
        data: up,
      }));

      const result = await createUnitPrice({
        name: '塗装工事',
        unit: '式',
        defaultPrice: 10000,
        defaultTaxRate: 10,
        category: '  ',
        notes: '',
      });

      expect(result.success).toBe(true);
      expect(result.data!.category).toBeNull();
      expect(result.data!.notes).toBeNull();
    });

    it('should preserve valid category and notes', async () => {
      mockedStorage.saveUnitPrice.mockImplementation(async (up) => ({
        success: true,
        data: up,
      }));

      const result = await createUnitPrice({
        name: '塗装工事',
        unit: '式',
        defaultPrice: 10000,
        defaultTaxRate: 10,
        category: '塗装',
        notes: 'メモ',
      });

      expect(result.success).toBe(true);
      expect(result.data!.category).toBe('塗装');
      expect(result.data!.notes).toBe('メモ');
    });

    it('should save packQty and packPrice when provided', async () => {
      mockedStorage.saveUnitPrice.mockImplementation(async (up) => ({
        success: true,
        data: up,
      }));

      const result = await createUnitPrice({
        name: '塗料',
        unit: '個',
        defaultPrice: 300, // 3000 / 10 = 300
        defaultTaxRate: 10,
        packQty: 10,
        packPrice: 3000,
      });

      expect(result.success).toBe(true);
      expect(result.data!.packQty).toBe(10);
      expect(result.data!.packPrice).toBe(3000);
    });

    it('should save null for packQty/packPrice when not provided', async () => {
      mockedStorage.saveUnitPrice.mockImplementation(async (up) => ({
        success: true,
        data: up,
      }));

      const result = await createUnitPrice({
        name: '塗装工事',
        unit: '式',
        defaultPrice: 10000,
        defaultTaxRate: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data!.packQty).toBeNull();
      expect(result.data!.packPrice).toBeNull();
    });

    it('should return validation error for invalid packQty (zero)', async () => {
      const result = await createUnitPrice({
        name: '塗料',
        unit: '個',
        defaultPrice: 300,
        defaultTaxRate: 10,
        packQty: 0,
        packPrice: 3000,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.validationErrors?.some((e) => e.code === 'INVALID_PACK_QTY')).toBe(true);
    });

    it('should return validation error for invalid packPrice (negative)', async () => {
      const result = await createUnitPrice({
        name: '塗料',
        unit: '個',
        defaultPrice: 300,
        defaultTaxRate: 10,
        packQty: 10,
        packPrice: -1,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.validationErrors?.some((e) => e.code === 'INVALID_PACK_PRICE')).toBe(true);
    });

    it('should return error on storage failure', async () => {
      mockedStorage.saveUnitPrice.mockResolvedValue({
        success: false,
        error: { code: 'WRITE_ERROR', message: 'Storage error' },
      });

      const result = await createUnitPrice({
        name: '塗装工事',
        unit: '式',
        defaultPrice: 10000,
        defaultTaxRate: 10,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
    });
  });

  describe('getUnitPrice', () => {
    it('should return unit price by ID', async () => {
      const testUnitPrice = createTestUnitPrice({ id: 'test-id-1' });
      mockedStorage.getUnitPriceById.mockResolvedValue({
        success: true,
        data: testUnitPrice,
      });

      const result = await getUnitPrice('test-id-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testUnitPrice);
    });

    it('should return null for non-existent ID', async () => {
      mockedStorage.getUnitPriceById.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await getUnitPrice('non-existent-id');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should return error on storage failure', async () => {
      mockedStorage.getUnitPriceById.mockResolvedValue({
        success: false,
        error: { code: 'READ_ERROR', message: 'Storage error' },
      });

      const result = await getUnitPrice('test-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
    });
  });

  describe('listUnitPrices', () => {
    it('should return all unit prices', async () => {
      const testUnitPrices = createTestUnitPricesWithCategories();
      mockedStorage.getAllUnitPrices.mockResolvedValue({
        success: true,
        data: testUnitPrices,
      });

      const result = await listUnitPrices();

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(5);
    });

    it('should apply filter when provided', async () => {
      const testUnitPrices = createTestUnitPricesWithCategories();
      mockedStorage.getAllUnitPrices.mockResolvedValue({
        success: true,
        data: testUnitPrices,
      });

      const result = await listUnitPrices({ category: '塗装' });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
    });

    it('should return empty array when none exist', async () => {
      mockedStorage.getAllUnitPrices.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await listUnitPrices();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return error on storage failure', async () => {
      mockedStorage.getAllUnitPrices.mockResolvedValue({
        success: false,
        error: { code: 'READ_ERROR', message: 'Storage error' },
      });

      const result = await listUnitPrices();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
    });
  });

  describe('updateUnitPrice', () => {
    it('should update existing unit price', async () => {
      const testUnitPrice = createTestUnitPrice({ id: 'test-id', name: 'Old Name' });
      mockedStorage.getUnitPriceById.mockResolvedValue({
        success: true,
        data: testUnitPrice,
      });
      mockedStorage.saveUnitPrice.mockImplementation(async (up) => ({
        success: true,
        data: up,
      }));

      const result = await updateUnitPrice('test-id', { name: 'New Name' });

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('New Name');
      expect(result.data!.id).toBe('test-id'); // ID unchanged
    });

    it('should return error for non-existent ID', async () => {
      mockedStorage.getUnitPriceById.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await updateUnitPrice('non-existent-id', { name: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNIT_PRICE_NOT_FOUND');
    });

    it('should validate updated values', async () => {
      const testUnitPrice = createTestUnitPrice({ id: 'test-id' });
      mockedStorage.getUnitPriceById.mockResolvedValue({
        success: true,
        data: testUnitPrice,
      });

      const result = await updateUnitPrice('test-id', {
        name: '',
        defaultPrice: -100,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.validationErrors).toBeDefined();
    });

    it('should allow partial updates (preserve unchanged fields)', async () => {
      const now = Date.now();
      const testUnitPrice = createTestUnitPrice({
        id: 'test-id',
        name: 'Original Name',
        unit: 'm²',
        defaultPrice: 5000,
        category: 'Original Category',
        createdAt: now - 10000,
        updatedAt: now - 10000,
      });
      mockedStorage.getUnitPriceById.mockResolvedValue({
        success: true,
        data: testUnitPrice,
      });
      mockedStorage.saveUnitPrice.mockImplementation(async (up) => ({
        success: true,
        data: up,
      }));

      const result = await updateUnitPrice('test-id', { defaultPrice: 6000 });

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe('Original Name'); // unchanged
      expect(result.data!.unit).toBe('m²'); // unchanged
      expect(result.data!.defaultPrice).toBe(6000); // changed
      expect(result.data!.category).toBe('Original Category'); // unchanged
    });

    it('should update updatedAt timestamp', async () => {
      const oldTime = Date.now() - 10000;
      const testUnitPrice = createTestUnitPrice({
        id: 'test-id',
        createdAt: oldTime,
        updatedAt: oldTime,
      });
      mockedStorage.getUnitPriceById.mockResolvedValue({
        success: true,
        data: testUnitPrice,
      });
      mockedStorage.saveUnitPrice.mockImplementation(async (up) => ({
        success: true,
        data: up,
      }));

      const result = await updateUnitPrice('test-id', { name: 'Updated' });

      expect(result.success).toBe(true);
      expect(result.data!.createdAt).toBe(oldTime); // preserved
      expect(result.data!.updatedAt).toBeGreaterThan(oldTime); // updated
    });

    it('should update packQty and packPrice', async () => {
      const testUnitPrice = createTestUnitPrice({
        id: 'test-id',
        packQty: null,
        packPrice: null,
      });
      mockedStorage.getUnitPriceById.mockResolvedValue({
        success: true,
        data: testUnitPrice,
      });
      mockedStorage.saveUnitPrice.mockImplementation(async (up) => ({
        success: true,
        data: up,
      }));

      const result = await updateUnitPrice('test-id', {
        packQty: 10,
        packPrice: 3000,
      });

      expect(result.success).toBe(true);
      expect(result.data!.packQty).toBe(10);
      expect(result.data!.packPrice).toBe(3000);
    });

    it('should clear pack data when set to null', async () => {
      const testUnitPrice = createTestUnitPrice({
        id: 'test-id',
        packQty: 10,
        packPrice: 3000,
      });
      mockedStorage.getUnitPriceById.mockResolvedValue({
        success: true,
        data: testUnitPrice,
      });
      mockedStorage.saveUnitPrice.mockImplementation(async (up) => ({
        success: true,
        data: up,
      }));

      const result = await updateUnitPrice('test-id', {
        packQty: null,
        packPrice: null,
      });

      expect(result.success).toBe(true);
      expect(result.data!.packQty).toBeNull();
      expect(result.data!.packPrice).toBeNull();
    });
  });

  describe('deleteUnitPriceById', () => {
    it('should delete existing unit price', async () => {
      mockedStorage.getUnitPriceById.mockResolvedValue({
        success: true,
        data: createTestUnitPrice({ id: 'test-id' }),
      });
      mockedStorage.deleteUnitPrice.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const result = await deleteUnitPriceById('test-id');

      expect(result.success).toBe(true);
      expect(mockedStorage.deleteUnitPrice).toHaveBeenCalledWith('test-id');
    });

    it('should return error for non-existent ID', async () => {
      mockedStorage.getUnitPriceById.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await deleteUnitPriceById('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNIT_PRICE_NOT_FOUND');
    });

    it('should return error on storage failure', async () => {
      mockedStorage.getUnitPriceById.mockResolvedValue({
        success: true,
        data: createTestUnitPrice({ id: 'test-id' }),
      });
      mockedStorage.deleteUnitPrice.mockResolvedValue({
        success: false,
        error: { code: 'WRITE_ERROR', message: 'Storage error' },
      });

      const result = await deleteUnitPriceById('test-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
    });
  });

  describe('duplicateUnitPrice', () => {
    it('should duplicate with new ID', async () => {
      const original = createTestUnitPrice({
        id: 'original-id',
        name: '塗装工事',
        unit: 'm²',
        defaultPrice: 5000,
      });
      mockedStorage.getUnitPriceById.mockResolvedValue({
        success: true,
        data: original,
      });
      mockedStorage.saveUnitPrice.mockImplementation(async (up) => ({
        success: true,
        data: up,
      }));

      const result = await duplicateUnitPrice('original-id');

      expect(result.success).toBe(true);
      expect(result.data!.id).not.toBe('original-id'); // new ID
      expect(result.data!.name).toBe('塗装工事'); // same name
      expect(result.data!.unit).toBe('m²'); // same unit
      expect(result.data!.defaultPrice).toBe(5000); // same price
    });

    it('should return error for non-existent ID', async () => {
      mockedStorage.getUnitPriceById.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await duplicateUnitPrice('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNIT_PRICE_NOT_FOUND');
    });
  });

  describe('unitPriceToLineItemInput', () => {
    it('should convert UnitPrice to LineItemInput', () => {
      const unitPrice = createTestUnitPrice({
        name: '塗装工事',
        unit: 'm²',
        defaultPrice: 5000,
        defaultTaxRate: 10,
      });

      const lineItemInput = unitPriceToLineItemInput(unitPrice);

      expect(lineItemInput.name).toBe('塗装工事');
      expect(lineItemInput.unit).toBe('m²');
      expect(lineItemInput.unitPrice).toBe(5000);
      expect(lineItemInput.taxRate).toBe(10);
    });

    it('should use default quantityMilli of 1000', () => {
      const unitPrice = createTestUnitPrice();

      const lineItemInput = unitPriceToLineItemInput(unitPrice);

      expect(lineItemInput.quantityMilli).toBe(1000);
    });

    it('should use provided quantityMilli', () => {
      const unitPrice = createTestUnitPrice();

      const lineItemInput = unitPriceToLineItemInput(unitPrice, 2500);

      expect(lineItemInput.quantityMilli).toBe(2500);
    });
  });
});
