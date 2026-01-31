/**
 * Settings Validation Service Tests
 *
 * TDD RED phase: Tests written before implementation
 */

import {
  validateInvoiceNumber,
  validatePrefix,
  validateAccountNumber,
  validateSettingsForm,
} from '../../../src/domain/settings/validationService';
import {
  createValidSettingsFormValues,
  createEmptySettingsFormValues,
} from './helpers';

describe('validationService', () => {
  describe('validateInvoiceNumber', () => {
    describe('valid cases', () => {
      it('returns null for valid invoice number (T + 13 digits)', () => {
        expect(validateInvoiceNumber('T1234567890123')).toBeNull();
      });

      it('returns null for another valid invoice number', () => {
        expect(validateInvoiceNumber('T9876543210987')).toBeNull();
      });

      it('returns null for empty string (optional field)', () => {
        expect(validateInvoiceNumber('')).toBeNull();
      });

      it('returns null for null (optional field)', () => {
        expect(validateInvoiceNumber(null)).toBeNull();
      });
    });

    describe('invalid cases', () => {
      it('returns error for missing T prefix', () => {
        const error = validateInvoiceNumber('1234567890123');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('INVALID_FORMAT');
        expect(error?.field).toBe('invoiceNumber');
      });

      it('returns error for lowercase t prefix', () => {
        const error = validateInvoiceNumber('t1234567890123');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('INVALID_FORMAT');
      });

      it('returns error for too few digits (12 digits)', () => {
        const error = validateInvoiceNumber('T123456789012');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('INVALID_FORMAT');
      });

      it('returns error for too many digits (14 digits)', () => {
        const error = validateInvoiceNumber('T12345678901234');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('INVALID_FORMAT');
      });

      it('returns error for non-numeric characters after T', () => {
        const error = validateInvoiceNumber('T123456789012A');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('INVALID_FORMAT');
      });

      it('returns error for whitespace only', () => {
        const error = validateInvoiceNumber('   ');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('INVALID_FORMAT');
      });
    });
  });

  describe('validatePrefix', () => {
    describe('valid cases', () => {
      it('returns null for valid prefix with hyphen', () => {
        expect(validatePrefix('EST-')).toBeNull();
      });

      it('returns null for valid prefix with underscore', () => {
        expect(validatePrefix('QUOTE_')).toBeNull();
      });

      it('returns null for single character prefix', () => {
        expect(validatePrefix('E')).toBeNull();
      });

      it('returns null for 10 character prefix (max length)', () => {
        expect(validatePrefix('ABCDEFGHIJ')).toBeNull();
      });

      it('returns null for mixed case alphanumeric', () => {
        expect(validatePrefix('Est2025-')).toBeNull();
      });

      it('returns null for numeric only prefix', () => {
        expect(validatePrefix('2025')).toBeNull();
      });
    });

    describe('invalid cases', () => {
      it('returns error for empty string', () => {
        const error = validatePrefix('');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('REQUIRED');
        expect(error?.field).toBe('prefix');
      });

      it('returns error for whitespace only', () => {
        const error = validatePrefix('   ');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('REQUIRED');
      });

      it('returns error for prefix > 10 characters', () => {
        const error = validatePrefix('ABCDEFGHIJK');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('INVALID_FORMAT');
      });

      it('returns error for invalid characters (@)', () => {
        const error = validatePrefix('EST@');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('INVALID_FORMAT');
      });

      it('returns error for invalid characters (#)', () => {
        const error = validatePrefix('INV#');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('INVALID_FORMAT');
      });

      it('returns error for Japanese characters', () => {
        const error = validatePrefix('見積');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('INVALID_FORMAT');
      });

      it('returns error for spaces in prefix', () => {
        const error = validatePrefix('EST ');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('INVALID_FORMAT');
      });
    });
  });

  describe('validateAccountNumber', () => {
    describe('valid cases', () => {
      it('returns null for valid 7-digit account number', () => {
        expect(validateAccountNumber('1234567')).toBeNull();
      });

      it('returns null for account number starting with 0', () => {
        expect(validateAccountNumber('0123456')).toBeNull();
      });

      it('returns null for empty string (optional field)', () => {
        expect(validateAccountNumber('')).toBeNull();
      });

      it('returns null for null (optional field)', () => {
        expect(validateAccountNumber(null)).toBeNull();
      });
    });

    describe('invalid cases', () => {
      it('returns error for 6 digits (too short)', () => {
        const error = validateAccountNumber('123456');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('INVALID_FORMAT');
        expect(error?.field).toBe('accountNumber');
      });

      it('returns error for 8 digits (too long)', () => {
        const error = validateAccountNumber('12345678');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('INVALID_FORMAT');
      });

      it('returns error for non-numeric characters', () => {
        const error = validateAccountNumber('123456A');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('INVALID_FORMAT');
      });

      it('returns error for hyphenated format', () => {
        const error = validateAccountNumber('123-4567');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('INVALID_FORMAT');
      });

      it('returns error for whitespace only', () => {
        const error = validateAccountNumber('   ');
        expect(error).not.toBeNull();
        expect(error?.code).toBe('INVALID_FORMAT');
      });
    });
  });

  describe('validateSettingsForm', () => {
    describe('valid form', () => {
      it('returns empty errors object for valid settings', () => {
        const settings = createValidSettingsFormValues();
        const errors = validateSettingsForm(settings);
        expect(Object.keys(errors)).toHaveLength(0);
      });

      it('returns empty errors for empty optional fields', () => {
        const settings = createEmptySettingsFormValues();
        const errors = validateSettingsForm(settings);
        expect(Object.keys(errors)).toHaveLength(0);
      });

      it('returns empty errors for partially filled settings', () => {
        const settings = createValidSettingsFormValues({
          companyName: '',
          phone: '',
          invoiceNumber: '',
          bankName: '',
        });
        const errors = validateSettingsForm(settings);
        expect(Object.keys(errors)).toHaveLength(0);
      });
    });

    describe('invalid invoice number', () => {
      it('returns error for invalid invoice number format', () => {
        const settings = createValidSettingsFormValues({
          invoiceNumber: '123',
        });
        const errors = validateSettingsForm(settings);
        expect(errors.invoiceNumber).toBeDefined();
      });

      it('returns error for invoice number with wrong length', () => {
        const settings = createValidSettingsFormValues({
          invoiceNumber: 'T123456789',
        });
        const errors = validateSettingsForm(settings);
        expect(errors.invoiceNumber).toBeDefined();
      });
    });

    describe('invalid prefix', () => {
      it('returns error for empty estimate prefix', () => {
        const settings = createValidSettingsFormValues({
          estimatePrefix: '',
        });
        const errors = validateSettingsForm(settings);
        expect(errors.estimatePrefix).toBeDefined();
      });

      it('returns error for empty invoice prefix', () => {
        const settings = createValidSettingsFormValues({
          invoicePrefix: '',
        });
        const errors = validateSettingsForm(settings);
        expect(errors.invoicePrefix).toBeDefined();
      });

      it('returns error for invalid estimate prefix characters', () => {
        const settings = createValidSettingsFormValues({
          estimatePrefix: 'EST@#',
        });
        const errors = validateSettingsForm(settings);
        expect(errors.estimatePrefix).toBeDefined();
      });

      it('returns error for invalid invoice prefix characters', () => {
        const settings = createValidSettingsFormValues({
          invoicePrefix: 'INV 001',
        });
        const errors = validateSettingsForm(settings);
        expect(errors.invoicePrefix).toBeDefined();
      });
    });

    describe('invalid account number', () => {
      it('returns error for account number with wrong length', () => {
        const settings = createValidSettingsFormValues({
          accountNumber: '123456',
        });
        const errors = validateSettingsForm(settings);
        expect(errors.accountNumber).toBeDefined();
      });

      it('returns error for non-numeric account number', () => {
        const settings = createValidSettingsFormValues({
          accountNumber: '123456A',
        });
        const errors = validateSettingsForm(settings);
        expect(errors.accountNumber).toBeDefined();
      });
    });

    describe('multiple errors', () => {
      it('returns all errors for multiple invalid fields', () => {
        const settings = createValidSettingsFormValues({
          invoiceNumber: 'invalid',
          estimatePrefix: '',
          accountNumber: 'abc',
        });
        const errors = validateSettingsForm(settings);
        expect(errors.invoiceNumber).toBeDefined();
        expect(errors.estimatePrefix).toBeDefined();
        expect(errors.accountNumber).toBeDefined();
      });
    });
  });
});
