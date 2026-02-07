/**
 * Background Designs Tests
 *
 * Tests for CSS background pattern generation (M20).
 */

import { getBackgroundCss } from '@/pdf/backgroundDesigns';
import { generateHtmlTemplate } from '@/pdf/pdfTemplateService';
import type { BackgroundDesign } from '@/types/settings';
import { createTestTemplateInput } from './helpers';

describe('getBackgroundCss', () => {
  describe('NONE', () => {
    it('returns empty string for NONE', () => {
      expect(getBackgroundCss('NONE')).toBe('');
    });
  });

  describe('STRIPE', () => {
    it('contains repeating-linear-gradient', () => {
      const css = getBackgroundCss('STRIPE');
      expect(css).toContain('repeating-linear-gradient');
    });
  });

  describe('WAVE', () => {
    it('contains radial-gradient', () => {
      const css = getBackgroundCss('WAVE');
      expect(css).toContain('radial-gradient');
    });
  });

  describe('GRID', () => {
    it('contains linear-gradient', () => {
      const css = getBackgroundCss('GRID');
      expect(css).toContain('linear-gradient');
    });
  });

  describe('DOTS', () => {
    it('contains radial-gradient', () => {
      const css = getBackgroundCss('DOTS');
      expect(css).toContain('radial-gradient');
    });
  });

  describe('common structure for all patterns (except NONE)', () => {
    const PATTERNS: BackgroundDesign[] = ['STRIPE', 'WAVE', 'GRID', 'DOTS'];

    it.each(PATTERNS)('%s contains body::before pseudo-element', (design) => {
      const css = getBackgroundCss(design);
      expect(css).toContain('body::before');
    });

    it.each(PATTERNS)('%s contains position: fixed', (design) => {
      const css = getBackgroundCss(design);
      expect(css).toContain('position: fixed');
    });

    it.each(PATTERNS)('%s contains z-index: -1', (design) => {
      const css = getBackgroundCss(design);
      expect(css).toContain('z-index: -1');
    });

    it.each(PATTERNS)('%s contains content declaration', (design) => {
      const css = getBackgroundCss(design);
      expect(css).toMatch(/content:\s*['"]{2}/);
    });

    it.each(PATTERNS)('%s covers full viewport (width: 100%%, height: 100%%)', (design) => {
      const css = getBackgroundCss(design);
      expect(css).toContain('width: 100%');
      expect(css).toContain('height: 100%');
    });
  });

  describe('forbidden CSS properties', () => {
    const ALL_DESIGNS: BackgroundDesign[] = ['NONE', 'STRIPE', 'WAVE', 'GRID', 'DOTS'];

    it.each(ALL_DESIGNS)('%s does not contain conic-gradient', (design) => {
      const css = getBackgroundCss(design);
      expect(css).not.toContain('conic-gradient');
    });

    it.each(ALL_DESIGNS)('%s does not contain backdrop-filter', (design) => {
      const css = getBackgroundCss(design);
      expect(css).not.toContain('backdrop-filter');
    });
  });

  describe('defense against invalid values', () => {
    it('returns empty string for unknown design value', () => {
      // Cast to bypass TypeScript for runtime safety test
      const css = getBackgroundCss('UNKNOWN' as BackgroundDesign);
      expect(css).toBe('');
    });
  });
});

describe('background design integration with generateHtmlTemplate', () => {
  // Design → unique CSS fragment for disambiguating similar patterns
  const DESIGN_UNIQUE_FRAGMENTS: Record<Exclude<BackgroundDesign, 'NONE'>, string> = {
    STRIPE: 'repeating-linear-gradient(45deg',
    WAVE: 'ellipse 60px 30px',
    GRID: 'linear-gradient(90deg',
    DOTS: 'circle 1.5px at 10px 10px',
  };

  // Template route definitions
  const TEMPLATES = [
    { name: 'estimate', docType: 'estimate' as const, invoiceTemplateType: undefined },
    { name: 'invoice SIMPLE', docType: 'invoice' as const, invoiceTemplateType: 'SIMPLE' as const },
    { name: 'invoice ACCOUNTING', docType: 'invoice' as const, invoiceTemplateType: 'ACCOUNTING' as const },
  ];

  const ACTIVE_DESIGNS: Array<Exclude<BackgroundDesign, 'NONE'>> = ['STRIPE', 'WAVE', 'GRID', 'DOTS'];

  // Matrix: NONE × all templates → no injection
  describe.each(TEMPLATES)('NONE × $name', ({ docType, invoiceTemplateType }) => {
    it('does not inject body::before', () => {
      const input = createTestTemplateInput({
        mode: 'pdf',
        backgroundDesign: 'NONE',
        invoiceTemplateType,
        document: { type: docType },
      });
      const { html } = generateHtmlTemplate(input);
      expect(html).not.toContain('body::before');
    });
  });

  // Matrix: active designs × all templates → injection with unique CSS fragment
  describe.each(TEMPLATES)('active designs × $name', ({ docType, invoiceTemplateType }) => {
    it.each(ACTIVE_DESIGNS)('%s injects body::before with unique CSS fragment', (design) => {
      const input = createTestTemplateInput({
        mode: 'pdf',
        backgroundDesign: design,
        invoiceTemplateType,
        document: { type: docType },
      });
      const { html } = generateHtmlTemplate(input);
      expect(html).toContain('body::before');
      expect(html).toContain(DESIGN_UNIQUE_FRAGMENTS[design]);
    });
  });

  // Screen mode: never inject regardless of design
  it.each(ACTIVE_DESIGNS)('screen mode does not inject %s', (design) => {
    const input = createTestTemplateInput({
      mode: 'screen',
      backgroundDesign: design,
    });
    const { html } = generateHtmlTemplate(input);
    expect(html).not.toContain('body::before');
  });
});
