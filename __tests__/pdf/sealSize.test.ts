/**
 * Seal Size Tests
 *
 * Tests for getSealSizePx() mapping and dynamic CSS injection in PDF templates.
 * Milestone 17: 印鑑サイズ選択（大・中・小）
 */

import { getSealSizePx } from '../../src/pdf/types';
import type { SealSize, DocumentTemplateId } from '../../src/pdf/types';
import { generateHtmlTemplate } from '../../src/pdf/pdfTemplateService';
import { generateInvoiceAccountingTemplate } from '../../src/pdf/invoiceAccountingTemplate';
import {
  createTestDocumentWithTotals,
  createTestIssuerSnapshot,
  createTestSensitiveSnapshot,
} from './helpers';

// === getSealSizePx() mapping tests (3 sizes × 5 templates = 15 patterns) ===

describe('getSealSizePx', () => {
  // SMALL
  it('returns 45 for SMALL + FORMAL_STANDARD', () => {
    expect(getSealSizePx('SMALL', 'FORMAL_STANDARD')).toBe(45);
  });
  it('returns 45 for SMALL + ACCOUNTING', () => {
    expect(getSealSizePx('SMALL', 'ACCOUNTING')).toBe(45);
  });
  it('returns 30 for SMALL + SIMPLE', () => {
    expect(getSealSizePx('SMALL', 'SIMPLE')).toBe(30);
  });
  it('returns 45 for SMALL + MODERN', () => {
    expect(getSealSizePx('SMALL', 'MODERN')).toBe(45);
  });
  it('returns 45 for SMALL + CLASSIC', () => {
    expect(getSealSizePx('SMALL', 'CLASSIC')).toBe(45);
  });

  // MEDIUM (must match current hardcoded values)
  it('returns 70 for MEDIUM + FORMAL_STANDARD', () => {
    expect(getSealSizePx('MEDIUM', 'FORMAL_STANDARD')).toBe(70);
  });
  it('returns 70 for MEDIUM + ACCOUNTING', () => {
    expect(getSealSizePx('MEDIUM', 'ACCOUNTING')).toBe(70);
  });
  it('returns 50 for MEDIUM + SIMPLE', () => {
    expect(getSealSizePx('MEDIUM', 'SIMPLE')).toBe(50);
  });
  it('returns 70 for MEDIUM + MODERN', () => {
    expect(getSealSizePx('MEDIUM', 'MODERN')).toBe(70);
  });
  it('returns 70 for MEDIUM + CLASSIC', () => {
    expect(getSealSizePx('MEDIUM', 'CLASSIC')).toBe(70);
  });

  // LARGE
  it('returns 100 for LARGE + FORMAL_STANDARD', () => {
    expect(getSealSizePx('LARGE', 'FORMAL_STANDARD')).toBe(100);
  });
  it('returns 100 for LARGE + ACCOUNTING', () => {
    expect(getSealSizePx('LARGE', 'ACCOUNTING')).toBe(100);
  });
  it('returns 70 for LARGE + SIMPLE', () => {
    expect(getSealSizePx('LARGE', 'SIMPLE')).toBe(70);
  });
  it('returns 100 for LARGE + MODERN', () => {
    expect(getSealSizePx('LARGE', 'MODERN')).toBe(100);
  });
  it('returns 100 for LARGE + CLASSIC', () => {
    expect(getSealSizePx('LARGE', 'CLASSIC')).toBe(100);
  });
});

// === HTML CSS injection tests ===

// Minimal valid base64 PNG for seal image testing
const SEAL_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

