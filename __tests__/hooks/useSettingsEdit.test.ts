/**
 * useSettingsEdit Pure Functions Tests
 *
 * Tests the validation and state shape logic.
 * Hook behavior requires React, tested via integration tests.
 */

// Mock expo-secure-store and async-storage before imports
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

import {
  settingsEditReducer,
  initialSettingsEditState,
  createInitialFormValues,
  type SettingsEditState,
  type SettingsEditAction,
} from '@/hooks/useSettingsEdit';
import type { SettingsFormValues } from '@/domain/settings/types';
import { DEFAULT_APP_SETTINGS, DEFAULT_SENSITIVE_SETTINGS } from '@/types/settings';

describe('useSettingsEdit', () => {
  describe('createInitialFormValues', () => {
    it('creates form values from default settings', () => {
      const formValues = createInitialFormValues(
        DEFAULT_APP_SETTINGS,
        DEFAULT_SENSITIVE_SETTINGS
      );

      expect(formValues.companyName).toBe('');
      expect(formValues.representativeName).toBe('');
      expect(formValues.address).toBe('');
      expect(formValues.phone).toBe('');
      expect(formValues.estimatePrefix).toBe('EST-');
      expect(formValues.invoicePrefix).toBe('INV-');
      expect(formValues.invoiceNumber).toBe('');
      expect(formValues.bankName).toBe('');
      expect(formValues.branchName).toBe('');
      expect(formValues.accountType).toBe('');
      expect(formValues.accountNumber).toBe('');
      expect(formValues.accountHolderName).toBe('');
    });

    it('creates form values from populated settings', () => {
      const appSettings = {
        ...DEFAULT_APP_SETTINGS,
        issuer: {
          companyName: '株式会社テスト',
          representativeName: '山田太郎',
          address: '東京都渋谷区',
          phone: '03-1234-5678',
          fax: null,
          sealImageUri: null,
          contactPerson: null,
          showContactPerson: true,
          email: null,
        },
        numbering: {
          estimatePrefix: 'Q-',
          invoicePrefix: 'I-',
          nextEstimateNumber: 5,
          nextInvoiceNumber: 3,
        },
      };

      const sensitiveSettings = {
        invoiceNumber: 'T1234567890123',
        bankAccount: {
          bankName: 'テスト銀行',
          branchName: '渋谷支店',
          accountType: '普通' as const,
          accountNumber: '1234567',
          accountHolderName: 'カ）テスト',
        },
      };

      const formValues = createInitialFormValues(appSettings, sensitiveSettings);

      expect(formValues.companyName).toBe('株式会社テスト');
      expect(formValues.representativeName).toBe('山田太郎');
      expect(formValues.address).toBe('東京都渋谷区');
      expect(formValues.phone).toBe('03-1234-5678');
      expect(formValues.email).toBe('');
      expect(formValues.estimatePrefix).toBe('Q-');
      expect(formValues.invoicePrefix).toBe('I-');
      expect(formValues.invoiceNumber).toBe('T1234567890123');
      expect(formValues.bankName).toBe('テスト銀行');
      expect(formValues.branchName).toBe('渋谷支店');
      expect(formValues.accountType).toBe('普通');
      expect(formValues.accountNumber).toBe('1234567');
      expect(formValues.accountHolderName).toBe('カ）テスト');
    });

    it('handles null sensitive settings gracefully', () => {
      const formValues = createInitialFormValues(DEFAULT_APP_SETTINGS, null);

      expect(formValues.email).toBe('');
      expect(formValues.invoiceNumber).toBe('');
      expect(formValues.bankName).toBe('');
      expect(formValues.branchName).toBe('');
      expect(formValues.accountType).toBe('');
      expect(formValues.accountNumber).toBe('');
      expect(formValues.accountHolderName).toBe('');
    });
  });

  describe('settingsEditReducer', () => {
    const createTestState = (
      overrides: Partial<SettingsEditState> = {}
    ): SettingsEditState => ({
      ...initialSettingsEditState,
      ...overrides,
    });

    describe('START_LOADING action', () => {
      it('sets isLoading to true', () => {
        const state = createTestState();
        const action: SettingsEditAction = { type: 'START_LOADING' };

        const newState = settingsEditReducer(state, action);

        expect(newState.isLoading).toBe(true);
        expect(newState.errorMessage).toBeNull();
      });
    });

    describe('LOAD_SUCCESS action', () => {
      it('populates form values from loaded settings', () => {
        const state = createTestState({ isLoading: true });
        const action: SettingsEditAction = {
          type: 'LOAD_SUCCESS',
          appSettings: {
            ...DEFAULT_APP_SETTINGS,
            issuer: {
              companyName: '株式会社テスト',
              representativeName: null,
              address: null,
              phone: null,
              fax: null,
              sealImageUri: null,
              contactPerson: null,
              showContactPerson: true,
              email: null,
            },
          },
          sensitiveSettings: {
            invoiceNumber: 'T1234567890123',
            bankAccount: {
              bankName: null,
              branchName: null,
              accountType: null,
              accountNumber: null,
              accountHolderName: null,
            },
          },
        };

        const newState = settingsEditReducer(state, action);

        expect(newState.isLoading).toBe(false);
        expect(newState.values.companyName).toBe('株式会社テスト');
        expect(newState.values.email).toBe('');
        expect(newState.values.invoiceNumber).toBe('T1234567890123');
        expect(newState.nextEstimateNumber).toBe(1);
        expect(newState.nextInvoiceNumber).toBe(1);
        expect(newState.isDirty).toBe(false);
      });
    });

    describe('LOAD_ERROR action', () => {
      it('sets error message and stops loading', () => {
        const state = createTestState({ isLoading: true });
        const action: SettingsEditAction = {
          type: 'LOAD_ERROR',
          message: '読み込みに失敗しました',
        };

        const newState = settingsEditReducer(state, action);

        expect(newState.isLoading).toBe(false);
        expect(newState.errorMessage).toBe('読み込みに失敗しました');
      });
    });

    describe('UPDATE_FIELD action', () => {
      it('updates the specified field value', () => {
        const state = createTestState();
        const action: SettingsEditAction = {
          type: 'UPDATE_FIELD',
          field: 'companyName',
          value: '新会社名',
        };

        const newState = settingsEditReducer(state, action);

        expect(newState.values.companyName).toBe('新会社名');
        expect(newState.isDirty).toBe(true);
      });

      it('clears the error for the updated field', () => {
        const state = createTestState({
          errors: { companyName: 'Error', phone: 'Another error' },
        });
        const action: SettingsEditAction = {
          type: 'UPDATE_FIELD',
          field: 'companyName',
          value: '新会社名',
        };

        const newState = settingsEditReducer(state, action);

        expect(newState.errors.companyName).toBeUndefined();
        expect(newState.errors.phone).toBe('Another error');
      });

      it('sets isDirty to true on first change', () => {
        const state = createTestState({ isDirty: false });
        const action: SettingsEditAction = {
          type: 'UPDATE_FIELD',
          field: 'phone',
          value: '03-1111-2222',
        };

        const newState = settingsEditReducer(state, action);

        expect(newState.isDirty).toBe(true);
      });
    });

    describe('UPDATE_BACKGROUND_DESIGN action', () => {
      it('updates backgroundDesign and sets isDirty', () => {
        const state = createTestState();
        const action: SettingsEditAction = {
          type: 'UPDATE_BACKGROUND_DESIGN',
          value: 'STRIPE',
        };

        const newState = settingsEditReducer(state, action);

        expect(newState.values.backgroundDesign).toBe('STRIPE');
        expect(newState.isDirty).toBe(true);
      });
    });

    describe('SET_ERRORS action', () => {
      it('sets the errors object', () => {
        const state = createTestState();
        const errors = {
          estimatePrefix: 'プレフィックスは必須です',
          invoiceNumber: 'インボイス番号はT + 13桁で入力してください',
        };
        const action: SettingsEditAction = { type: 'SET_ERRORS', errors };

        const newState = settingsEditReducer(state, action);

        expect(newState.errors).toEqual(errors);
      });
    });

    describe('CLEAR_ERRORS action', () => {
      it('clears all errors', () => {
        const state = createTestState({
          errors: { companyName: 'Error', phone: 'Error' },
        });
        const action: SettingsEditAction = { type: 'CLEAR_ERRORS' };

        const newState = settingsEditReducer(state, action);

        expect(Object.keys(newState.errors)).toHaveLength(0);
      });
    });

    describe('START_SAVING action', () => {
      it('sets isSaving to true and clears errors', () => {
        const state = createTestState({
          errors: { companyName: 'Error' },
        });
        const action: SettingsEditAction = { type: 'START_SAVING' };

        const newState = settingsEditReducer(state, action);

        expect(newState.isSaving).toBe(true);
        expect(newState.errorMessage).toBeNull();
      });
    });

    describe('SAVE_SUCCESS action', () => {
      it('resets saving state and isDirty', () => {
        const state = createTestState({
          isSaving: true,
          isDirty: true,
        });
        const action: SettingsEditAction = { type: 'SAVE_SUCCESS' };

        const newState = settingsEditReducer(state, action);

        expect(newState.isSaving).toBe(false);
        expect(newState.isDirty).toBe(false);
        expect(newState.errorMessage).toBeNull();
      });
    });

    describe('SAVE_ERROR action', () => {
      it('sets error message and stops saving', () => {
        const state = createTestState({ isSaving: true });
        const action: SettingsEditAction = {
          type: 'SAVE_ERROR',
          message: '保存に失敗しました',
        };

        const newState = settingsEditReducer(state, action);

        expect(newState.isSaving).toBe(false);
        expect(newState.errorMessage).toBe('保存に失敗しました');
      });
    });
  });

  describe('initialSettingsEditState', () => {
    it('has correct initial values', () => {
      expect(initialSettingsEditState.isLoading).toBe(true);
      expect(initialSettingsEditState.isSaving).toBe(false);
      expect(initialSettingsEditState.isDirty).toBe(false);
      expect(initialSettingsEditState.errorMessage).toBeNull();
      expect(Object.keys(initialSettingsEditState.errors)).toHaveLength(0);
      expect(initialSettingsEditState.nextEstimateNumber).toBe(1);
      expect(initialSettingsEditState.nextInvoiceNumber).toBe(1);
    });

    it('has empty form values', () => {
      const { values } = initialSettingsEditState;
      expect(values.companyName).toBe('');
      expect(values.estimatePrefix).toBe('EST-');
      expect(values.invoicePrefix).toBe('INV-');
    });
  });
});
