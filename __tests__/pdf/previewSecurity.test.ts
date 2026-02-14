/**
 * @jest-environment jsdom
 */
/**
 * Tests for Preview Security: CSP injection, previewData validation,
 * and FIT_TO_SCREEN_SCRIPT DOM behaviour.
 *
 * Uses jsdom environment for DOM-based tests of the fit-to-screen script.
 */

import { deriveDisplayHtml, generateHtmlTemplate } from '@/pdf/pdfTemplateService';
import { validatePreviewDocument } from '@/utils/previewDataValidator';
import { injectCsp, FIT_TO_SCREEN_SCRIPT } from '@/utils/previewHtmlSecurity';
import { createTestTemplateInput, createTestDocument, resetTestIdCounter } from './helpers';

describe('Preview Security', () => {
  beforeEach(() => {
    resetTestIdCounter();
  });

  // --- CSP injection (shared function) ---

  describe('CSP injection (injectCsp)', () => {
    it('injects script-src none CSP into portrait displayHtml', () => {
      const input = createTestTemplateInput({ mode: 'pdf' });
      const { html } = generateHtmlTemplate(input);
      const result = injectCsp(deriveDisplayHtml(html, 'PORTRAIT'));
      expect(result.success).toBe(true);
      expect(result.html).toContain('Content-Security-Policy');
      expect(result.html).toContain("script-src 'none'");
    });

    it('injects script-src none CSP into landscape displayHtml', () => {
      const input = createTestTemplateInput({ mode: 'pdf' });
      const { html } = generateHtmlTemplate(input);
      const result = injectCsp(deriveDisplayHtml(html, 'LANDSCAPE'));
      expect(result.success).toBe(true);
      expect(result.html).toContain("script-src 'none'");
    });

    it('CSP meta appears before </head>', () => {
      const input = createTestTemplateInput({ mode: 'pdf' });
      const { html } = generateHtmlTemplate(input);
      const result = injectCsp(deriveDisplayHtml(html, 'PORTRAIT'));
      const cspIdx = result.html.indexOf("script-src 'none'");
      const headCloseIdx = result.html.indexOf('</head>');
      expect(cspIdx).toBeGreaterThan(-1);
      expect(headCloseIdx).toBeGreaterThan(-1);
      expect(cspIdx).toBeLessThan(headCloseIdx);
    });

    it('returns success=false for empty input', () => {
      const result = injectCsp('');
      expect(result.html).toBe('');
      expect(result.success).toBe(false);
    });

    it('returns success=false when no </head> tag (fail-closed)', () => {
      const noHead = '<div>no head</div>';
      const result = injectCsp(noHead);
      expect(result.html).toBe(noHead);
      expect(result.success).toBe(false);
    });

    it('handles uppercase </HEAD> (case-insensitive)', () => {
      const html = '<html><HEAD><title>Test</title></HEAD><body></body></html>';
      const result = injectCsp(html);
      expect(result.success).toBe(true);
      expect(result.html).toContain("script-src 'none'");
      const cspIdx = result.html.indexOf("script-src 'none'");
      const headCloseIdx = result.html.indexOf('</HEAD>');
      expect(cspIdx).toBeLessThan(headCloseIdx);
    });

    it('handles mixed-case </HeAd> (case-insensitive)', () => {
      const html = '<html><head></HeAd><body></body></html>';
      const result = injectCsp(html);
      expect(result.success).toBe(true);
      expect(result.html).toContain("script-src 'none'");
    });
  });

  // --- FIT_TO_SCREEN_SCRIPT DOM behaviour (jsdom) ---

  describe('FIT_TO_SCREEN_SCRIPT (DOM)', () => {
    it('applies transform scale when body is taller than viewport', () => {
      // jsdom default window.innerHeight = 768
      document.body.innerHTML = '<div class="document-container">content</div>';
      // Simulate a tall body by overriding scrollHeight
      Object.defineProperty(document.body, 'scrollHeight', { value: 1200, configurable: true });

      // eslint-disable-next-line no-eval
      eval(FIT_TO_SCREEN_SCRIPT);

      const expectedScale = 768 / 1200;
      expect(document.body.style.transform).toBe(`scale(${expectedScale})`);
      expect(document.body.style.transformOrigin).toBe('top center');
      expect(document.body.style.overflow).toBe('hidden');
      expect(document.documentElement.style.overflow).toBe('hidden');
      expect(document.documentElement.style.height).toBe('100vh');
    });

    it('does NOT apply transform when body fits within viewport', () => {
      document.body.innerHTML = '<div>short</div>';
      Object.defineProperty(document.body, 'scrollHeight', { value: 500, configurable: true });
      document.body.style.transform = '';

      // eslint-disable-next-line no-eval
      eval(FIT_TO_SCREEN_SCRIPT);

      expect(document.body.style.transform).toBe('');
    });

    it('returns true (WebView injectedJavaScript contract)', () => {
      document.body.innerHTML = '<div>content</div>';
      Object.defineProperty(document.body, 'scrollHeight', { value: 500, configurable: true });

      // eslint-disable-next-line no-eval
      const ret = eval(FIT_TO_SCREEN_SCRIPT);
      expect(ret).toBe(true);
    });

    afterEach(() => {
      // Reset DOM state
      document.body.innerHTML = '';
      document.body.removeAttribute('style');
      document.documentElement.removeAttribute('style');
    });
  });

  // --- validatePreviewDocument ---

  describe('validatePreviewDocument', () => {
    it('accepts a valid document', () => {
      const doc = createTestDocument();
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('estimate');
      expect(result!.clientName).toBe('テスト顧客');
    });

    it('rejects null', () => {
      expect(validatePreviewDocument(null)).toBeNull();
    });

    it('rejects non-object', () => {
      expect(validatePreviewDocument('string')).toBeNull();
      expect(validatePreviewDocument(42)).toBeNull();
    });

    it('rejects invalid type enum', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).type = 'invalid';
      expect(validatePreviewDocument(doc)).toBeNull();
    });

    it('rejects invalid status enum', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).status = 'cancelled';
      expect(validatePreviewDocument(doc)).toBeNull();
    });

    it('rejects missing clientName', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).clientName = 123;
      expect(validatePreviewDocument(doc)).toBeNull();
    });

    it('rejects missing lineItems', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).lineItems = 'not-array';
      expect(validatePreviewDocument(doc)).toBeNull();
    });

    it('rejects lineItems containing non-objects', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).lineItems = [null];
      expect(validatePreviewDocument(doc)).toBeNull();
    });

    // --- Numeric normalisation ---

    it('normalises non-finite quantityMilli to 0', () => {
      const doc = createTestDocument();
      (doc.lineItems[0] as unknown as Record<string, unknown>).quantityMilli = 'NaN';
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].quantityMilli).toBe(0);
    });

    it('normalises non-finite unitPrice to 0', () => {
      const doc = createTestDocument();
      (doc.lineItems[0] as unknown as Record<string, unknown>).unitPrice = Infinity;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].unitPrice).toBe(0);
    });

    it('normalises invalid taxRate to 10', () => {
      const doc = createTestDocument();
      (doc.lineItems[0] as unknown as Record<string, unknown>).taxRate = 5;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].taxRate).toBe(10);
    });

    it('preserves valid taxRate 0', () => {
      const doc = createTestDocument();
      doc.lineItems[0].taxRate = 0;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].taxRate).toBe(0);
    });

    it('normalises invalid carriedForwardAmount to null', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).carriedForwardAmount = 'bad';
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.carriedForwardAmount).toBeNull();
    });

    it('normalises non-string name/unit to empty string', () => {
      const doc = createTestDocument();
      (doc.lineItems[0] as unknown as Record<string, unknown>).name = 123;
      (doc.lineItems[0] as unknown as Record<string, unknown>).unit = null;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].name).toBe('');
      expect(result!.lineItems[0].unit).toBe('');
    });

    it('normalises XSS payload in numeric fields', () => {
      const doc = createTestDocument();
      (doc.lineItems[0] as unknown as Record<string, unknown>).unitPrice = '<img onerror=alert(1)>';
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].unitPrice).toBe(0);
    });

    // --- Optional string field normalisation ---

    it('normalises non-string optional fields to null', () => {
      const doc = createTestDocument();
      const d = doc as unknown as Record<string, unknown>;
      d.clientAddress = 42;
      d.subject = { malicious: true };
      d.notes = ['array'];
      d.validUntil = true;
      d.dueDate = 999;
      d.paidAt = {};
      d.customerId = 123;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.clientAddress).toBeNull();
      expect(result!.subject).toBeNull();
      expect(result!.notes).toBeNull();
      expect(result!.validUntil).toBeNull();
      expect(result!.dueDate).toBeNull();
      expect(result!.paidAt).toBeNull();
      expect(result!.customerId).toBeNull();
    });

    it('preserves valid optional string fields', () => {
      const doc = createTestDocument();
      const d = doc as unknown as Record<string, unknown>;
      d.clientAddress = '東京都';
      d.subject = '工事件名';
      d.notes = '備考';
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.clientAddress).toBe('東京都');
      expect(result!.subject).toBe('工事件名');
      expect(result!.notes).toBe('備考');
    });

    it('normalises non-string id to empty string', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).id = 12345;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('');
    });

    it('normalises non-string lineItem id to empty string', () => {
      const doc = createTestDocument();
      (doc.lineItems[0] as unknown as Record<string, unknown>).id = null;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.lineItems[0].id).toBe('');
    });

    it('normalises non-finite createdAt/updatedAt to current time', () => {
      const doc = createTestDocument();
      const d = doc as unknown as Record<string, unknown>;
      d.createdAt = 'bad';
      d.updatedAt = NaN;
      const before = Date.now();
      const result = validatePreviewDocument(doc);
      const after = Date.now();
      expect(result).not.toBeNull();
      expect(result!.createdAt).toBeGreaterThanOrEqual(before);
      expect(result!.createdAt).toBeLessThanOrEqual(after);
      expect(result!.updatedAt).toBeGreaterThanOrEqual(before);
      expect(result!.updatedAt).toBeLessThanOrEqual(after);
    });

    it('does not pass through unknown extra fields', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).__proto_pollute__ = 'evil';
      (doc as unknown as Record<string, unknown>).extraField = { dangerous: true };
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect((result as unknown as Record<string, unknown>).__proto_pollute__).toBeUndefined();
      expect((result as unknown as Record<string, unknown>).extraField).toBeUndefined();
    });

    // --- issuerSnapshot normalisation ---

    it('normalises missing issuerSnapshot to safe defaults', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).issuerSnapshot = undefined;
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.issuerSnapshot).toEqual({
        companyName: null,
        representativeName: null,
        address: null,
        phone: null,
        fax: null,
        sealImageBase64: null,
        contactPerson: null,
        email: null,
      });
    });

    it('normalises non-string issuerSnapshot fields to null', () => {
      const doc = createTestDocument();
      (doc as unknown as Record<string, unknown>).issuerSnapshot = {
        companyName: 123,
        representativeName: true,
        address: 'valid address',
        phone: null,
        fax: undefined,
        sealImageBase64: null,
        contactPerson: null,
        email: null,
      };
      const result = validatePreviewDocument(doc);
      expect(result).not.toBeNull();
      expect(result!.issuerSnapshot.companyName).toBeNull();
      expect(result!.issuerSnapshot.representativeName).toBeNull();
      expect(result!.issuerSnapshot.address).toBe('valid address');
    });

    it('does not share issuerSnapshot reference between calls (no mutation leak)', () => {
      const doc1 = createTestDocument();
      (doc1 as unknown as Record<string, unknown>).issuerSnapshot = undefined;
      const doc2 = createTestDocument();
      (doc2 as unknown as Record<string, unknown>).issuerSnapshot = undefined;

      const result1 = validatePreviewDocument(doc1);
      const result2 = validatePreviewDocument(doc2);

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();
      // Must be structurally equal but distinct references
      expect(result1!.issuerSnapshot).toEqual(result2!.issuerSnapshot);
      expect(result1!.issuerSnapshot).not.toBe(result2!.issuerSnapshot);
    });
  });
});