describe('Seal size CSS injection in templates', () => {
  describe('Estimate FORMAL template', () => {
    it('uses dynamic seal size from getSealSizePx for SMALL', () => {
      const doc = createTestDocumentWithTotals({
        type: 'estimate',
        issuerSnapshot: createTestIssuerSnapshot({
          sealImageBase64: SEAL_BASE64,
        }),
      });
      const { html } = generateHtmlTemplate({
        document: doc,
        sensitiveSnapshot: createTestSensitiveSnapshot(),
        mode: 'pdf',
        sealSize: 'SMALL',
      });
      // FORMAL_STANDARD SMALL = 45px
      expect(html).toContain('width: 45px');
      expect(html).toContain('height: 45px');
    });

    it('uses dynamic seal size from getSealSizePx for LARGE', () => {
      const doc = createTestDocumentWithTotals({
        type: 'estimate',
        issuerSnapshot: createTestIssuerSnapshot({
          sealImageBase64: SEAL_BASE64,
        }),
      });
      const { html } = generateHtmlTemplate({
        document: doc,
        sensitiveSnapshot: createTestSensitiveSnapshot(),
        mode: 'pdf',
        sealSize: 'LARGE',
      });
      // FORMAL_STANDARD LARGE = 100px
      expect(html).toContain('width: 100px');
      expect(html).toContain('height: 100px');
    });

    it('defaults to MEDIUM (70px) when sealSize is not provided', () => {
      const doc = createTestDocumentWithTotals({
        type: 'estimate',
        issuerSnapshot: createTestIssuerSnapshot({
          sealImageBase64: SEAL_BASE64,
        }),
      });
      const { html } = generateHtmlTemplate({
        document: doc,
        sensitiveSnapshot: createTestSensitiveSnapshot(),
        mode: 'pdf',
      });
      // FORMAL_STANDARD MEDIUM = 70px (matches current hardcoded value)
      expect(html).toContain('width: 70px');
      expect(html).toContain('height: 70px');
    });
  });

  describe('Invoice SIMPLE template', () => {
    it('uses dynamic seal size from getSealSizePx for LARGE', () => {
      const doc = createTestDocumentWithTotals({
        type: 'invoice',
        issuerSnapshot: createTestIssuerSnapshot({
          sealImageBase64: SEAL_BASE64,
        }),
      });
      const { html } = generateHtmlTemplate({
        document: doc,
        sensitiveSnapshot: createTestSensitiveSnapshot(),
        mode: 'pdf',
        invoiceTemplateType: 'SIMPLE',
        sealSize: 'LARGE',
      });
      // SIMPLE LARGE = 70px
      expect(html).toContain('width: 70px');
      expect(html).toContain('height: 70px');
    });

    it('defaults to MEDIUM (50px) when sealSize is not provided', () => {
      const doc = createTestDocumentWithTotals({
        type: 'invoice',
        issuerSnapshot: createTestIssuerSnapshot({
          sealImageBase64: SEAL_BASE64,
        }),
      });
      const { html } = generateHtmlTemplate({
        document: doc,
        sensitiveSnapshot: createTestSensitiveSnapshot(),
        mode: 'pdf',
        invoiceTemplateType: 'SIMPLE',
      });
      // SIMPLE MEDIUM = 50px (matches current hardcoded value)
      expect(html).toContain('width: 50px');
      expect(html).toContain('height: 50px');
    });
  });

  describe('Invoice ACCOUNTING template', () => {
    it('uses dynamic seal size from getSealSizePx for SMALL', () => {
      const doc = createTestDocumentWithTotals({
        type: 'invoice',
        issuerSnapshot: createTestIssuerSnapshot({
          sealImageBase64: SEAL_BASE64,
        }),
      });
      const html = generateInvoiceAccountingTemplate(
        doc,
        createTestSensitiveSnapshot(),
        'SMALL'
      );
      // ACCOUNTING SMALL = 45px
      expect(html).toContain('width: 45px');
      expect(html).toContain('height: 45px');
    });

    it('defaults to MEDIUM (70px) when sealSize is not provided', () => {
      const doc = createTestDocumentWithTotals({
        type: 'invoice',
        issuerSnapshot: createTestIssuerSnapshot({
          sealImageBase64: SEAL_BASE64,
        }),
      });
      const html = generateInvoiceAccountingTemplate(
        doc,
        createTestSensitiveSnapshot()
      );
      // ACCOUNTING MEDIUM = 70px (matches current hardcoded value)
      expect(html).toContain('width: 70px');
      expect(html).toContain('height: 70px');
    });
  });
});

// === mix-blend-mode: multiply tests ===

