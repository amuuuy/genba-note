/**
 * CONSTRUCTION Template Tests
 *
 * Verifies CONSTRUCTION template-specific design features:
 * 4-column table, 御見積金額/御請求金額, email display, empty table rows,
 * postal code separation, background HTML insertion.
 */

import { getTemplate } from '@/pdf/templates/templateRegistry';
import '@/pdf/templates/registerAllTemplates';
import {
  createTestDocumentWithTotals,
  createTestSensitiveSnapshot,
  createTestIssuerSnapshot,
} from './helpers';

const defaultOptions = { sealSize: 'MEDIUM' as const, backgroundDesign: 'NONE' as const };

describe('CONSTRUCTION template', () => {
  it('is registered in the template registry', () => {
    expect(() => getTemplate('CONSTRUCTION')).not.toThrow();
  });

  describe('estimate', () => {
    it('uses 見　積　書 title', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('見　積　書');
    });

    it('uses 御見積金額 label', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('御見積金額');
    });

    it('does not show bank info', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const sensitive = createTestSensitiveSnapshot();
      const html = getTemplate('CONSTRUCTION')(doc, sensitive, defaultOptions);
      expect(html).not.toContain('お振込先');
    });

    it('does not show registration number', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const sensitive = createTestSensitiveSnapshot();
      const html = getTemplate('CONSTRUCTION')(doc, sensitive, defaultOptions);
      expect(html).not.toContain('登録番号');
    });
  });

  describe('invoice', () => {
    it('uses 請　求　書 title', () => {
      const doc = createTestDocumentWithTotals({ type: 'invoice' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('請　求　書');
    });

    it('uses 御請求金額 label', () => {
      const doc = createTestDocumentWithTotals({ type: 'invoice' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('御請求金額');
    });

    it('shows bank info', () => {
      const doc = createTestDocumentWithTotals({ type: 'invoice' });
      const sensitive = createTestSensitiveSnapshot();
      const html = getTemplate('CONSTRUCTION')(doc, sensitive, defaultOptions);
      expect(html).toContain('お振込先');
      expect(html).toContain('みずほ銀行');
    });

    it('shows registration number', () => {
      const doc = createTestDocumentWithTotals({ type: 'invoice' });
      const sensitive = createTestSensitiveSnapshot();
      const html = getTemplate('CONSTRUCTION')(doc, sensitive, defaultOptions);
      expect(html).toContain('登録番号');
      expect(html).toContain('T1234567890123');
    });
  });

  describe('4-column table', () => {
    it('has 品番・品名, 単価, 数量, 金額 columns', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('品番・品名');
      expect(html).toContain('単価');
      expect(html).toContain('数量');
      expect(html).toContain('金額');
    });

    it('does not have 税率 or 単位 column headers', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      // Ensure no tax rate or unit column headers (these are specific to other templates)
      expect(html).not.toMatch(/<th[^>]*>税率/);
      expect(html).not.toMatch(/<th[^>]*>単位/);
    });

    it('fills empty rows up to minimum 8 total rows', () => {
      // Create doc with 2 line items
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      // Count all <tr> in tbody (data rows + empty rows)
      const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
      expect(tbodyMatch).toBeTruthy();
      const trCount = (tbodyMatch![1].match(/<tr>/g) || []).length;
      expect(trCount).toBeGreaterThanOrEqual(8);
    });
  });

  describe('email display', () => {
    it('shows email when present in issuer snapshot', () => {
      const doc = createTestDocumentWithTotals({
        type: 'estimate',
        issuerSnapshot: createTestIssuerSnapshot({ email: 'test@example.com' }),
      });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('E-mail');
      expect(html).toContain('test@example.com');
    });

    it('does not show email line when email is null', () => {
      const doc = createTestDocumentWithTotals({
        type: 'estimate',
        issuerSnapshot: createTestIssuerSnapshot({ email: null }),
      });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).not.toContain('E-mail');
    });
  });

  describe('postal code separation', () => {
    it('separates postal code from address', () => {
      const doc = createTestDocumentWithTotals({
        type: 'estimate',
        issuerSnapshot: createTestIssuerSnapshot({
          address: '〒150-0001 東京都渋谷区神宮前1-2-3',
        }),
      });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('〒150-0001');
      expect(html).toContain('東京都渋谷区神宮前1-2-3');
    });
  });

  describe('background HTML', () => {
    it('inserts background overlay div when background design is active', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const options = { sealSize: 'MEDIUM' as const, backgroundDesign: 'STRIPE' as const };
      const html = getTemplate('CONSTRUCTION')(doc, null, options);
      expect(html).toContain('bg-overlay');
      expect(html).toContain('repeating-linear-gradient');
    });

    it('does not insert background overlay when design is NONE', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).not.toContain('bg-overlay');
    });
  });

  describe('totals section', () => {
    it('shows 小計, 消費税等, 合計金額', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('小計');
      expect(html).toContain('消費税等');
      expect(html).toContain('合計金額');
    });
  });

  describe('notes section', () => {
    it('shows 備考 section', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate', notes: 'テスト備考' });
      const html = getTemplate('CONSTRUCTION')(doc, null, defaultOptions);
      expect(html).toContain('備考');
      expect(html).toContain('テスト備考');
    });
  });
});
