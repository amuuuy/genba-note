/**
 * Tests for Preview Orientation feature (M18)
 *
 * Tests the shared pure functions that preview.tsx imports and uses directly.
 * toggleOrientation and deriveDisplayHtml are exported from pdfTemplateService
 * and used in both preview.tsx (production) and here (test), ensuring these
 * tests validate the exact same code paths as the UI.
 */

import type { PreviewOrientation } from '@/types/settings';
import type { PdfGenerationOptions } from '@/pdf/types';
import {
  toggleOrientation,
  deriveDisplayHtml,
  generateHtmlTemplate,
} from '@/pdf/pdfTemplateService';
import { createTestTemplateInput, resetTestIdCounter } from './helpers';

describe('Preview Orientation (M18)', () => {
  beforeEach(() => {
    resetTestIdCounter();
  });

  describe('PreviewOrientation type', () => {
    it('accepts PORTRAIT value', () => {
      const orientation: PreviewOrientation = 'PORTRAIT';
      expect(orientation).toBe('PORTRAIT');
    });

    it('accepts LANDSCAPE value', () => {
      const orientation: PreviewOrientation = 'LANDSCAPE';
      expect(orientation).toBe('LANDSCAPE');
    });
  });

  describe('PdfGenerationOptions type', () => {
    it('accepts empty options object', () => {
      const options: PdfGenerationOptions = {};
      expect(options.orientation).toBeUndefined();
    });

    it('accepts orientation option', () => {
      const options: PdfGenerationOptions = { orientation: 'LANDSCAPE' };
      expect(options.orientation).toBe('LANDSCAPE');
    });
  });

  describe('toggleOrientation (shared with preview.tsx)', () => {
    it('toggling from PORTRAIT produces LANDSCAPE', () => {
      expect(toggleOrientation('PORTRAIT')).toBe('LANDSCAPE');
    });

    it('toggling from LANDSCAPE produces PORTRAIT', () => {
      expect(toggleOrientation('LANDSCAPE')).toBe('PORTRAIT');
    });
  });

  describe('deriveDisplayHtml (shared with preview.tsx)', () => {
    it('injects portrait viewport (width=800) when orientation is PORTRAIT', () => {
      const input = createTestTemplateInput({ mode: 'pdf' });
      const { html } = generateHtmlTemplate(input);
      const displayHtml = deriveDisplayHtml(html, 'PORTRAIT');
      expect(displayHtml).toContain('<meta name="viewport" content="width=800">');
      expect(displayHtml).not.toContain('width=device-width');
      // Single-page enforcement injects portrait @page rule
      expect(displayHtml).toContain('size: A4 portrait');
      expect(displayHtml).not.toContain('size: A4 landscape');
      expect(displayHtml).not.toBe(html);
    });

    it('returns empty string for empty html', () => {
      expect(deriveDisplayHtml('', 'LANDSCAPE')).toBe('');
      expect(deriveDisplayHtml('', 'PORTRAIT')).toBe('');
    });

    it('returns landscape-injected html when orientation is LANDSCAPE', () => {
      const input = createTestTemplateInput({ mode: 'pdf' });
      const { html } = generateHtmlTemplate(input);
      const displayHtml = deriveDisplayHtml(html, 'LANDSCAPE');
      expect(displayHtml).toContain('@page { size: A4 landscape; }');
      expect(displayHtml).toContain('min-width: 1130px');
      expect(displayHtml).toContain('<meta name="viewport" content="width=1130">');
      expect(displayHtml).not.toBe(html);
    });

    it('inserts portrait viewport before </head> when no viewport meta exists', () => {
      const htmlWithoutViewport = '<html><head><title>Test</title></head><body>content</body></html>';
      const displayHtml = deriveDisplayHtml(htmlWithoutViewport, 'PORTRAIT');
      const metaIdx = displayHtml.indexOf('<meta name="viewport" content="width=800">');
      const headCloseIdx = displayHtml.indexOf('</head>');
      expect(metaIdx).toBeGreaterThan(-1);
      expect(headCloseIdx).toBeGreaterThan(-1);
      expect(metaIdx).toBeLessThan(headCloseIdx);
    });

    it('returns html unchanged if no viewport and no </head> for PORTRAIT', () => {
      const degenerateHtml = '<div>no head tag</div>';
      const displayHtml = deriveDisplayHtml(degenerateHtml, 'PORTRAIT');
      expect(displayHtml).toBe(degenerateHtml);
    });
  });
});
