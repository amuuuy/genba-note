/**
 * Settings Validation Service
 *
 * Pure functions for validating settings form values.
 */

import type { ValidationError, SettingsFormValues, SettingsFormErrors } from './types';
import {
  INVOICE_NUMBER_PATTERN,
  PREFIX_PATTERN,
} from '@/utils/constants';

/**
 * Account number pattern: exactly 7 digits
 */
const ACCOUNT_NUMBER_PATTERN = /^\d{7}$/;

/**
 * Validates invoice number format (T + 13 digits)
 * Returns null if valid or empty (optional field)
 */
export function validateInvoiceNumber(
  value: string | null
): ValidationError | null {
  // Null or empty is valid (optional field)
  if (value === null || value === '') {
    return null;
  }

  // Trim and check if only whitespace
  const trimmed = value.trim();
  if (trimmed === '') {
    return {
      code: 'INVALID_FORMAT',
      field: 'invoiceNumber',
      message: 'インボイス番号はT + 13桁の数字で入力してください',
    };
  }

  // Check pattern
  if (!INVOICE_NUMBER_PATTERN.test(value)) {
    return {
      code: 'INVALID_FORMAT',
      field: 'invoiceNumber',
      message: 'インボイス番号はT + 13桁の数字で入力してください',
    };
  }

  return null;
}

/**
 * Validates prefix format (1-10 chars, alphanumeric/-/_)
 * Returns null if valid, error if invalid or empty (required field)
 */
export function validatePrefix(value: string): ValidationError | null {
  // Empty or whitespace only is not allowed (required field)
  if (!value || value.trim() === '') {
    return {
      code: 'REQUIRED',
      field: 'prefix',
      message: 'プレフィックスは必須です',
    };
  }

  // Check pattern
  if (!PREFIX_PATTERN.test(value)) {
    return {
      code: 'INVALID_FORMAT',
      field: 'prefix',
      message: 'プレフィックスは半角英数字、ハイフン、アンダースコアで1〜10文字です',
    };
  }

  return null;
}

/**
 * Validates account number format (7 digits)
 * Returns null if valid or empty (optional field)
 */
export function validateAccountNumber(
  value: string | null
): ValidationError | null {
  // Null or empty is valid (optional field)
  if (value === null || value === '') {
    return null;
  }

  // Trim and check if only whitespace
  const trimmed = value.trim();
  if (trimmed === '') {
    return {
      code: 'INVALID_FORMAT',
      field: 'accountNumber',
      message: '口座番号は7桁の数字で入力してください',
    };
  }

  // Check pattern
  if (!ACCOUNT_NUMBER_PATTERN.test(value)) {
    return {
      code: 'INVALID_FORMAT',
      field: 'accountNumber',
      message: '口座番号は7桁の数字で入力してください',
    };
  }

  return null;
}

/**
 * Validates all settings form fields
 * Returns map of field name -> error message
 */
export function validateSettingsForm(
  values: SettingsFormValues
): SettingsFormErrors {
  const errors: SettingsFormErrors = {};

  // Validate invoice number (optional but must be valid format if provided)
  const invoiceNumberError = validateInvoiceNumber(values.invoiceNumber);
  if (invoiceNumberError) {
    errors.invoiceNumber = invoiceNumberError.message;
  }

  // Validate estimate prefix (required)
  const estimatePrefixError = validatePrefix(values.estimatePrefix);
  if (estimatePrefixError) {
    errors.estimatePrefix = estimatePrefixError.message;
  }

  // Validate invoice prefix (required)
  const invoicePrefixError = validatePrefix(values.invoicePrefix);
  if (invoicePrefixError) {
    errors.invoicePrefix = invoicePrefixError.message;
  }

  // Validate account number (optional but must be valid format if provided)
  const accountNumberError = validateAccountNumber(values.accountNumber);
  if (accountNumberError) {
    errors.accountNumber = accountNumberError.message;
  }

  return errors;
}
