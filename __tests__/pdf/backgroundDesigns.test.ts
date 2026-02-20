/**
 * Background Designs Tests
 *
 * Tests for background pattern generation (M20).
 * Updated for real <div> element approach (no ::before pseudo-elements).
 */

import { getBackgroundCss, getBackgroundHtml, getBackgroundOverlayCss } from '@/pdf/backgroundDesigns';
import { generateHtmlTemplate } from '@/pdf/pdfTemplateService';
import type { BackgroundDesign } from '@/types/settings';
import { createTestTemplateInput } from './helpers';

describe('getBackgroundOverlayCss', () => {
  it('returns CSS for .bg-overlay class', () => {
    const css = getBackgroundOverlayCss();
    expect(css).toContain('.bg-overlay');
    expect(css).toContain('position: absolute');
    expect(css).toContain('z-index: 0');
    expect(css).toContain('pointer-events: none');
    expect(css).toContain('.document-container');
  });

  it('includes print-color-adjust: exact for PDF background rendering', () => {
    const css = getBackgroundOverlayCss();
    // Use regex to match standalone property (not -webkit- prefixed variant)
    expect(css).toMatch(/[\s;{]print-color-adjust:\s*exact/);
  });

  it('includes -webkit-print-color-adjust: exact for WebKit PDF rendering', () => {
    const css = getBackgroundOverlayCss();
    expect(css).toContain('-webkit-print-color-adjust: exact');
  });

  it('document-container does not set z-index (allows mix-blend-mode to cross stacking contexts)', () => {
    const css = getBackgroundOverlayCss();
    // .document-container must NOT have z-index to prevent stacking context isolation.
    // Without z-index, seal images with mix-blend-mode: multiply can blend with the
    // bg-overlay beneath, making white backgrounds transparent on colored/patterned backgrounds.
    expect(css).not.toMatch(/\.document-container[^}]*z-index/);
  });
});

describe('getBackgroundCss', () => {
  it('returns empty string for NONE', () => {
    expect(getBackgroundCss('NONE')).toBe('');
  });

  it('returns overlay CSS for active designs', () => {
    const css = getBackgroundCss('STRIPE');
    expect(css).toContain('.bg-overlay');
  });
});

describe('getBackgroundHtml', () => {
  describe('NONE', () => {
    it('returns empty string', () => {
      expect(getBackgroundHtml('NONE')).toBe('');
    });
  });

  describe('STRIPE', () => {
    it('returns div with repeating-linear-gradient', () => {
      const html = getBackgroundHtml('STRIPE');
      expect(html).toContain('<div class="bg-overlay"');
      expect(html).toContain('repeating-linear-gradient');
    });
  });

  describe('WAVE', () => {
    it('returns div with radial-gradient', () => {
      const html = getBackgroundHtml('WAVE');
      expect(html).toContain('<div class="bg-overlay"');
      expect(html).toContain('radial-gradient');
    });
  });

  describe('GRID', () => {
    it('returns div with linear-gradient', () => {
      const html = getBackgroundHtml('GRID');
      expect(html).toContain('<div class="bg-overlay"');
      expect(html).toContain('linear-gradient');
    });
  });

  describe('DOTS', () => {
    it('returns div with radial-gradient', () => {
      const html = getBackgroundHtml('DOTS');
      expect(html).toContain('<div class="bg-overlay"');
      expect(html).toContain('radial-gradient');
    });
  });

  describe('IMAGE', () => {
    const FAKE_DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';

    it('returns div with background-image when data URL provided', () => {
      const html = getBackgroundHtml('IMAGE', FAKE_DATA_URL);
      expect(html).toContain('<div class="bg-overlay"');
      expect(html).toContain('background-image');
      expect(html).toContain(FAKE_DATA_URL);
    });

    it('contains background-size: cover', () => {
      const html = getBackgroundHtml('IMAGE', FAKE_DATA_URL);
      expect(html).toContain('background-size: cover');
    });

    it('returns empty string when no data URL provided', () => {
      expect(getBackgroundHtml('IMAGE')).toBe('');
    });

    it('returns empty string when data URL is null', () => {
      expect(getBackgroundHtml('IMAGE', null)).toBe('');
    });
  });

  describe('common structure for all patterns (except NONE)', () => {
    const PATTERNS: BackgroundDesign[] = ['STRIPE', 'WAVE', 'GRID', 'DOTS'];

    it.each(PATTERNS)('%s returns a div with class bg-overlay', (design) => {
      const html = getBackgroundHtml(design);
      expect(html).toContain('<div class="bg-overlay"');
    });

    it.each(PATTERNS)('%s contains opacity style', (design) => {
      const html = getBackgroundHtml(design);
      expect(html).toContain('opacity:');
    });
  });

  describe('forbidden CSS properties', () => {
    const ALL_DESIGNS: BackgroundDesign[] = ['NONE', 'STRIPE', 'WAVE', 'GRID', 'DOTS', 'IMAGE'];

    it.each(ALL_DESIGNS)('%s does not contain conic-gradient', (design) => {
      const html = getBackgroundHtml(design);
      expect(html).not.toContain('conic-gradient');
    });

    it.each(ALL_DESIGNS)('%s does not contain backdrop-filter', (design) => {
      const html = getBackgroundHtml(design);
      expect(html).not.toContain('backdrop-filter');
    });
  });

  describe('defense against invalid values', () => {
    it('returns empty string for unknown design value', () => {
      expect(getBackgroundHtml('UNKNOWN' as BackgroundDesign)).toBe('');
    });
  });
});

