/**
 * useCustomerEdit Hook
 *
 * Manages customer form state for creating or editing a customer.
 */

import { useReducer, useEffect, useCallback } from 'react';
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from '@/types/customer';
import {
  getCustomer,
  createCustomer,
  updateCustomer,
} from '@/domain/customer';

/**
 * Customer form values
 */
export interface CustomerFormValues {
  name: string;
  address: string;
  phone: string;
  email: string;
}

/**
 * Form validation errors
 */
export interface CustomerFormErrors {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
}

/**
 * Customer edit state
 */
export interface CustomerEditState {
  values: CustomerFormValues;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  errors: CustomerFormErrors;
  errorMessage: string | null;
}

/**
 * Customer edit actions
 */
type CustomerEditAction =
  | { type: 'START_LOADING' }
  | { type: 'LOAD_SUCCESS'; customer: Customer }
  | { type: 'LOAD_NEW' }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'UPDATE_FIELD'; field: keyof CustomerFormValues; value: string }
  | { type: 'SET_ERRORS'; errors: CustomerFormErrors }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'START_SAVING' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; message: string };

/**
 * Initial form values
 */
const initialFormValues: CustomerFormValues = {
  name: '',
  address: '',
  phone: '',
  email: '',
};

/**
 * Initial state
 */
const initialState: CustomerEditState = {
  values: initialFormValues,
  isLoading: true,
  isSaving: false,
  isDirty: false,
  errors: {},
  errorMessage: null,
};

/**
 * Create form values from a customer
 */
function customerToFormValues(customer: Customer): CustomerFormValues {
  return {
    name: customer.name,
    address: customer.address ?? '',
    phone: customer.contact.phone ?? '',
    email: customer.contact.email ?? '',
  };
}

/**
 * Reducer for customer edit state
 */
function customerEditReducer(
  state: CustomerEditState,
  action: CustomerEditAction
): CustomerEditState {
  switch (action.type) {
    case 'START_LOADING':
      return {
        ...state,
        isLoading: true,
        errorMessage: null,
      };

    case 'LOAD_SUCCESS':
      return {
        ...state,
        isLoading: false,
        values: customerToFormValues(action.customer),
        isDirty: false,
        errors: {},
        errorMessage: null,
      };

    case 'LOAD_NEW':
      return {
        ...state,
        isLoading: false,
        values: initialFormValues,
        isDirty: false,
        errors: {},
        errorMessage: null,
      };

    case 'LOAD_ERROR':
      return {
        ...state,
        isLoading: false,
        errorMessage: action.message,
      };

    case 'UPDATE_FIELD': {
      // Remove error for the updated field
      const { [action.field]: _removed, ...remainingErrors } = state.errors;
      return {
        ...state,
        values: {
          ...state.values,
          [action.field]: action.value,
        },
        errors: remainingErrors,
        isDirty: true,
      };
    }

    case 'SET_ERRORS':
      return {
        ...state,
        errors: action.errors,
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: {},
      };

    case 'START_SAVING':
      return {
        ...state,
        isSaving: true,
        errorMessage: null,
      };

    case 'SAVE_SUCCESS':
      return {
        ...state,
        isSaving: false,
        isDirty: false,
        errorMessage: null,
      };

    case 'SAVE_ERROR':
      return {
        ...state,
        isSaving: false,
        errorMessage: action.message,
      };

    default:
      return state;
  }
}

/**
 * Validate customer form
 */
function validateCustomerForm(values: CustomerFormValues): CustomerFormErrors {
  const errors: CustomerFormErrors = {};

  // Name is required
  if (!values.name || values.name.trim().length === 0) {
    errors.name = '顧客名は必須です';
  }

  // Email format validation (if provided)
  if (values.email && values.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(values.email)) {
      errors.email = 'メールアドレスの形式が正しくありません';
    }
  }

  return errors;
}

/**
 * Return type for useCustomerEdit hook
 */
export interface UseCustomerEditReturn {
  state: CustomerEditState;
  updateField: (field: keyof CustomerFormValues, value: string) => void;
  save: () => Promise<Customer | null>;
  validate: () => boolean;
  reload: () => Promise<void>;
}

/**
 * Hook for managing customer form state
 *
 * @param customerId - Customer ID to edit (null for new customer)
 */
export function useCustomerEdit(customerId: string | null): UseCustomerEditReturn {
  const [state, dispatch] = useReducer(customerEditReducer, initialState);

  // Load/reload customer
  const reload = useCallback(async () => {
    if (!customerId) {
      // New customer
      dispatch({ type: 'LOAD_NEW' });
      return;
    }

    dispatch({ type: 'START_LOADING' });

    try {
      const result = await getCustomer(customerId);

      if (result.success && result.data) {
        dispatch({ type: 'LOAD_SUCCESS', customer: result.data });
      } else if (result.success && result.data === null) {
        // Customer not found
        dispatch({ type: 'LOAD_ERROR', message: '顧客が見つかりません' });
      } else {
        dispatch({
          type: 'LOAD_ERROR',
          message: result.error?.message ?? '顧客の読み込みに失敗しました',
        });
      }
    } catch {
      dispatch({
        type: 'LOAD_ERROR',
        message: '顧客の読み込みに失敗しました',
      });
    }
  }, [customerId]);

  // Load on mount and when customerId changes
  useEffect(() => {
    reload();
  }, [reload]);

  // Update a single field
  const updateField = useCallback(
    (field: keyof CustomerFormValues, value: string) => {
      dispatch({ type: 'UPDATE_FIELD', field, value });
    },
    []
  );

  // Validate the form
  const validate = useCallback((): boolean => {
    const errors = validateCustomerForm(state.values);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors });
      return false;
    }
    dispatch({ type: 'CLEAR_ERRORS' });
    return true;
  }, [state.values]);

  // Save customer
  const save = useCallback(async (): Promise<Customer | null> => {
    // Validate first
    const errors = validateCustomerForm(state.values);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors });
      return null;
    }

    dispatch({ type: 'START_SAVING' });

    try {
      if (customerId) {
        // Update existing customer
        const updateInput: UpdateCustomerInput = {
          name: state.values.name.trim(),
          address: state.values.address.trim() || null,
          phone: state.values.phone.trim() || null,
          email: state.values.email.trim() || null,
        };

        const result = await updateCustomer(customerId, updateInput);

        if (result.success && result.data) {
          dispatch({ type: 'SAVE_SUCCESS' });
          return result.data;
        } else {
          throw new Error(result.error?.message ?? '保存に失敗しました');
        }
      } else {
        // Create new customer
        const createInput: CreateCustomerInput = {
          name: state.values.name.trim(),
          address: state.values.address.trim() || null,
          phone: state.values.phone.trim() || null,
          email: state.values.email.trim() || null,
        };

        const result = await createCustomer(createInput);

        if (result.success && result.data) {
          dispatch({ type: 'SAVE_SUCCESS' });
          return result.data;
        } else {
          throw new Error(result.error?.message ?? '保存に失敗しました');
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '保存に失敗しました';
      dispatch({ type: 'SAVE_ERROR', message });
      return null;
    }
  }, [customerId, state.values]);

  return {
    state,
    updateField,
    save,
    validate,
    reload,
  };
}
