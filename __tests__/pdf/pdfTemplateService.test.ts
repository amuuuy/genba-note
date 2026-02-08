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
  parseAddressWithPostalCode,
  injectLandscapeCss,
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

  // === Address Parsing ===
  describe('parseAddressWithPostalCode', () => {
    it('parses address with 〒 prefix postal code', () => {
      const result = parseAddressWithPostalCode('〒100-0001 東京都千代田区千代田1-1-1');
      expect(result.postalCode).toBe('〒100-0001');
      expect(result.addressLine1).toBe('東京都千代田区千代田1-1-1');
      expect(result.addressLine2).toBeNull();
    });

    it('parses address with postal code without 〒 prefix', () => {
      const result = parseAddressWithPostalCode('160-0000 東京都新宿区1-2-3');
      expect(result.postalCode).toBe('〒160-0000');
      expect(result.addressLine1).toBe('東京都新宿区1-2-3');
    });

    it('parses postal code without hyphen', () => {
      const result = parseAddressWithPostalCode('1000001 東京都千代田区');
      expect(result.postalCode).toBe('〒100-0001');
      expect(result.addressLine1).toBe('東京都千代田区');
    });

    it('splits multi-line address with newline', () => {
      const result = parseAddressWithPostalCode('〒100-0001 東京都千代田区千代田1-1-1\nサンプルビル3階');
      expect(result.postalCode).toBe('〒100-0001');
      expect(result.addressLine1).toBe('東京都千代田区千代田1-1-1');
      expect(result.addressLine2).toBe('サンプルビル3階');
    });

    it('splits multi-line address with double full-width space', () => {
      const result = parseAddressWithPostalCode('〒100-0001 東京都千代田区　　サンプルビル');
      expect(result.postalCode).toBe('〒100-0001');
      expect(result.addressLine1).toBe('東京都千代田区');
      expect(result.addressLine2).toBe('サンプルビル');
    });

    it('handles address without postal code', () => {
      const result = parseAddressWithPostalCode('東京都渋谷区');
      expect(result.postalCode).toBeNull();
      expect(result.addressLine1).toBe('東京都渋谷区');
      expect(result.addressLine2).toBeNull();
    });

    it('splits address without postal code using double full-width space', () => {
      const result = parseAddressWithPostalCode('東京都渋谷区　　テストビル5階');
      expect(result.postalCode).toBeNull();
      expect(result.addressLine1).toBe('東京都渋谷区');
      expect(result.addressLine2).toBe('テストビル5階');
    });

    it('returns all null for null input', () => {
      const result = parseAddressWithPostalCode(null);
      expect(result.postalCode).toBeNull();
      expect(result.addressLine1).toBeNull();
      expect(result.addressLine2).toBeNull();
    });

    it('returns all null for empty string', () => {
      const result = parseAddressWithPostalCode('');
      expect(result.postalCode).toBeNull();
      expect(result.addressLine1).toBeNull();
      expect(result.addressLine2).toBeNull();
    });
  });

  describe('generateDocumentTitle', () => {
    it('returns 御見積書 for estimate in screen mode', () => {
      expect(generateDocumentTitle('estimate')).toBe('御見積書');
      expect(generateDocumentTitle('estimate', 'screen')).toBe('御見積書');
    });

    it('returns 御請求書 for invoice in screen mode', () => {
      expect(generateDocumentTitle('invoice')).toBe('御請求書');
      expect(generateDocumentTitle('invoice', 'screen')).toBe('御請求書');
    });

    it('returns 見　積　書 for estimate in pdf mode', () => {
      expect(generateDocumentTitle('estimate', 'pdf')).toBe('見　積　書');
    });

    it('returns 請求書 for invoice in pdf mode (no full-width spaces)', () => {
      expect(generateDocumentTitle('invoice', 'pdf')).toBe('請求書');
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

      it('pdf mode includes formal styling for invoices (accounting style)', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice' },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        // Accounting-style template uses black/white formal styling
        expect(result.html).toContain('background: #000');
        expect(result.html).toContain('background: #fff');
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
              email: null,
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
              email: null,
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
              email: null,
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
              email: null,
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
              email: null,
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

    // === Invoice PDF Mode - New Accounting Layout ===
    describe('invoice pdf mode - accounting layout', () => {
      it('renders title with full-width spaces for invoice in pdf mode (accounting style)', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice' },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        // New accounting-style template uses spaced title matching traditional format
        expect(result.html).toContain('請　求　書');
      });

      it('renders document number in meta table', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice', documentNo: 'INV-001' },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('meta-label');
        expect(result.html).toContain('No');
        expect(result.html).toContain('INV-001');
      });

      it('renders issue date in meta table', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice', issueDate: '2026-01-30' },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('請求日');
        expect(result.html).toContain('2026年1月30日');
      });

      it('renders info block with black-background labels', () => {
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            subject: 'マンション外壁塗装工事',
            dueDate: '2026-02-28',
          },
          sensitiveSnapshot: createTestSensitiveSnapshot({
            bankName: 'みずほ銀行',
            branchName: '渋谷',
            accountType: '普通',
            accountNumber: '1234567',
            accountHolderName: 'テスト株式会社',
          }),
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        // Info block with black-background labels (table layout)
        expect(result.html).toContain('info-block-table');
        expect(result.html).toContain('info-label');
        expect(result.html).toContain('件名');
        expect(result.html).toContain('支払期限');
        expect(result.html).toContain('振込先');
        expect(result.html).toContain('マンション外壁塗装工事');
        expect(result.html).toContain('2026年2月28日');
        expect(result.html).toContain('みずほ銀行');
      });

      it('renders carried forward block when amount is set', () => {
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            carriedForwardAmount: 100000,
          },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('carried-forward-block');
        expect(result.html).toContain('繰越金額');
        expect(result.html).toContain('100,000');
      });

      it('hides carried forward block when amount is null', () => {
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            carriedForwardAmount: null,
          },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        // Check for the actual HTML element, not just CSS class name
        expect(result.html).not.toContain('<div class="carried-forward-block">');
      });

      it('hides carried forward block when amount is zero', () => {
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            carriedForwardAmount: 0,
          },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        // Check for the actual HTML element, not just CSS class name
        expect(result.html).not.toContain('<div class="carried-forward-block">');
      });

      it('renders grand total block with black-background label', () => {
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            totalYen: 1100000,
          },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('grand-total-block');
        expect(result.html).toContain('grand-total-label');
        expect(result.html).toContain('grand-total-value');
        expect(result.html).toContain('合計');
        expect(result.html).toContain('1,100,000');
      });

      it('renders issuer info in vertical stack layout', () => {
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            issuerSnapshot: {
              companyName: 'テスト株式会社',
              representativeName: null,
              address: '〒160-0000 東京都新宿区1-2-3',
              phone: '03-1234-5678',
              fax: null,
              sealImageBase64: null,
              contactPerson: '山田太郎',
              email: null,
            },
          },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('issuer-block');
        expect(result.html).toContain('テスト株式会社');
        // Address is now parsed into postal code and address line
        expect(result.html).toContain('〒160-0000');
        expect(result.html).toContain('東京都新宿区1-2-3');
        expect(result.html).toContain('TEL:');
        expect(result.html).toContain('03-1234-5678');
        expect(result.html).toContain('担当:');
        expect(result.html).toContain('山田太郎');
      });

      it('renders seal image inline (without contact person)', () => {
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            issuerSnapshot: {
              companyName: 'テスト株式会社',
              representativeName: null,
              address: '東京都新宿区1-2-3',
              phone: '03-1234-5678',
              fax: null,
              sealImageBase64: 'data:image/png;base64,dGVzdC1pbWFnZS1kYXRh', // data URL format
              contactPerson: null,
              email: null,
            },
          },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        // Seal image is rendered in issuer block
        expect(result.html).toContain('issuer-seal');
        expect(result.html).toContain('seal-image');
        expect(result.html).toContain('data:image/png;base64,dGVzdC1pbWFnZS1kYXRh');
      });

      it('renders items table with dark header', () => {
        const lineItem = createTestLineItem({
          name: '外壁塗装',
          quantityMilli: 2500,
          unit: 'm²',
          unitPrice: 5000,
        });
        const input = createTestTemplateInput({
          document: { type: 'invoice', lineItems: [lineItem] },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('formal-items-table');
        expect(result.html).toContain('摘要');
        expect(result.html).toContain('数量');
        expect(result.html).toContain('単位');
        expect(result.html).toContain('単価');
        expect(result.html).toContain('金額');
        expect(result.html).toContain('外壁塗装');
      });

      it('renders grand total in prominent block (not in table footer)', () => {
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            subtotalYen: 1000000,
            taxYen: 100000,
            totalYen: 1100000,
          },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        // Grand total is displayed in a separate prominent block
        expect(result.html).toContain('grand-total-block');
        expect(result.html).toContain('1,100,000');
        expect(result.html).toContain('円（税込）');
        // Table footer (tfoot) is not used for totals
        expect(result.html).not.toContain('subtotal-row');
      });

      it('estimate in pdf mode still uses old layout with spaced title', () => {
        const input = createTestTemplateInput({
          document: { type: 'estimate' },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        // Estimate should keep the old formal layout
        expect(result.html).toContain('見　積　書');
        // Note: info-block-table is only used in invoice accounting template
        expect(result.html).not.toContain('info-block-table');
        expect(result.html).not.toContain('grand-total-block');
      });

      // === New Layout Requirements ===
      it('includes greeting text "下記のとおり、御請求申し上げます。"', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice' },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('下記のとおり、御請求申し上げます。');
      });

      it('does NOT include FAX in issuer info', () => {
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            issuerSnapshot: {
              companyName: 'テスト株式会社',
              representativeName: null,
              address: '東京都新宿区1-2-3',
              phone: '03-1234-5678',
              fax: '03-1234-5679',
              sealImageBase64: null,
              contactPerson: '担当太郎',
              email: null,
            },
          },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).not.toContain('FAX');
        expect(result.html).not.toContain('03-1234-5679');
      });

      it('includes 登録番号 in invoice pdf mode when set', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice' },
          sensitiveSnapshot: createTestSensitiveSnapshot({
            invoiceNumber: 'T9876543210123',
          }),
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('登録番号');
        expect(result.html).toContain('T9876543210123');
      });

      it('omits 登録番号 in invoice pdf mode when not set', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice' },
          sensitiveSnapshot: createTestSensitiveSnapshot({
            invoiceNumber: null,
          }),
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).not.toContain('登録番号');
      });

      it('renders seal inline with contact person name (not separate block)', () => {
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            issuerSnapshot: {
              companyName: 'テスト株式会社',
              representativeName: null,
              address: '東京都新宿区1-2-3',
              phone: '03-1234-5678',
              fax: null,
              sealImageBase64: 'data:image/png;base64,dGVzdC1pbWFnZS1kYXRh', // data URL format
              contactPerson: '山田太郎',
              email: null,
            },
          },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        // Seal should be in issuer block, contact person separate
        expect(result.html).toContain('issuer-seal');
        expect(result.html).toContain('seal-image');
        expect(result.html).toContain('担当:');
        expect(result.html).toContain('山田太郎');
      });

      it('parses postal code from address and displays separately', () => {
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            issuerSnapshot: {
              companyName: 'テスト株式会社',
              representativeName: null,
              address: '〒100-0001 東京都千代田区千代田1-1-1\nサンプルビル3階',
              phone: '03-1234-5678',
              fax: null,
              sealImageBase64: null,
              contactPerson: null,
              email: null,
            },
          },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('issuer-postal');
        expect(result.html).toContain('〒100-0001');
        expect(result.html).toContain('東京都千代田区千代田1-1-1');
        expect(result.html).toContain('サンプルビル3階');
      });

      it('renders bank info in multi-line format in 振込先', () => {
        const input = createTestTemplateInput({
          document: { type: 'invoice' },
          sensitiveSnapshot: createTestSensitiveSnapshot({
            bankName: 'サンプル銀行',
            branchName: '本店',
            accountType: '普通',
            accountNumber: '1111111',
            accountHolderName: 'サンプル（カ',
          }),
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('振込先');
        expect(result.html).toContain('サンプル銀行');
        expect(result.html).toContain('本店');
        expect(result.html).toContain('普通');
        expect(result.html).toContain('1111111');
        expect(result.html).toContain('サンプル（カ');
      });

      it('renders carried forward block with black-background label style', () => {
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            carriedForwardAmount: 10000,
          },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('cf-label');
        expect(result.html).toContain('繰越金額');
        expect(result.html).toContain('10,000');
      });

      it('renders tax breakdown section with subtotal and tax amounts', () => {
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            subtotalYen: 100000,
            taxYen: 10000,
            totalYen: 110000,
            taxBreakdown: [
              { rate: 10, subtotal: 100000, tax: 10000 },
            ],
          },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('tax-breakdown-section');
        expect(result.html).toContain('10%対象');
        expect(result.html).toContain('小計（税抜）');
        expect(result.html).toContain('消費税合計');
        expect(result.html).toContain('100,000');
        expect(result.html).toContain('10,000');
      });

      it('renders tax breakdown section with multiple tax rates', () => {
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            subtotalYen: 150000,
            taxYen: 10000,
            totalYen: 160000,
            taxBreakdown: [
              { rate: 10, subtotal: 100000, tax: 10000 },
              { rate: 0, subtotal: 50000, tax: 0 },
            ],
          },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        expect(result.html).toContain('10%対象');
        expect(result.html).toContain('非課税');
        expect(result.html).toContain('150,000');
      });

      // === New Layout Requirements (Accounting Template Redesign) ===
      it('renders info block at full width (not side-by-side with issuer)', () => {
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            subject: 'テスト工事',
          },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        // Info block should NOT be in a side-by-side layout with issuer
        expect(result.html).not.toContain('info-issuer-row');
        // Info block should be in its own section (verify actual HTML element)
        expect(result.html).toContain('<div class="info-block-section">');
      });

      it('renders issuer block as standalone section (not side-by-side with info)', () => {
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            issuerSnapshot: {
              companyName: 'テスト株式会社',
              representativeName: null,
              address: '東京都新宿区1-2-3',
              phone: '03-1234-5678',
              fax: null,
              sealImageBase64: null,
              contactPerson: '山田太郎',
              email: null,
            },
          },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        // Issuer block should be in its own standalone section (verify actual HTML element)
        expect(result.html).toContain('<div class="issuer-section-standalone">');
        expect(result.html).not.toContain('issuer-container');
      });

      it('renders grand total block AFTER line items table and tax breakdown', () => {
        // Japanese accounting convention: 明細 → 税内訳 → 合計
        const lineItem = createTestLineItem({
          name: '外壁塗装',
          quantityMilli: 1000,
          unit: '式',
          unitPrice: 100000,
        });
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            lineItems: [lineItem],
            totalYen: 110000,
            subtotalYen: 100000,
            taxYen: 10000,
            taxBreakdown: [{ rate: 10, subtotal: 100000, tax: 10000 }],
          },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        // Verify order: line items table → tax breakdown → grand total
        const itemsTablePos = result.html.indexOf('<table class="formal-items-table">');
        const taxBreakdownPos = result.html.indexOf('<div class="tax-breakdown-section">');
        const grandTotalPos = result.html.indexOf('<div class="grand-total-block">');

        expect(itemsTablePos).toBeGreaterThan(-1);
        expect(taxBreakdownPos).toBeGreaterThan(-1);
        expect(grandTotalPos).toBeGreaterThan(-1);
        // Grand total should be after line items
        expect(grandTotalPos).toBeGreaterThan(itemsTablePos);
        // Grand total should be after tax breakdown (standard Japanese accounting order)
        expect(grandTotalPos).toBeGreaterThan(taxBreakdownPos);
      });

      it('renders notes section with black background label', () => {
        const input = createTestTemplateInput({
          document: {
            type: 'invoice',
            notes: 'テスト備考',
          },
          mode: 'pdf',
        });
        const result = generateHtmlTemplate(input);

        // Notes title should have black background styling (matching other labels)
        // Verify actual HTML element exists
        expect(result.html).toContain('<div class="notes-title">');
        // The CSS should define black background for notes-title
        expect(result.html).toMatch(/\.notes-title\s*\{[^}]*background:\s*#000/);
      });
    });
  });

  // === M18: injectLandscapeCss ===
  describe('injectLandscapeCss', () => {
    it('injects @page landscape rule before closing </style> tag', () => {
      const html = '<html><head><style>body { margin: 0; }</style></head><body></body></html>';
      const result = injectLandscapeCss(html);
      expect(result).toContain('@page { size: A4 landscape; }');
      expect(result).toContain('</style>');
      const ruleIndex = result.indexOf('@page { size: A4 landscape; }');
      const closeIndex = result.indexOf('</style>');
      expect(ruleIndex).toBeLessThan(closeIndex);
    });

    it('injects min-width for forced wider layout on narrow screens', () => {
      const html = '<html><head><style>body { margin: 0; }</style></head><body></body></html>';
      const result = injectLandscapeCss(html);
      expect(result).toContain('min-width: 1130px');
      expect(result).toContain('max-width: 1130px');
    });

    it('injects viewport meta tag for WebView zoom-out on narrow screens', () => {
      const html = '<html><head><style>body { margin: 0; }</style></head><body></body></html>';
      const result = injectLandscapeCss(html);
      expect(result).toContain('<meta name="viewport" content="width=1130">');
    });

    it('replaces existing viewport meta when present', () => {
      const html = '<html><head><meta name="viewport" content="width=device-width"><style>a{}</style></head><body></body></html>';
      const result = injectLandscapeCss(html);
      expect(result).toContain('<meta name="viewport" content="width=1130">');
      expect(result).not.toContain('width=device-width');
    });

    it('handles HTML with multiple style blocks (injects before last </style>)', () => {
      const html = '<html><head><style>a{}</style><style>b{}</style></head><body></body></html>';
      const result = injectLandscapeCss(html);
      const lastStyleClose = result.lastIndexOf('</style>');
      const ruleIndex = result.indexOf('@page { size: A4 landscape; }');
      expect(ruleIndex).toBeLessThan(lastStyleClose);
    });

    it('inserts <style> block and viewport meta before </head> when no </style> exists', () => {
      const html = '<html><head></head><body></body></html>';
      const result = injectLandscapeCss(html);
      expect(result).toContain('@page { size: A4 landscape; }');
      expect(result).toContain('min-width: 1130px');
      expect(result).toContain('<style>');
      expect(result).toContain('<meta name="viewport" content="width=1130">');
    });

    it('returns HTML unchanged when neither </style> nor </head> exists', () => {
      const html = '<div>no head or style</div>';
      const result = injectLandscapeCss(html);
      expect(result).toBe(html);
    });

    it('does not inject landscape rules in default portrait template', () => {
      const input = createTestTemplateInput({ mode: 'pdf' });
      const { html } = generateHtmlTemplate(input);
      expect(html).not.toContain('@page');
      expect(html).toContain('max-width: 800px');
    });

    it('produces valid HTML with @page, container overrides, and viewport meta when applied to a real template', () => {
      const input = createTestTemplateInput({ mode: 'pdf' });
      const { html } = generateHtmlTemplate(input);
      const result = injectLandscapeCss(html);
      expect(result).toContain('@page { size: A4 landscape; }');
      expect(result).toContain('min-width: 1130px');
      expect(result).toContain('<meta name="viewport" content="width=1130">');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('</html>');
    });
  });
});
