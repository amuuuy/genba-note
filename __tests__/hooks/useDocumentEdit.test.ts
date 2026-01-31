/**
 * useDocumentEdit Pure Functions Tests
 *
 * Tests the validation and state shape logic.
 * Hook behavior requires React, tested via integration tests.
 */

// Mock expo-secure-store and domain services before imports
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

jest.mock('@/domain/document', () => ({
  createDocument: jest.fn(),
  getDocument: jest.fn(),
  updateDocument: jest.fn(),
  changeDocumentStatus: jest.fn(),
}));

import {
  validateFormValues,
  type DocumentFormValues,
} from '@/hooks/useDocumentEdit';
import type { LineItem, DocumentStatus } from '@/types';

describe('useDocumentEdit', () => {
  // Test helper to create valid form values
  function createValidFormValues(
    overrides: Partial<DocumentFormValues> = {}
  ): DocumentFormValues {
    return {
      type: 'estimate',
      clientName: 'テスト株式会社',
      clientAddress: '東京都渋谷区',
      subject: 'テスト工事',
      issueDate: '2026-01-31',
      validUntil: '2026-02-28',
      dueDate: '',
      paidAt: '',
      notes: '備考',
      ...overrides,
    };
  }

  // Test helper to create a valid line item
  function createValidLineItem(overrides: Partial<LineItem> = {}): LineItem {
    return {
      id: 'line-1',
      name: '工事A',
      quantityMilli: 1000,
      unit: '式',
      unitPrice: 10000,
      taxRate: 10,
      ...overrides,
    };
  }

  describe('validateFormValues', () => {
    describe('client name validation', () => {
      it('returns error when clientName is empty', () => {
        const values = createValidFormValues({ clientName: '' });
        const lineItems = [createValidLineItem()];
        const errors = validateFormValues(values, lineItems, 'draft');

        expect(errors.clientName).toBeDefined();
        expect(errors.clientName).toContain('required');
      });

      it('returns no error for valid clientName', () => {
        const values = createValidFormValues({ clientName: '山田建設' });
        const lineItems = [createValidLineItem()];
        const errors = validateFormValues(values, lineItems, 'draft');

        expect(errors.clientName).toBeUndefined();
      });

      it('returns error for whitespace-only clientName', () => {
        const values = createValidFormValues({ clientName: '   ' });
        const lineItems = [createValidLineItem()];
        const errors = validateFormValues(values, lineItems, 'draft');

        expect(errors.clientName).toBeDefined();
      });
    });

    describe('issue date validation', () => {
      it('returns error when issueDate is empty', () => {
        const values = createValidFormValues({ issueDate: '' });
        const lineItems = [createValidLineItem()];
        const errors = validateFormValues(values, lineItems, 'draft');

        expect(errors.issueDate).toBeDefined();
      });

      it('returns error for invalid date format', () => {
        const values = createValidFormValues({ issueDate: '2026/01/31' });
        const lineItems = [createValidLineItem()];
        const errors = validateFormValues(values, lineItems, 'draft');

        expect(errors.issueDate).toBeDefined();
      });

      it('returns no error for valid issueDate', () => {
        const values = createValidFormValues({ issueDate: '2026-01-31' });
        const lineItems = [createValidLineItem()];
        const errors = validateFormValues(values, lineItems, 'draft');

        expect(errors.issueDate).toBeUndefined();
      });
    });

    describe('validUntil validation (estimate)', () => {
      it('returns no error when validUntil is empty', () => {
        const values = createValidFormValues({ type: 'estimate', validUntil: '' });
        const lineItems = [createValidLineItem()];
        const errors = validateFormValues(values, lineItems, 'draft');

        expect(errors.validUntil).toBeUndefined();
      });

      it('returns error when validUntil is before issueDate', () => {
        const values = createValidFormValues({
          type: 'estimate',
          issueDate: '2026-02-01',
          validUntil: '2026-01-31',
        });
        const lineItems = [createValidLineItem()];
        const errors = validateFormValues(values, lineItems, 'draft');

        expect(errors.validUntil).toBeDefined();
      });

      it('returns no error when validUntil is on issueDate', () => {
        const values = createValidFormValues({
          type: 'estimate',
          issueDate: '2026-01-31',
          validUntil: '2026-01-31',
        });
        const lineItems = [createValidLineItem()];
        const errors = validateFormValues(values, lineItems, 'draft');

        expect(errors.validUntil).toBeUndefined();
      });
    });

    describe('dueDate validation (invoice)', () => {
      it('returns no error when dueDate is empty', () => {
        const values = createValidFormValues({ type: 'invoice', dueDate: '' });
        const lineItems = [createValidLineItem()];
        const errors = validateFormValues(values, lineItems, 'draft');

        expect(errors.dueDate).toBeUndefined();
      });

      it('returns error when dueDate is before issueDate', () => {
        const values = createValidFormValues({
          type: 'invoice',
          issueDate: '2026-02-01',
          dueDate: '2026-01-31',
        });
        const lineItems = [createValidLineItem()];
        const errors = validateFormValues(values, lineItems, 'draft');

        expect(errors.dueDate).toBeDefined();
      });
    });

    describe('line items validation', () => {
      it('returns error when no line items', () => {
        const values = createValidFormValues();
        const errors = validateFormValues(values, [], 'draft');

        expect(errors.lineItems).toBeDefined();
        expect(errors.lineItems).toContain('At least one');
      });

      it('returns no error with valid line items', () => {
        const values = createValidFormValues();
        const lineItems = [createValidLineItem()];
        const errors = validateFormValues(values, lineItems, 'draft');

        expect(errors.lineItems).toBeUndefined();
      });

      it('returns error for line item with empty name', () => {
        const values = createValidFormValues();
        const lineItems = [createValidLineItem({ name: '' })];
        const errors = validateFormValues(values, lineItems, 'draft');

        expect(errors.lineItems).toBeDefined();
      });
    });

    describe('complete form validation', () => {
      it('returns empty errors object for valid form', () => {
        const values = createValidFormValues();
        const lineItems = [createValidLineItem()];
        const errors = validateFormValues(values, lineItems, 'draft');

        expect(Object.keys(errors)).toHaveLength(0);
      });

      it('returns multiple errors for form with multiple issues', () => {
        const values = createValidFormValues({
          clientName: '',
          issueDate: '',
        });
        const errors = validateFormValues(values, [], 'draft');

        expect(errors.clientName).toBeDefined();
        expect(errors.issueDate).toBeDefined();
        expect(errors.lineItems).toBeDefined();
      });
    });
  });
});
