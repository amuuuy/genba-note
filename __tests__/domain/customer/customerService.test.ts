/**
 * Tests for customerService.ts
 * TDD: Tests are written first, implementation follows
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
} from '@/domain/customer/customerService';
import { deleteWorkLogEntriesByCustomer } from '@/domain/customer/workLogEntryService';
import { deletePhotoMetadataByCustomer } from '@/domain/customer/customerPhotoService';
import { deleteCustomerPhotosDirectory } from '@/utils/imageUtils';
import { setReadOnlyMode } from '@/storage/readOnlyModeState';
import { customersQueue } from '@/utils/writeQueue';
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from '@/types/customer';
import { STORAGE_KEYS } from '@/utils/constants';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock uuid
jest.mock('@/utils/uuid', () => ({
  generateUUID: jest.fn(() => 'test-uuid-123'),
}));

// Mock workLogEntryService
jest.mock('@/domain/customer/workLogEntryService', () => ({
  deleteWorkLogEntriesByCustomer: jest.fn(async () => ({ success: true })),
}));

// Mock customerPhotoService
jest.mock('@/domain/customer/customerPhotoService', () => ({
  deletePhotoMetadataByCustomer: jest.fn(async () => ({ success: true })),
}));

// Mock imageUtils
jest.mock('@/utils/imageUtils', () => ({
  deleteCustomerPhotosDirectory: jest.fn(async () => {}),
}));

const mockedAsyncStorage = jest.mocked(AsyncStorage);

// Test helpers
function createTestCustomer(overrides?: Partial<Customer>): Customer {
  return {
    id: 'customer-1',
    name: 'Test Customer',
    address: '東京都渋谷区1-2-3',
    contact: {
      phone: '03-1234-5678',
      email: 'test@example.com',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('customerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setReadOnlyMode(false);
  });

  describe('createCustomer', () => {
    it('should create a new customer with all fields', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);

      const input: CreateCustomerInput = {
        name: 'New Customer',
        address: '大阪府大阪市1-1-1',
        phone: '06-1234-5678',
        email: 'new@example.com',
      };

      const result = await createCustomer(input);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('New Customer');
      expect(result.data?.address).toBe('大阪府大阪市1-1-1');
      expect(result.data?.contact.phone).toBe('06-1234-5678');
      expect(result.data?.contact.email).toBe('new@example.com');
      expect(result.data?.id).toBe('test-uuid-123');
    });

    it('should create customer with only name', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);

      const input: CreateCustomerInput = {
        name: 'Minimal Customer',
      };

      const result = await createCustomer(input);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Minimal Customer');
      expect(result.data?.address).toBeNull();
      expect(result.data?.contact.phone).toBeNull();
      expect(result.data?.contact.email).toBeNull();
    });

    it('should fail if name is empty', async () => {
      const input: CreateCustomerInput = {
        name: '',
      };

      const result = await createCustomer(input);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should fail if name is whitespace only', async () => {
      const input: CreateCustomerInput = {
        name: '   ',
      };

      const result = await createCustomer(input);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('getCustomer', () => {
    it('should return customer by id', async () => {
      const customer = createTestCustomer({ id: 'customer-1' });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([customer]));

      const result = await getCustomer('customer-1');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('customer-1');
      expect(result.data?.name).toBe('Test Customer');
    });

    it('should return null for non-existent customer', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await getCustomer('non-existent');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('listCustomers', () => {
    it('should return all customers', async () => {
      const customers = [
        createTestCustomer({ id: 'customer-1', name: 'Customer A' }),
        createTestCustomer({ id: 'customer-2', name: 'Customer B' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(customers));

      const result = await listCustomers();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should return empty array when no customers', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(null);

      const result = await listCustomers();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should filter customers by search text (name)', async () => {
      const customers = [
        createTestCustomer({ id: 'customer-1', name: '山田建設' }),
        createTestCustomer({ id: 'customer-2', name: '田中工務店' }),
        createTestCustomer({ id: 'customer-3', name: '山田工業' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(customers));

      const result = await listCustomers({ searchText: '山田' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.map(c => c.name)).toContain('山田建設');
      expect(result.data?.map(c => c.name)).toContain('山田工業');
    });

    it('should filter customers by search text (address)', async () => {
      const customers = [
        createTestCustomer({ id: 'customer-1', name: 'Customer A', address: '東京都渋谷区' }),
        createTestCustomer({ id: 'customer-2', name: 'Customer B', address: '大阪府大阪市' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(customers));

      const result = await listCustomers({ searchText: '渋谷' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].name).toBe('Customer A');
    });
  });

  describe('updateCustomer', () => {
    it('should update customer name', async () => {
      const customer = createTestCustomer({ id: 'customer-1' });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([customer]));
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await updateCustomer('customer-1', { name: 'Updated Name' });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Updated Name');
    });

    it('should update customer contact info', async () => {
      const customer = createTestCustomer({ id: 'customer-1' });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([customer]));
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await updateCustomer('customer-1', {
        phone: '090-1111-2222',
        email: 'updated@example.com',
      });

      expect(result.success).toBe(true);
      expect(result.data?.contact.phone).toBe('090-1111-2222');
      expect(result.data?.contact.email).toBe('updated@example.com');
    });

    it('should fail if customer not found', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await updateCustomer('non-existent', { name: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CUSTOMER_NOT_FOUND');
    });

    it('should fail if updated name is empty', async () => {
      const customer = createTestCustomer({ id: 'customer-1' });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([customer]));

      const result = await updateCustomer('customer-1', { name: '' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('deleteCustomer', () => {
    it('should delete customer by id', async () => {
      const customer = createTestCustomer({ id: 'customer-1' });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([customer]));
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await deleteCustomer('customer-1');

      expect(result.success).toBe(true);
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.CUSTOMERS,
        JSON.stringify([])
      );
    });

    it('should still attempt cascade cleanup when customer not found (idempotent)', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await deleteCustomer('non-existent');

      // Customer not found is ok - still attempt cascade cleanup for orphan data
      expect(deleteWorkLogEntriesByCustomer).toHaveBeenCalledWith('non-existent');
      expect(deleteCustomerPhotosDirectory).toHaveBeenCalledWith('non-existent');
      // Final result depends on cascade results (success if all cascade steps succeed)
      expect(result.success).toBe(true);
    });

    it('should cascade delete work log entries', async () => {
      const customer = createTestCustomer({ id: 'customer-1' });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([customer]));
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await deleteCustomer('customer-1');

      expect(result.success).toBe(true);
      expect(deleteWorkLogEntriesByCustomer).toHaveBeenCalledWith('customer-1');
    });

    it('should cascade delete customer photos directory', async () => {
      const customer = createTestCustomer({ id: 'customer-1' });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([customer]));
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await deleteCustomer('customer-1');

      expect(result.success).toBe(true);
      expect(deleteCustomerPhotosDirectory).toHaveBeenCalledWith('customer-1');
    });

    it('should cascade delete photo metadata when directory deletion succeeds', async () => {
      const customer = createTestCustomer({ id: 'customer-1' });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([customer]));
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);

      const result = await deleteCustomer('customer-1');

      expect(result.success).toBe(true);
      expect(deletePhotoMetadataByCustomer).toHaveBeenCalledWith('customer-1');
    });

    it('should still succeed when cascade work log deletion fails (customer is deleted)', async () => {
      const customer = createTestCustomer({ id: 'customer-1' });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([customer]));
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);
      (deleteWorkLogEntriesByCustomer as jest.Mock).mockResolvedValueOnce({ success: false, error: { message: 'cascade error' } });
      jest.spyOn(console, 'warn').mockImplementation();

      const result = await deleteCustomer('customer-1');

      // Customer itself is deleted (setItem called to remove from list)
      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.CUSTOMERS,
        JSON.stringify([])
      );
      // Success because customer record is removed; cascade failure is logged
      expect(result.success).toBe(true);
    });

    it('should still succeed when photo directory deletion throws (customer is deleted)', async () => {
      const customer = createTestCustomer({ id: 'customer-1' });
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([customer]));
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);
      (deleteWorkLogEntriesByCustomer as jest.Mock).mockResolvedValueOnce({ success: true });
      (deleteCustomerPhotosDirectory as jest.Mock).mockRejectedValueOnce(new Error('EPERM'));
      jest.spyOn(console, 'warn').mockImplementation();

      const result = await deleteCustomer('customer-1');

      // Customer is deleted
      expect(mockedAsyncStorage.setItem).toHaveBeenCalled();
      // Success because customer record is removed; directory failure is logged
      expect(result.success).toBe(true);
      // Metadata deletion should be skipped when directory deletion fails
      expect(deletePhotoMetadataByCustomer).not.toHaveBeenCalled();
    });
  });

  describe('searchCustomers', () => {
    it('should search by name (case insensitive)', async () => {
      const customers = [
        createTestCustomer({ id: 'customer-1', name: 'ABC株式会社' }),
        createTestCustomer({ id: 'customer-2', name: 'abc工務店' }),
        createTestCustomer({ id: 'customer-3', name: 'XYZ建設' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(customers));

      const result = await searchCustomers('abc');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should return empty array for no matches', async () => {
      const customers = [
        createTestCustomer({ id: 'customer-1', name: 'ABC株式会社' }),
      ];
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(customers));

      const result = await searchCustomers('XYZ');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('Read-only mode', () => {
    it('should block createCustomer in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await createCustomer({ name: 'New Customer' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should block updateCustomer in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await updateCustomer('customer-1', { name: 'Updated' });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should block deleteCustomer in read-only mode', async () => {
      setReadOnlyMode(true);

      const result = await deleteCustomer('customer-1');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should block createCustomer when read-only mode activates during queue wait', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
      mockedAsyncStorage.setItem.mockResolvedValue(undefined);

      // Block the queue with a prior job
      let releaseBlocker!: () => void;
      const blocker = new Promise<void>((resolve) => { releaseBlocker = resolve; });
      const blockerJob = customersQueue.enqueue(async () => { await blocker; });

      // Start createCustomer while queue is occupied (readOnly=false at entry)
      const createPromise = createCustomer({ name: 'New Customer' });

      // Switch to read-only while createCustomer waits in queue
      setReadOnlyMode(true);

      // Release the blocker so createCustomer's callback executes
      releaseBlocker();
      await blockerJob;

      const result = await createPromise;

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('READONLY_MODE');
      expect(mockedAsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });
});
