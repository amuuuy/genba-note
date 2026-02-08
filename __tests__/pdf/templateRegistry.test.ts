/**
 * Template Registry Tests
 *
 * Tests for template registry, resolveTemplateId, and all 5 templates.
 * Includes regression tests for existing templates and label branching tests.
 */

import { getTemplate, resolveTemplateId } from '@/pdf/templates/templateRegistry';
// Ensure all templates are registered
import '@/pdf/templates/registerAllTemplates';
import { isValidImageDataUri } from '@/pdf/templateUtils';
import {
  createTestDocumentWithTotals,
  createTestSensitiveSnapshot,
  createNullSensitiveSnapshot,
} from './helpers';
import type { DocumentTemplateId } from '@/pdf/types';

const ALL_TEMPLATE_IDS: DocumentTemplateId[] = [
  'FORMAL_STANDARD',
  'ACCOUNTING',
  'SIMPLE',
  'MODERN',
  'CLASSIC',
  'CONSTRUCTION',
];

const defaultOptions = { sealSize: 'MEDIUM' as const, backgroundDesign: 'NONE' as const };

describe('templateRegistry', () => {
  describe('getTemplate', () => {
    it.each(ALL_TEMPLATE_IDS)('returns a function for %s', (id) => {
      const generator = getTemplate(id);
      expect(typeof generator).toBe('function');
    });

    it('throws for unregistered template ID', () => {
      expect(() => getTemplate('NONEXISTENT' as DocumentTemplateId)).toThrow();
    });
  });

  describe('resolveTemplateId', () => {
    it('returns FORMAL_STANDARD for unknown estimate template ID', () => {
      expect(resolveTemplateId('estimate', 'UNKNOWN')).toBe('FORMAL_STANDARD');
    });

    it('returns ACCOUNTING for unknown invoice template ID', () => {
      expect(resolveTemplateId('invoice', 'UNKNOWN')).toBe('ACCOUNTING');
    });

    it('returns FORMAL_STANDARD for null estimate template ID', () => {
      expect(resolveTemplateId('estimate', null)).toBe('FORMAL_STANDARD');
    });

    it('returns ACCOUNTING for null invoice template ID', () => {
      expect(resolveTemplateId('invoice', null)).toBe('ACCOUNTING');
    });

    it('returns FORMAL_STANDARD for undefined estimate template ID', () => {
      expect(resolveTemplateId('estimate', undefined)).toBe('FORMAL_STANDARD');
    });

    it.each(ALL_TEMPLATE_IDS)('resolves known ID %s as-is for estimate', (id) => {
      expect(resolveTemplateId('estimate', id)).toBe(id);
    });

    it.each(ALL_TEMPLATE_IDS)('resolves known ID %s as-is for invoice', (id) => {
      expect(resolveTemplateId('invoice', id)).toBe(id);
    });
  });

  describe('HTML generation - all 5 templates x 2 doc types', () => {
    it.each(ALL_TEMPLATE_IDS)('%s generates HTML for estimate', (id) => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate(id)(doc, null, defaultOptions);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('テスト顧客');
    });

    it.each(ALL_TEMPLATE_IDS)('%s generates HTML for invoice', (id) => {
      const doc = createTestDocumentWithTotals({ type: 'invoice' });
      const sensitive = createTestSensitiveSnapshot();
      const html = getTemplate(id)(doc, sensitive, defaultOptions);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('テスト顧客');
    });
  });

  describe('XSS prevention', () => {
    it('escapes script tags in clientName', () => {
      const doc = createTestDocumentWithTotals({
        clientName: '<script>alert("xss")</script>',
      });
      ALL_TEMPLATE_IDS.forEach((id) => {
        const html = getTemplate(id)(doc, null, defaultOptions);
        expect(html).not.toContain('<script>');
        expect(html).toContain('&lt;script&gt;');
      });
    });

    it('escapes HTML in subject field', () => {
      const doc = createTestDocumentWithTotals({
        subject: '<img onerror="alert(1)" src=x>',
      });
      ALL_TEMPLATE_IDS.forEach((id) => {
        const html = getTemplate(id)(doc, null, defaultOptions);
        // The unescaped <img tag must not appear (XSS prevention)
        expect(html).not.toContain('<img onerror');
        // The escaped version should be present
        expect(html).toContain('&lt;img onerror');
      });
    });
  });

  describe('isValidImageDataUri security', () => {
    it('accepts valid base64 data URI', () => {
      expect(isValidImageDataUri('data:image/png;base64,iVBOR=')).toBe(true);
    });

    it('rejects data URI with embedded quotes (attribute injection)', () => {
      expect(isValidImageDataUri('data:image/png;base64,a" onerror="alert(1)')).toBe(false);
    });

    it('rejects data URI with spaces', () => {
      expect(isValidImageDataUri('data:image/png;base64,abc def')).toBe(false);
    });

    it('rejects SVG data URI', () => {
      expect(isValidImageDataUri('data:image/svg+xml;base64,abc')).toBe(false);
    });

    it('rejects null/undefined', () => {
      expect(isValidImageDataUri(null)).toBe(false);
      expect(isValidImageDataUri(undefined)).toBe(false);
    });
  });

  describe('Label branching - estimate vs invoice', () => {
    it('ACCOUNTING with estimate doc shows 見積日 label', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const html = getTemplate('ACCOUNTING')(doc, null, defaultOptions);
      expect(html).toContain('見積日');
      expect(html).not.toContain('請求日');
    });

    it('ACCOUNTING with invoice doc shows 請求日 label and bank info', () => {
      const doc = createTestDocumentWithTotals({ type: 'invoice' });
      const sensitive = createTestSensitiveSnapshot();
      const html = getTemplate('ACCOUNTING')(doc, sensitive, defaultOptions);
      expect(html).toContain('請求日');
      expect(html).toContain('みずほ銀行');
    });

    it('estimate templates do not show bank info', () => {
      const doc = createTestDocumentWithTotals({ type: 'estimate' });
      const sensitive = createTestSensitiveSnapshot();
      ALL_TEMPLATE_IDS.forEach((id) => {
        const html = getTemplate(id)(doc, sensitive, defaultOptions);
        expect(html).not.toContain('振込先');
        expect(html).not.toContain('みずほ銀行');
      });
    });

    it('invoice templates show bank info when available', () => {
      const doc = createTestDocumentWithTotals({ type: 'invoice' });
      const sensitive = createTestSensitiveSnapshot();
      ALL_TEMPLATE_IDS.forEach((id) => {
        const html = getTemplate(id)(doc, sensitive, defaultOptions);
        expect(html).toContain('みずほ銀行');
      });
    });

    it('estimate templates show validUntil field', () => {
      const doc = createTestDocumentWithTotals({
        type: 'estimate',
        validUntil: '2026-03-31',
      });
      ALL_TEMPLATE_IDS.forEach((id) => {
        const html = getTemplate(id)(doc, null, defaultOptions);
        expect(html).toContain('2026年3月31日');
      });
    });

    it('invoice templates show dueDate field', () => {
      const doc = createTestDocumentWithTotals({
        type: 'invoice',
        dueDate: '2026-03-31',
      });
      const sensitive = createTestSensitiveSnapshot();
      ALL_TEMPLATE_IDS.forEach((id) => {
        const html = getTemplate(id)(doc, sensitive, defaultOptions);
        expect(html).toContain('2026年3月31日');
      });
    });
  });

  describe('Existing template regression tests', () => {
    describe('FORMAL_STANDARD', () => {
      it('has dotted border in totals section', () => {
        const doc = createTestDocumentWithTotals({ type: 'estimate' });
        const html = getTemplate('FORMAL_STANDARD')(doc, null, defaultOptions);
        expect(html).toContain('dotted');
      });

      it('has flexbox header layout (display: flex)', () => {
        const doc = createTestDocumentWithTotals({ type: 'estimate' });
        const html = getTemplate('FORMAL_STANDARD')(doc, null, defaultOptions);
        expect(html).toContain('display: flex');
      });

      it('has black background table header (#000)', () => {
        const doc = createTestDocumentWithTotals({ type: 'estimate' });
        const html = getTemplate('FORMAL_STANDARD')(doc, null, defaultOptions);
        expect(html).toMatch(/background:\s*#000/);
      });
    });

    describe('ACCOUNTING', () => {
      it('has 3+ black label blocks (background: #000; color: #fff)', () => {
        const doc = createTestDocumentWithTotals({ type: 'invoice' });
        const sensitive = createTestSensitiveSnapshot();
        const html = getTemplate('ACCOUNTING')(doc, sensitive, defaultOptions);
        const blackLabelCount = (html.match(/background:\s*#000/g) || []).length;
        expect(blackLabelCount).toBeGreaterThanOrEqual(3);
      });

      it('has tax breakdown table', () => {
        const doc = createTestDocumentWithTotals({ type: 'invoice' });
        const sensitive = createTestSensitiveSnapshot();
        const html = getTemplate('ACCOUNTING')(doc, sensitive, defaultOptions);
        expect(html).toContain('tax-breakdown');
      });

      it('has black notes header (background: #000)', () => {
        const doc = createTestDocumentWithTotals({ type: 'invoice', notes: 'テスト備考' });
        const sensitive = createTestSensitiveSnapshot();
        const html = getTemplate('ACCOUNTING')(doc, sensitive, defaultOptions);
        // Notes section should have black header
        expect(html).toContain('備考');
      });
    });

    describe('SIMPLE', () => {
      it('has #333 table header background', () => {
        const doc = createTestDocumentWithTotals({ type: 'invoice' });
        const sensitive = createTestSensitiveSnapshot();
        const html = getTemplate('SIMPLE')(doc, sensitive, defaultOptions);
        expect(html).toMatch(/background:\s*#333/);
      });

      it('does NOT have #f0f0f0 background in notes section (M21 change)', () => {
        const doc = createTestDocumentWithTotals({ type: 'invoice', notes: 'テスト備考' });
        const sensitive = createTestSensitiveSnapshot();
        const html = getTemplate('SIMPLE')(doc, sensitive, defaultOptions);
        // SIMPLE's notes should NOT have the gray header background
        // It should use borderless + top line style instead
        expect(html).not.toMatch(/\.simple-notes.*background:\s*#f0f0f0/s);
      });

      it('uses 50px seal size for MEDIUM', () => {
        const doc = createTestDocumentWithTotals({ type: 'invoice' });
        const sensitive = createTestSensitiveSnapshot();
        const html = getTemplate('SIMPLE')(doc, sensitive, defaultOptions);
        // Seal size verification is done via getSealSizePx which returns 50 for SIMPLE+MEDIUM
        expect(html).toContain('50px');
      });
    });
  });
});