describe('Seal image mix-blend-mode in templates', () => {
  it('includes mix-blend-mode: multiply in Estimate FORMAL_STANDARD template', () => {
    const doc = createTestDocumentWithTotals({
      type: 'estimate',
      issuerSnapshot: createTestIssuerSnapshot({
        sealImageBase64: SEAL_BASE64,
      }),
    });
    const { html } = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: createTestSensitiveSnapshot(),
      mode: 'pdf',
    });
    expect(html).toContain('mix-blend-mode: multiply');
  });

  it('includes mix-blend-mode: multiply in Invoice SIMPLE template', () => {
    const doc = createTestDocumentWithTotals({
      type: 'invoice',
      issuerSnapshot: createTestIssuerSnapshot({
        sealImageBase64: SEAL_BASE64,
      }),
    });
    const { html } = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: createTestSensitiveSnapshot(),
      mode: 'pdf',
      invoiceTemplateType: 'SIMPLE',
    });
    expect(html).toContain('mix-blend-mode: multiply');
  });

  it('includes mix-blend-mode: multiply in Invoice ACCOUNTING template', () => {
    const doc = createTestDocumentWithTotals({
      type: 'invoice',
      issuerSnapshot: createTestIssuerSnapshot({
        sealImageBase64: SEAL_BASE64,
      }),
    });
    const html = generateInvoiceAccountingTemplate(
      doc,
      createTestSensitiveSnapshot()
    );
    expect(html).toContain('mix-blend-mode: multiply');
  });

  it('includes mix-blend-mode: multiply in MODERN template', () => {
    const doc = createTestDocumentWithTotals({
      type: 'estimate',
      issuerSnapshot: createTestIssuerSnapshot({
        sealImageBase64: SEAL_BASE64,
      }),
    });
    const { html } = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: createTestSensitiveSnapshot(),
      mode: 'pdf',
      templateId: 'MODERN',
    });
    expect(html).toContain('mix-blend-mode: multiply');
  });

  it('includes mix-blend-mode: multiply in CLASSIC template', () => {
    const doc = createTestDocumentWithTotals({
      type: 'estimate',
      issuerSnapshot: createTestIssuerSnapshot({
        sealImageBase64: SEAL_BASE64,
      }),
    });
    const { html } = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: createTestSensitiveSnapshot(),
      mode: 'pdf',
      templateId: 'CLASSIC',
    });
    expect(html).toContain('mix-blend-mode: multiply');
  });

  it('includes mix-blend-mode: multiply in CONSTRUCTION template', () => {
    const doc = createTestDocumentWithTotals({
      type: 'estimate',
      issuerSnapshot: createTestIssuerSnapshot({
        sealImageBase64: SEAL_BASE64,
      }),
    });
    const { html } = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: createTestSensitiveSnapshot(),
      mode: 'pdf',
      templateId: 'CONSTRUCTION',
    });
    expect(html).toContain('mix-blend-mode: multiply');
  });
});

// === opacity: 0.85 consistency tests ===

describe('Seal image opacity in templates', () => {
  it('includes opacity: 0.85 in FORMAL_STANDARD template seal', () => {
    const doc = createTestDocumentWithTotals({
      type: 'estimate',
      issuerSnapshot: createTestIssuerSnapshot({ sealImageBase64: SEAL_BASE64 }),
    });
    const { html } = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: createTestSensitiveSnapshot(),
      mode: 'pdf',
      templateId: 'FORMAL_STANDARD',
    });
    expect(html).toMatch(/\.seal-image\s*\{[^}]*opacity:\s*0\.85/s);
  });

  it('includes opacity: 0.85 in Invoice SIMPLE template seal', () => {
    const doc = createTestDocumentWithTotals({
      type: 'invoice',
      issuerSnapshot: createTestIssuerSnapshot({ sealImageBase64: SEAL_BASE64 }),
    });
    const { html } = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: createTestSensitiveSnapshot(),
      mode: 'pdf',
      invoiceTemplateType: 'SIMPLE',
    });
    expect(html).toMatch(/\.seal-image\s*\{[^}]*opacity:\s*0\.85/s);
  });

  it('includes opacity: 0.85 in Invoice ACCOUNTING template seal', () => {
    const doc = createTestDocumentWithTotals({
      type: 'invoice',
      issuerSnapshot: createTestIssuerSnapshot({ sealImageBase64: SEAL_BASE64 }),
    });
    const html = generateInvoiceAccountingTemplate(
      doc,
      createTestSensitiveSnapshot()
    );
    expect(html).toMatch(/\.seal-image\s*\{[^}]*opacity:\s*0\.85/s);
  });

  it('includes opacity: 0.85 in MODERN template seal', () => {
    const doc = createTestDocumentWithTotals({
      type: 'estimate',
      issuerSnapshot: createTestIssuerSnapshot({ sealImageBase64: SEAL_BASE64 }),
    });
    const { html } = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: createTestSensitiveSnapshot(),
      mode: 'pdf',
      templateId: 'MODERN',
    });
    expect(html).toMatch(/\.seal-image\s*\{[^}]*opacity:\s*0\.85/s);
  });

  it('includes opacity: 0.85 in CLASSIC template seal', () => {
    const doc = createTestDocumentWithTotals({
      type: 'estimate',
      issuerSnapshot: createTestIssuerSnapshot({ sealImageBase64: SEAL_BASE64 }),
    });
    const { html } = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: createTestSensitiveSnapshot(),
      mode: 'pdf',
      templateId: 'CLASSIC',
    });
    expect(html).toMatch(/\.classic-seal-image\s*\{[^}]*opacity:\s*0\.85/s);
  });

  it('includes opacity: 0.85 in CONSTRUCTION template seal', () => {
    const doc = createTestDocumentWithTotals({
      type: 'estimate',
      issuerSnapshot: createTestIssuerSnapshot({ sealImageBase64: SEAL_BASE64 }),
    });
    const { html } = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: createTestSensitiveSnapshot(),
      mode: 'pdf',
      templateId: 'CONSTRUCTION',
    });
    expect(html).toMatch(/\.seal-image\s*\{[^}]*opacity:\s*0\.85/s);
  });
});

