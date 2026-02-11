/**
 * Tests for PDF Validation Service
 *
 * Validates that documents have all required fields before PDF generation.
 */

import {
  validateDocumentForPdf,
  formatValidationError,
} from '@/pdf/pdfValidationService';
import { createTestDocument } from './helpers';

describe('pdfValidationService', () => {
  describe('validateDocumentForPdf', () => {
    describe('documentNo validation', () => {
      it('returns valid for document with documentNo', () => {
        const doc = createTestDocument({ documentNo: 'EST-001' });
        const result = validateDocumentForPdf(doc);
        expect(result.isValid).toBe(true);
        expect(result.missingFields).not.toContain('見積書番号');
      });

      it('returns invalid for estimate with empty documentNo', () => {
        const doc = createTestDocument({ type: 'estimate', documentNo: '' });
        const result = validateDocumentForPdf(doc);
        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('見積書番号');
      });

      it('returns invalid for invoice with empty documentNo', () => {
        const doc = createTestDocument({ type: 'invoice', documentNo: '', dueDate: '2026-02-28' });
        const result = validateDocumentForPdf(doc);
        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('請求書番号');
      });

      it('returns invalid for document with whitespace-only documentNo', () => {
        const doc = createTestDocument({ documentNo: '   ' });
        const result = validateDocumentForPdf(doc);
        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('見積書番号');
      });
    });

    describe('issueDate validation', () => {
      it('returns valid for document with issueDate', () => {
        const doc = createTestDocument({ issueDate: '2026-01-30' });
        const result = validateDocumentForPdf(doc);
        expect(result.isValid).toBe(true);
        expect(result.missingFields).not.toContain('発行日');
      });

      it('returns invalid for document with empty issueDate', () => {
        const doc = createTestDocument({ issueDate: '' });
        const result = validateDocumentForPdf(doc);
        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('発行日');
      });
    });

    describe('dueDate validation (invoice only)', () => {
      it('returns valid for invoice with dueDate', () => {
        const doc = createTestDocument({ type: 'invoice', dueDate: '2026-02-28' });
        const result = validateDocumentForPdf(doc);
        expect(result.isValid).toBe(true);
        expect(result.missingFields).not.toContain('支払期限');
      });

      it('returns invalid for invoice with empty dueDate', () => {
        const doc = createTestDocument({ type: 'invoice', dueDate: '' });
        const result = validateDocumentForPdf(doc);
        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('支払期限');
      });

      it('returns invalid for invoice with null dueDate', () => {
        const doc = createTestDocument({ type: 'invoice', dueDate: null });
        const result = validateDocumentForPdf(doc);
        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('支払期限');
      });

      it('returns valid for estimate without dueDate', () => {
        const doc = createTestDocument({ type: 'estimate', dueDate: null });
        const result = validateDocumentForPdf(doc);
        expect(result.missingFields).not.toContain('支払期限');
      });
    });

    describe('companyName validation', () => {
      it('returns valid for document with companyName', () => {
        const doc = createTestDocument({
          issuerSnapshot: {
            companyName: 'テスト株式会社',
            representativeName: null,
            address: null,
            phone: null,
            fax: null,
            sealImageBase64: null,
            contactPerson: null,
            email: null,
          },
        });
        const result = validateDocumentForPdf(doc);
        expect(result.missingFields).not.toContain('会社名');
      });

      it('returns invalid for document with null companyName', () => {
        const doc = createTestDocument({
          issuerSnapshot: {
            companyName: null,
            representativeName: null,
            address: null,
            phone: null,
            fax: null,
            sealImageBase64: null,
            contactPerson: null,
            email: null,
          },
        });
        const result = validateDocumentForPdf(doc);
        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('会社名');
      });

      it('returns invalid for document with empty companyName', () => {
        const doc = createTestDocument({
          issuerSnapshot: {
            companyName: '',
            representativeName: null,
            address: null,
            phone: null,
            fax: null,
            sealImageBase64: null,
            contactPerson: null,
            email: null,
          },
        });
        const result = validateDocumentForPdf(doc);
        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('会社名');
      });

      it('returns invalid for document with whitespace-only companyName', () => {
        const doc = createTestDocument({
          issuerSnapshot: {
            companyName: '   ',
            representativeName: null,
            address: null,
            phone: null,
            fax: null,
            sealImageBase64: null,
            contactPerson: null,
            email: null,
          },
        });
        const result = validateDocumentForPdf(doc);
        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('会社名');
      });
    });

    describe('clientName validation', () => {
      it('returns valid for document with clientName', () => {
        const doc = createTestDocument({ clientName: 'テスト顧客' });
        const result = validateDocumentForPdf(doc);
        expect(result.missingFields).not.toContain('取引先名');
      });

      it('returns invalid for document with empty clientName', () => {
        const doc = createTestDocument({ clientName: '' });
        const result = validateDocumentForPdf(doc);
        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('取引先名');
      });

      it('returns invalid for document with whitespace-only clientName', () => {
        const doc = createTestDocument({ clientName: '   ' });
        const result = validateDocumentForPdf(doc);
        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('取引先名');
      });
    });

    describe('lineItems validation', () => {
      it('returns valid for document with lineItems', () => {
        const doc = createTestDocument(); // createTestDocument includes one lineItem
        const result = validateDocumentForPdf(doc);
        expect(result.missingFields).not.toContain('明細');
      });

      it('returns invalid for document with empty lineItems', () => {
        const doc = createTestDocument({ lineItems: [] });
        const result = validateDocumentForPdf(doc);
        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('明細');
      });
    });

    describe('multiple missing fields', () => {
      it('returns all missing fields', () => {
        const doc = createTestDocument({
          documentNo: '',
          issueDate: '',
          clientName: '',
          lineItems: [],
          issuerSnapshot: {
            companyName: null,
            representativeName: null,
            address: null,
            phone: null,
            fax: null,
            sealImageBase64: null,
            contactPerson: null,
            email: null,
          },
        });
        const result = validateDocumentForPdf(doc);
        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('見積書番号');
        expect(result.missingFields).toContain('発行日');
        expect(result.missingFields).toContain('会社名');
        expect(result.missingFields).toContain('取引先名');
        expect(result.missingFields).toContain('明細');
      });

      it('includes dueDate for invoice with multiple missing fields', () => {
        const doc = createTestDocument({
          type: 'invoice',
          documentNo: '',
          dueDate: null,
        });
        const result = validateDocumentForPdf(doc);
        expect(result.isValid).toBe(false);
        expect(result.missingFields).toContain('請求書番号');
        expect(result.missingFields).toContain('支払期限');
      });
    });
  });

  describe('formatValidationError', () => {
    it('returns empty string for valid result', () => {
      const result = { isValid: true, missingFields: [] };
      expect(formatValidationError(result)).toBe('');
    });

    it('formats single missing field', () => {
      const result = { isValid: false, missingFields: ['請求書番号'] };
      const message = formatValidationError(result);
      expect(message).toBe('以下の項目を入力してください:\n請求書番号');
    });

    it('formats multiple missing fields', () => {
      const result = {
        isValid: false,
        missingFields: ['請求書番号', '発行日', '会社名'],
      };
      const message = formatValidationError(result);
      expect(message).toBe('以下の項目を入力してください:\n請求書番号\n発行日\n会社名');
    });
  });
});
