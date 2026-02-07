/**
 * MODERN Template Tests
 *
 * Verifies MODERN template-specific design features:
 * accent color, transparent header, card totals, print-color-adjust.
 */

import { getTemplate } from '@/pdf/templates/templateRegistry';
import '@/pdf/templates/registerAllTemplates';
import {
  createTestDocumentWithTotals,
  createTestSensitiveSnapshot,
} from './helpers';

const defaultOptions = { sealSize: 'MEDIUM' as const, backgroundDesign: 'NONE' as const };

describe('MODERN template', () => {
  it('contains accent color #2563EB', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate('MODERN')(doc, null, defaultOptions);
    expect(html).toContain('#2563EB');
  });

  it('does NOT have black background table header (#000)', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate('MODERN')(doc, null, defaultOptions);
    // Table header should use transparent background with accent text
    // Should not have background: #000 for table headers
    const tableHeaderSection = html.match(/\.modern-items-table\s+th\s*\{[^}]*\}/s)?.[0] ?? '';
    expect(tableHeaderSection).not.toMatch(/background:\s*#000/);
  });

  it('has border-radius: 8px for card-style totals', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate('MODERN')(doc, null, defaultOptions);
    expect(html).toContain('border-radius: 8px');
  });

  it('has print-color-adjust: exact for print fidelity', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate('MODERN')(doc, null, defaultOptions);
    expect(html).toContain('print-color-adjust: exact');
  });

  it('has -webkit-print-color-adjust: exact for WebKit', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate('MODERN')(doc, null, defaultOptions);
    expect(html).toContain('-webkit-print-color-adjust: exact');
  });

  it('does NOT use Mincho font family', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate('MODERN')(doc, null, defaultOptions);
    expect(html).not.toContain('Mincho');
    expect(html).not.toContain('明朝');
  });

  it('has totals card border fallback (#BFDBFE)', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate('MODERN')(doc, null, defaultOptions);
    expect(html).toContain('#BFDBFE');
  });

  it('has left accent bar', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate('MODERN')(doc, null, defaultOptions);
    // Should have a 4px left border or left accent bar
    expect(html).toMatch(/border-left.*4px/);
  });

  it('uses title without full-width spaces for estimate', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const html = getTemplate('MODERN')(doc, null, defaultOptions);
    expect(html).toContain('見積書');
    // Should NOT have full-width space separated title
    expect(html).not.toContain('見　積　書');
  });

  it('uses title without full-width spaces for invoice', () => {
    const doc = createTestDocumentWithTotals({ type: 'invoice' });
    const sensitive = createTestSensitiveSnapshot();
    const html = getTemplate('MODERN')(doc, sensitive, defaultOptions);
    expect(html).toContain('請求書');
    expect(html).not.toContain('請　求　書');
  });

  it('shows bank info for invoice', () => {
    const doc = createTestDocumentWithTotals({ type: 'invoice' });
    const sensitive = createTestSensitiveSnapshot();
    const html = getTemplate('MODERN')(doc, sensitive, defaultOptions);
    expect(html).toContain('みずほ銀行');
  });

  it('hides bank info for estimate', () => {
    const doc = createTestDocumentWithTotals({ type: 'estimate' });
    const sensitive = createTestSensitiveSnapshot();
    const html = getTemplate('MODERN')(doc, sensitive, defaultOptions);
    expect(html).not.toContain('みずほ銀行');
  });
});
