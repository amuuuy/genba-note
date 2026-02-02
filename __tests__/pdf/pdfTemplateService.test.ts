/**
 * Tests for PDF Template Service
 *
 * TDD approach: These tests define the expected behavior of the template service.
 */

import {
  createTestTemplateInput,
  createTestDocumentWithTotals,
  createTestSensitiveSnapshot,
  createNullSensitiveSnapshot,
  createTestLineItem,
  resetTestIdCounter,
} from './helpers';
import { ESTIMATE_COLORS, INVOICE_COLORS, FORMAL_COLORS } from '@/pdf/types';
import {
  generateHtmlTemplate,
  getColorScheme,
  formatCurrency,
  formatQuantity,
  formatTaxRate,
  formatDate,
  generateDocumentTitle,
  generateFilenameTitle,
} from '@/pdf/pdfTemplateService';

describe('pdfTemplateService', () => {
  beforeEach(() => {
    resetTestIdCounter();
  });

  // === Color Scheme ===
  describe('getColorScheme', () => {
    it('returns blue scheme for estimate', () => {
      expect(getColorScheme('estimate')).toEqual(ESTIMATE_COLORS);
    });

    it('returns orange scheme for invoice', () => {
      expect(getColorScheme('invoice')).toEqual(INVOICE_COLORS);
    });
  });

  // === Formatting Functions ===
  describe('formatCurrency', () => {
    it('formats with thousand separators', () => {
      expect(formatCurrency(1234567)).toBe('1,234,567');
    });

    it('handles zero', () => {
      expect(formatCurrency(0)).toBe('0');
    });

    it('handles small numbers', () => {
      expect(formatCurrency(123)).toBe('123');
    });

    it('handles large numbers', () => {
      expect(formatCurrency(9999999999)).toBe('9,999,999,999');
    });
  });

  describe('formatQuantity', () => {
    it('displays whole numbers without decimals', () => {
      expect(formatQuantity(1000)).toBe('1');
      expect(formatQuantity(10000)).toBe('10');
    });

    it('displays decimals when present', () => {
      expect(formatQuantity(2500)).toBe('2.5');
      expect(formatQuantity(1001)).toBe('1.001');
    });

    it('trims trailing zeros', () => {
      expect(formatQuantity(1100)).toBe('1.1');
      expect(formatQuantity(1010)).toBe('1.01');
    });

    it('handles very small quantities', () => {
      expect(formatQuantity(1)).toBe('0.001');
    });
  });

  describe('formatTaxRate', () => {
    it('formats 10% rate', () => {
      expect(formatTaxRate(10)).toBe('10%');
    });

    it('formats 0% as non-taxable', () => {
      expect(formatTaxRate(0)).toBe('非課税');
    });
  });

  describe('formatDate', () => {
    it('formats to Japanese date format', () => {
      expect(formatDate('2026-01-30')).toBe('2026年1月30日');
    });

    it('handles single digit month and day', () => {
      expect(formatDate('2026-01-01')).toBe('2026年1月1日');
    });

    it('handles December', () => {
      expect(formatDate('2026-12-31')).toBe('2026年12月31日');
    });
  });

  describe('generateDocumentTitle', () => {
    it('returns 御見積書 for estimate', () => {
      expect(generateDocumentTitle('estimate')).toBe('御見積書');
    });

    it('returns 御請求書 for invoice', () => {
      expect(generateDocumentTitle('invoice')).toBe('御請求書');
    });
  });

  describe('generateFilenameTitle', () => {
    it('generates filename title for estimate', () => {
      expect(generateFilenameTitle('EST-001', 'estimate')).toBe('EST-001_見積書');
    });

    it('generates filename title for invoice', () => {
      expect(generateFilenameTitle('INV-042', 'invoice')).toBe('INV-042_請求書');
    });
  });

  // === Template Generation ===
  describe('generateHtmlTemplate', () => {
    describe('basic structure', () => {
      it('generates valid HTML doctype', () => {
        const input = createTestTemplateInput();
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('<!DOCTYPE html>');
        expect(result.html).toContain('<html lang="ja">');
        expect(result.html).toContain('</html>');
      });

      it('includes UTF-8 charset', () => {
        const input = createTestTemplateInput();
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('charset="UTF-8"');
      });

      it('returns correct title for estimate', () => {
        const input = createTestTemplateInput({
          document: { type: 'estimate', documentNo: 'EST-042' },
        });
        const result = generateHtmlTemplate(input);

        expect(result.title).toBe('EST-042_見積書');
      });

      it('returns correct title for invoice', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice', documentNo: 'INV-123' },
        });
        const result = generateHtmlTemplate(input);

        expect(result.title).toBe('INV-123_請求書');
      });
    });

    describe('color scheme', () => {
      it('uses blue colors for estimate', () => {
        const input = createTestTemplateInput({
          document: { type: 'estimate' },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain(ESTIMATE_COLORS.primary);
      });

      it('uses orange colors for invoice', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice' },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain(INVOICE_COLORS.primary);
      });
    });

    describe('template mode', () => {
      it('uses colorful screen theme by default (mode not specified)', () => {
        const input = createTestTemplateInput({
          document: { type: 'estimate' },
        });
        const result = generateHtmlTemplate(input);

        // Default mode should use document-type specific colors
        expect(result.html).toContain(ESTIMATE_COLORS.primary);
        expect(result.html).not.toContain(FORMAL_COLORS.primary);
      });

      it('uses colorful screen theme when mode is "screen"', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice' },
          mode: 'screen',
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain(INVOICE_COLORS.primary);
        expect(result.html).not.toContain(FORMAL_COLORS.primary);
      });

      it('uses formal monochrome theme when mode is "pdf"', () => {
        const input = createTestTemplateInput({
          document: { type: 'estimate' },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain(FORMAL_COLORS.primary);
        expect(result.html).not.toContain(ESTIMATE_COLORS.primary);
      });

      it('uses same formal colors for both estimate and invoice in pdf mode', () => {
        const estimateInput = createTestTemplateInput({
          document: { type: 'estimate' },
          mode: 'pdf',
        });
        const invoiceInput = createTestTemplateInput({
          document: { type: 'invoice' },
          mode: 'pdf',
        });

        const estimateResult = generateHtmlTemplate(estimateInput);
        const invoiceResult = generateHtmlTemplate(invoiceInput);

        // Both should use FORMAL_COLORS
        expect(estimateResult.html).toContain(FORMAL_COLORS.primary);
        expect(invoiceResult.html).toContain(FORMAL_COLORS.primary);

        // Neither should use document-type specific colors
        expect(estimateResult.html).not.toContain(ESTIMATE_COLORS.primary);
        expect(invoiceResult.html).not.toContain(INVOICE_COLORS.primary);
      });

      it('pdf mode includes formal theme CSS (transparent backgrounds)', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice' },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        // Formal theme uses transparent background for headers
        expect(result.html).toContain('background: transparent');
      });

      it('screen mode includes screen theme CSS (colored backgrounds)', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice' },
          mode: 'screen',
        });
        const result = generateHtmlTemplate(input);

        // Screen theme uses colored background
        expect(result.html).toContain(INVOICE_COLORS.background);
      });
    });

    describe('document title', () => {
      it('shows 御見積書 for estimate', () => {
        const input = createTestTemplateInput({
          document: { type: 'estimate' },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('御見積書');
      });

      it('shows 御請求書 for invoice', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice' },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('御請求書');
      });
    });

    describe('header section', () => {
      it('displays document number', () => {
        const input = createTestTemplateInput({
          document: { documentNo: 'EST-999' },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('EST-999');
      });

      it('displays issue date in Japanese format', () => {
        const input = createTestTemplateInput({
          document: { issueDate: '2026-03-15' },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('2026年3月15日');
      });
    });

    describe('client information', () => {
      it('displays client name', () => {
        const input = createTestTemplateInput({
          document: { clientName: '株式会社サンプル' },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('株式会社サンプル');
      });

      it('displays client address when set', () => {
        const input = createTestTemplateInput({
          document: { clientAddress: '東京都港区六本木1-1-1' },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('東京都港区六本木1-1-1');
      });

      it('omits client address when null', () => {
        const input = createTestTemplateInput({
          document: { clientAddress: null },
        });
        const result = generateHtmlTemplate(input);

        // Should not have address element (CSS class definition is ok)
        expect(result.html).not.toContain('<div class="client-address">');
      });
    });

    describe('subject', () => {
      it('displays subject when set', () => {
        const input = createTestTemplateInput({
          document: { subject: 'マンション外壁塗装工事' },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('マンション外壁塗装工事');
      });

      it('omits subject section when null', () => {
        const input = createTestTemplateInput({
          document: { subject: null },
        });
        const result = generateHtmlTemplate(input);

        // Should not have subject element (CSS class definition is ok)
        expect(result.html).not.toContain('<div class="subject-section">');
      });
    });

    describe('due date (invoice only)', () => {
      it('displays due date for invoice when set', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice', dueDate: '2026-02-28' },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('お支払期限');
        expect(result.html).toContain('2026年2月28日');
      });

      it('omits due date for invoice when null', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice', dueDate: null },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).not.toContain('お支払期限');
      });

      it('omits due date section for estimate', () => {
        const input = createTestTemplateInput({
          document: { type: 'estimate', dueDate: '2026-02-28' },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).not.toContain('お支払期限');
      });
    });

    describe('total amount', () => {
      it('displays total amount with currency formatting', () => {
        const input = createTestTemplateInput({
          document: { totalYen: 1234567 },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('1,234,567');
      });
    });

    describe('line items table', () => {
      it('displays line item details', () => {
        const lineItem = createTestLineItem({
          name: '外壁塗装',
          quantityMilli: 2500, // 2.5
          unit: 'm²',
          unitPrice: 5000,
          taxRate: 10,
        });
        const input = createTestTemplateInput({
          document: { lineItems: [lineItem] },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('外壁塗装');
        expect(result.html).toContain('2.5');
        expect(result.html).toContain('m²');
        expect(result.html).toContain('5,000');
        expect(result.html).toContain('10%');
      });

      it('displays multiple line items', () => {
        const items = [
          createTestLineItem({ name: '工事A' }),
          createTestLineItem({ name: '工事B' }),
          createTestLineItem({ name: '工事C' }),
        ];
        const input = createTestTemplateInput({
          document: { lineItems: items },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('工事A');
        expect(result.html).toContain('工事B');
        expect(result.html).toContain('工事C');
      });
    });

    describe('totals section', () => {
      it('displays subtotal', () => {
        const input = createTestTemplateInput({
          document: { subtotalYen: 100000 },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('小計');
        expect(result.html).toContain('100,000');
      });

      it('displays tax breakdown with 10% first, then 0%', () => {
        const input = createTestTemplateInput({
          document: {
            taxBreakdown: [
              { rate: 10, subtotal: 100000, tax: 10000 },
              { rate: 0, subtotal: 50000, tax: 0 },
            ],
          },
        });
        const result = generateHtmlTemplate(input);

        const pos10 = result.html.indexOf('10%対象');
        const pos0 = result.html.indexOf('非課税対象');
        expect(pos10).toBeGreaterThan(-1);
        expect(pos0).toBeGreaterThan(-1);
        expect(pos10).toBeLessThan(pos0);
      });

      it('displays total with tax', () => {
        const input = createTestTemplateInput({
          document: { totalYen: 110000 },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('110,000');
      });
    });

    describe('notes', () => {
      it('displays notes when set', () => {
        const input = createTestTemplateInput({
          document: { notes: '工期は約2週間を予定しております。' },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('備考');
        expect(result.html).toContain('工期は約2週間を予定しております。');
      });

      it('omits notes section when null', () => {
        const input = createTestTemplateInput({
          document: { notes: null },
        });
        const result = generateHtmlTemplate(input);

        // Should not have notes element (CSS class definition is ok)
        expect(result.html).not.toContain('<div class="notes-section">');
      });
    });

    describe('bank information (invoice only)', () => {
      it('displays bank info for invoice when set', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice' },
          sensitiveSnapshot: createTestSensitiveSnapshot({
            bankName: '三菱UFJ銀行',
            branchName: '新宿',
            accountType: '普通',
            accountNumber: '7654321',
            accountHolderName: '株式会社テスト',
          }),
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('お振込先');
        expect(result.html).toContain('三菱UFJ銀行');
        expect(result.html).toContain('新宿');
        expect(result.html).toContain('普通');
        expect(result.html).toContain('7654321');
        expect(result.html).toContain('株式会社テスト');
      });

      it('omits bank section for estimate even if bank info exists', () => {
        const input = createTestTemplateInput({
          document: { type: 'estimate' },
          sensitiveSnapshot: createTestSensitiveSnapshot(),
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).not.toContain('お振込先');
      });

      it('omits bank section for invoice when all bank fields are null', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice' },
          sensitiveSnapshot: createNullSensitiveSnapshot(),
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).not.toContain('お振込先');
      });

      it('omits bank section when sensitive snapshot is null', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice' },
          sensitiveSnapshot: null,
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).not.toContain('お振込先');
      });

      it('shows partial bank info when some fields are null', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice' },
          sensitiveSnapshot: createTestSensitiveSnapshot({
            bankName: '楽天銀行',
            branchName: null,
            accountType: '普通',
            accountNumber: '1111111',
            accountHolderName: null,
          }),
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('お振込先');
        expect(result.html).toContain('楽天銀行');
        expect(result.html).toContain('1111111');
      });
    });

    describe('issuer information', () => {
      it('displays issuer info when set', () => {
        const input = createTestTemplateInput({
          document: {
            issuerSnapshot: {
              companyName: '施工会社株式会社',
              representativeName: '佐藤一郎',
              address: '愛知県名古屋市中区1-1',
              phone: '052-123-4567',
              fax: null,
              sealImageBase64: null,
              contactPerson: null,
            },
          },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('施工会社株式会社');
        expect(result.html).toContain('佐藤一郎');
        expect(result.html).toContain('愛知県名古屋市中区1-1');
        expect(result.html).toContain('052-123-4567');
      });

      it('displays invoice number when set', () => {
        const input = createTestTemplateInput({
          sensitiveSnapshot: createTestSensitiveSnapshot({
            invoiceNumber: 'T9876543210123',
          }),
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('登録番号');
        expect(result.html).toContain('T9876543210123');
      });

      it('omits invoice number when null', () => {
        const input = createTestTemplateInput({
          sensitiveSnapshot: createTestSensitiveSnapshot({
            invoiceNumber: null,
          }),
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).not.toContain('登録番号');
      });

      it('handles partial issuer info (some fields null)', () => {
        const input = createTestTemplateInput({
          document: {
            issuerSnapshot: {
              companyName: '株式会社ABC',
              representativeName: null,
              address: null,
              phone: '090-1234-5678',
              fax: null,
              sealImageBase64: null,
              contactPerson: null,
            },
          },
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('株式会社ABC');
        expect(result.html).toContain('090-1234-5678');
      });

      it('omits issuer section when all issuerSnapshot fields are null', () => {
        const input = createTestTemplateInput({
          document: {
            issuerSnapshot: {
              companyName: null,
              representativeName: null,
              address: null,
              phone: null,
              fax: null,
              sealImageBase64: null,
              contactPerson: null,
            },
          },
          sensitiveSnapshot: null,
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).not.toContain('<div class="issuer-section">');
      });

      it('shows issuer section with only invoice number when issuerSnapshot is empty but sensitiveSnapshot has invoice number', () => {
        const input = createTestTemplateInput({
          document: {
            issuerSnapshot: {
              companyName: null,
              representativeName: null,
              address: null,
              phone: null,
              fax: null,
              sealImageBase64: null,
              contactPerson: null,
            },
          },
          sensitiveSnapshot: createTestSensitiveSnapshot({
            invoiceNumber: 'T1234567890123',
            bankName: null,
            branchName: null,
            accountType: null,
            accountNumber: null,
            accountHolderName: null,
          }),
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('<div class="issuer-section">');
        expect(result.html).toContain('登録番号');
        expect(result.html).toContain('T1234567890123');
      });

      it('generates valid HTML when all issuer data is missing', () => {
        const input = createTestTemplateInput({
          document: {
            issuerSnapshot: {
              companyName: null,
              representativeName: null,
              address: null,
              phone: null,
              fax: null,
              sealImageBase64: null,
              contactPerson: null,
            },
          },
          sensitiveSnapshot: null,
        });
        const result = generateHtmlTemplate(input);

        // Should generate valid HTML without errors
        expect(result.html).toContain('<!DOCTYPE html>');
        expect(result.html).toContain('</html>');
        // Other sections should still render
        expect(result.html).toContain('<div class="header">');
        expect(result.html).toContain('<div class="client-section">');
      });
    });

    describe('fonts', () => {
      it('includes Hiragino Kaku Gothic Pro font', () => {
        const input = createTestTemplateInput();
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('Hiragino Kaku Gothic Pro');
      });

      it('includes Noto Sans JP as fallback', () => {
        const input = createTestTemplateInput();
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('Noto Sans JP');
      });
    });
  });
});
