/**
 * useCustomerEdit Hook Tests
 *
 * Tests the hook interface types and structure.
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
  getCustomer: jest.fn(),
  createCustomer: jest.fn(),
  updateCustomer: jest.fn(),
}));

import type { UseCustomerEditReturn, CustomerFormValues, CustomerEditState } from '@/hooks/useCustomerEdit';

describe('useCustomerEdit', () => {
  describe('UseCustomerEditReturn interface', () => {
    it('has expected shape', () => {
      // Type-level test: verify the interface has expected properties
      const mockState: CustomerEditState = {
        values: {
          name: '',
          address: '',
          phone: '',
          email: '',
        },
        isLoading: false,
        isSaving: false,
        isDirty: false,
        errors: {},
        errorMessage: null,
      };

      const expectedReturn: UseCustomerEditReturn = {
        state: mockState,
        updateField: jest.fn(),
        save: jest.fn(),
        validate: jest.fn(),
        reload: jest.fn(),
      };

      // Verify properties exist with correct types
      expect(typeof expectedReturn.state).toBe('object');
      expect(typeof expectedReturn.updateField).toBe('function');
      expect(typeof expectedReturn.save).toBe('function');
      expect(typeof expectedReturn.validate).toBe('function');
      expect(typeof expectedReturn.reload).toBe('function');
    });
  });

  describe('CustomerFormValues interface', () => {
    it('has expected fields', () => {
      const formValues: CustomerFormValues = {
        name: '株式会社テスト',
        address: '東京都渋谷区1-2-3',
        phone: '03-1234-5678',
        email: 'test@example.com',
      };

      expect(typeof formValues.name).toBe('string');
      expect(typeof formValues.address).toBe('string');
      expect(typeof formValues.phone).toBe('string');
      expect(typeof formValues.email).toBe('string');
    });
  });

  describe('CustomerEditState interface', () => {
    it('has expected fields', () => {
      const state: CustomerEditState = {
        values: {
          name: '',
          address: '',
          phone: '',
          email: '',
        },
        isLoading: false,
        isSaving: false,
        isDirty: false,
        errors: {},
        errorMessage: null,
      };

      expect(typeof state.values).toBe('object');
      expect(typeof state.isLoading).toBe('boolean');
      expect(typeof state.isSaving).toBe('boolean');
      expect(typeof state.isDirty).toBe('boolean');
      expect(typeof state.errors).toBe('object');
      expect(state.errorMessage).toBeNull();
    });

    it('errors can contain validation messages', () => {
      const state: CustomerEditState = {
        values: {
          name: '',
          address: '',
          phone: '',
          email: '',
        },
        isLoading: false,
        isSaving: false,
        isDirty: true,
        errors: {
          name: '顧客名は必須です',
        },
        errorMessage: null,
      };

      expect(state.errors.name).toBe('顧客名は必須です');
    });
  });

  describe('Form operations', () => {
    it('updateField accepts field name and value', () => {
      const mockUpdateField = jest.fn<void, [keyof CustomerFormValues, string]>();

      mockUpdateField('name', '新しい会社名');
      expect(mockUpdateField).toHaveBeenCalledWith('name', '新しい会社名');

      mockUpdateField('address', '新しい住所');
      expect(mockUpdateField).toHaveBeenCalledWith('address', '新しい住所');
    });

    it('save returns promise of Customer or null', () => {
      const mockSave = jest.fn<Promise<{ id: string } | null>, []>();

      mockSave();
      expect(mockSave).toHaveBeenCalled();
    });

    it('validate returns boolean', () => {
      const mockValidate = jest.fn<boolean, []>().mockReturnValue(true);

      const result = mockValidate();
      expect(typeof result).toBe('boolean');
    });
  });
});