describe('background design integration with generateHtmlTemplate', () => {
  const FAKE_DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';

  const DESIGN_UNIQUE_FRAGMENTS: Record<Exclude<BackgroundDesign, 'NONE'>, string> = {
    STRIPE: 'repeating-linear-gradient(45deg',
    WAVE: 'ellipse 60px 30px',
    GRID: 'linear-gradient(90deg',
    DOTS: 'circle 1.5px at 10px 10px',
    IMAGE: 'background-image',
  };

  const TEMPLATES = [
    { name: 'estimate', docType: 'estimate' as const, invoiceTemplateType: undefined },
    { name: 'invoice SIMPLE', docType: 'invoice' as const, invoiceTemplateType: 'SIMPLE' as const },
    { name: 'invoice ACCOUNTING', docType: 'invoice' as const, invoiceTemplateType: 'ACCOUNTING' as const },
  ];

  const CSS_PATTERN_DESIGNS: Array<Exclude<BackgroundDesign, 'NONE' | 'IMAGE'>> = ['STRIPE', 'WAVE', 'GRID', 'DOTS'];
  const ACTIVE_DESIGNS: Array<Exclude<BackgroundDesign, 'NONE'>> = ['STRIPE', 'WAVE', 'GRID', 'DOTS', 'IMAGE'];

  // Matrix: NONE x all templates -> no bg-overlay div
  describe.each(TEMPLATES)('NONE x $name', ({ docType, invoiceTemplateType }) => {
    it('does not inject bg-overlay div', () => {
      const input = createTestTemplateInput({
        mode: 'pdf',
        backgroundDesign: 'NONE',
        invoiceTemplateType,
        document: { type: docType },
      });
      const { html } = generateHtmlTemplate(input);
      expect(html).not.toContain('bg-overlay');
    });
  });

  // Matrix: CSS pattern designs x all templates -> bg-overlay div with unique CSS fragment
  describe.each(TEMPLATES)('CSS pattern designs x $name', ({ docType, invoiceTemplateType }) => {
    it.each(CSS_PATTERN_DESIGNS)('%s injects bg-overlay div with unique CSS fragment', (design) => {
      const input = createTestTemplateInput({
        mode: 'pdf',
        backgroundDesign: design,
        invoiceTemplateType,
        document: { type: docType },
      });
      const { html } = generateHtmlTemplate(input);
      expect(html).toContain('bg-overlay');
      expect(html).toContain(DESIGN_UNIQUE_FRAGMENTS[design]);
    });
  });

  // IMAGE x all templates -> bg-overlay div with background-image when data URL provided
  describe.each(TEMPLATES)('IMAGE x $name', ({ docType, invoiceTemplateType }) => {
    it('injects bg-overlay div with background-image when data URL provided', () => {
      const input = createTestTemplateInput({
        mode: 'pdf',
        backgroundDesign: 'IMAGE',
        backgroundImageDataUrl: FAKE_DATA_URL,
        invoiceTemplateType,
        document: { type: docType },
      });
      const { html } = generateHtmlTemplate(input);
      expect(html).toContain('bg-overlay');
      expect(html).toContain('background-image');
    });

    it('does not inject bg-overlay div when no data URL', () => {
      const input = createTestTemplateInput({
        mode: 'pdf',
        backgroundDesign: 'IMAGE',
        invoiceTemplateType,
        document: { type: docType },
      });
      const { html } = generateHtmlTemplate(input);
      // No data URL means no overlay inserted (empty string returned by getBackgroundHtml)
      expect(html).not.toContain('<div class="bg-overlay"');
    });
  });

  // Screen mode: never inject regardless of design
  it.each(ACTIVE_DESIGNS)('screen mode does not inject %s', (design) => {
    const input = createTestTemplateInput({
      mode: 'screen',
      backgroundDesign: design,
      ...(design === 'IMAGE' ? { backgroundImageDataUrl: FAKE_DATA_URL } : {}),
    });
    const { html } = generateHtmlTemplate(input);
    expect(html).not.toContain('bg-overlay');
  });
});
