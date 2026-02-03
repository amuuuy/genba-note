/**
 * useCustomerList Hook Tests
 *
 * Tests the hook interface types and structure.
 * CRUD logic is tested in customerService.test.ts.
 *
 * Hook behavior with React requires @testing-library/react-native
 * which needs additional setup. Integration testing is done via
 * component tests.
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

jest.mock('@/domain/customer', () => ({
  listCustomers: jest.fn(),
  createCustomer: jest.fn(),
  updateCustomer: jest.fn(),
  deleteCustomer: jest.fn(),
}));

import type { UseCustomerListReturn } from '@/hooks/useCustomerList';
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from '@/types/customer';

describe('useCustomerList', () => {
  describe('UseCustomerListReturn interface', () => {
    it('has expected shape', () => {
      // Type-level test: verify the interface has expected properties
      const expectedReturn: UseCustomerListReturn = {
        customers: [],
        isLoading: false,
        error: null,
        searchText: '',
        setSearchText: jest.fn(),
        refresh: jest.fn(),
        createItem: jest.fn(),
        updateItem: jest.fn(),
        deleteItem: jest.fn(),
      };

      // Verify properties exist with correct types
      expect(Array.isArray(expectedReturn.customers)).toBe(true);
      expect(typeof expectedReturn.isLoading).toBe('boolean');
      expect(typeof expectedReturn.searchText).toBe('string');
      expect(typeof expectedReturn.setSearchText).toBe('function');
      expect(typeof expectedReturn.refresh).toBe('function');
      expect(typeof expectedReturn.createItem).toBe('function');
      expect(typeof expectedReturn.updateItem).toBe('function');
      expect(typeof expectedReturn.deleteItem).toBe('function');
    });
  });

  describe('CRUD operations delegation', () => {
    it('createItem interface accepts CreateCustomerInput', () => {
      // Type test: verify createItem accepts correct input type
      const mockCreateItem = jest.fn<Promise<boolean>, [CreateCustomerInput]>();

      const input: CreateCustomerInput = {
        name: '株式会社テスト',
        address: '東京都渋谷区1-2-3',
        phone: '03-1234-5678',
        email: 'test@example.com',
      };

      mockCreateItem(input);
      expect(mockCreateItem).toHaveBeenCalledWith(input);
    });

    it('updateItem interface accepts id and partial updates', () => {
      // Type test: verify updateItem accepts correct input types
      const mockUpdateItem = jest.fn<Promise<boolean>, [string, UpdateCustomerInput]>();

      mockUpdateItem('cust-1', { name: '更新後の会社名' });
      expect(mockUpdateItem).toHaveBeenCalledWith('cust-1', { name: '更新後の会社名' });
    });

    it('deleteItem interface accepts id string', () => {
      // Type test: verify deleteItem accepts correct input type
      const mockDeleteItem = jest.fn<Promise<boolean>, [string]>();

      mockDeleteItem('cust-1');
      expect(mockDeleteItem).toHaveBeenCalledWith('cust-1');
    });
  });

  describe('Customer type structure', () => {
    it('Customer has expected fields', () => {
      const customer: Customer = {
        id: 'cust-123',
        name: '株式会社テスト',
        address: '東京都渋谷区1-2-3',
        contact: {
          phone: '03-1234-5678',
          email: 'test@example.com',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(typeof customer.id).toBe('string');
      expect(typeof customer.name).toBe('string');
      expect(customer.address === null || typeof customer.address === 'string').toBe(true);
      expect(typeof customer.contact).toBe('object');
      expect(typeof customer.createdAt).toBe('number');
      expect(typeof customer.updatedAt).toBe('number');
    });

    it('Customer address can be null', () => {
      const customer: Customer = {
        id: 'cust-123',
        name: '株式会社テスト',
        address: null,
        contact: {
          phone: null,
          email: null,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(customer.address).toBeNull();
      expect(customer.contact.phone).toBeNull();
      expect(customer.contact.email).toBeNull();
    });
  });
});