// === print-color-adjust tests ===

describe('Seal image print-color-adjust in templates', () => {
  it('includes print-color-adjust: exact in FORMAL_STANDARD template seal', () => {
    const doc = createTestDocumentWithTotals({
      type: 'estimate',
      issuerSnapshot: createTestIssuerSnapshot({ sealImageBase64: SEAL_BASE64 }),
    });
    const { html } = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: createTestSensitiveSnapshot(),
      mode: 'pdf',
      templateId: 'FORMAL_STANDARD',
    });
    expect(html).toMatch(/\.seal-image\s*\{[^}]*print-color-adjust:\s*exact/s);
  });

  it('includes print-color-adjust: exact in SIMPLE template seal', () => {
    const doc = createTestDocumentWithTotals({
      type: 'invoice',
      issuerSnapshot: createTestIssuerSnapshot({ sealImageBase64: SEAL_BASE64 }),
    });
    const { html } = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: createTestSensitiveSnapshot(),
      mode: 'pdf',
      invoiceTemplateType: 'SIMPLE',
    });
    expect(html).toMatch(/\.seal-image\s*\{[^}]*print-color-adjust:\s*exact/s);
  });

  it('includes print-color-adjust: exact in ACCOUNTING template seal', () => {
    const doc = createTestDocumentWithTotals({
      type: 'invoice',
      issuerSnapshot: createTestIssuerSnapshot({ sealImageBase64: SEAL_BASE64 }),
    });
    const html = generateInvoiceAccountingTemplate(
      doc,
      createTestSensitiveSnapshot()
    );
    expect(html).toMatch(/\.seal-image\s*\{[^}]*print-color-adjust:\s*exact/s);
  });

  it('includes print-color-adjust: exact in MODERN template seal', () => {
    const doc = createTestDocumentWithTotals({
      type: 'estimate',
      issuerSnapshot: createTestIssuerSnapshot({ sealImageBase64: SEAL_BASE64 }),
    });
    const { html } = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: createTestSensitiveSnapshot(),
      mode: 'pdf',
      templateId: 'MODERN',
    });
    expect(html).toMatch(/\.seal-image\s*\{[^}]*print-color-adjust:\s*exact/s);
  });

  it('includes print-color-adjust: exact in CLASSIC template seal', () => {
    const doc = createTestDocumentWithTotals({
      type: 'estimate',
      issuerSnapshot: createTestIssuerSnapshot({ sealImageBase64: SEAL_BASE64 }),
    });
    const { html } = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: createTestSensitiveSnapshot(),
      mode: 'pdf',
      templateId: 'CLASSIC',
    });
    expect(html).toMatch(/\.classic-seal-image\s*\{[^}]*print-color-adjust:\s*exact/s);
  });

  it('includes print-color-adjust: exact in CONSTRUCTION template seal', () => {
    const doc = createTestDocumentWithTotals({
      type: 'estimate',
      issuerSnapshot: createTestIssuerSnapshot({ sealImageBase64: SEAL_BASE64 }),
    });
    const { html } = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: createTestSensitiveSnapshot(),
      mode: 'pdf',
      templateId: 'CONSTRUCTION',
    });
    expect(html).toMatch(/\.seal-image\s*\{[^}]*print-color-adjust:\s*exact/s);
  });
});

// === Classic seal frame transparency test ===

describe('Classic seal frame transparency', () => {
  it('classic-seal-frame has background: transparent', () => {
    const doc = createTestDocumentWithTotals({
      type: 'estimate',
      issuerSnapshot: createTestIssuerSnapshot({ sealImageBase64: SEAL_BASE64 }),
    });
    const { html } = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: createTestSensitiveSnapshot(),
      mode: 'pdf',
      templateId: 'CLASSIC',
    });
    expect(html).toMatch(/\.classic-seal-frame\s*\{[^}]*background:\s*transparent/s);
  });
});

// === Modern template CSS class test ===

describe('Modern template seal CSS class', () => {
  it('uses CSS class instead of inline styles for seal blending', () => {
    const doc = createTestDocumentWithTotals({
      type: 'estimate',
      issuerSnapshot: createTestIssuerSnapshot({ sealImageBase64: SEAL_BASE64 }),
    });
    const { html } = generateHtmlTemplate({
      document: doc,
      sensitiveSnapshot: createTestSensitiveSnapshot(),
      mode: 'pdf',
      templateId: 'MODERN',
    });
    // img tag should use class="seal-image", not inline mix-blend-mode
    expect(html).toMatch(/<img[^>]*class="seal-image"[^>]*>/);
    expect(html).not.toMatch(/<img[^>]*style="[^"]*mix-blend-mode[^"]*"[^>]*>/);
  });
});
