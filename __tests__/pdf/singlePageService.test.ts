/**
 * Single Page Service Tests
 *
 * Tests for the single-page PDF enforcement injection service.
 */

import {
  injectSinglePageEnforcement,
  injectSinglePageCssOnly,
} from '@/pdf/singlePageService';

const minimalHtml =
  '<html><head><style>body{}</style></head><body><div class="document-container">content</div></body></html>';

describe('injectSinglePageEnforcement', () => {
  it('injects @page CSS rule for portrait', () => {
    const result = injectSinglePageEnforcement(minimalHtml, false);
    expect(result.html).toContain('@page');
    expect(result.html).toContain('size: A4 portrait');
    expect(result.html).not.toContain('size: A4 landscape');
  });

  it('injects @page CSS rule for landscape', () => {
    const result = injectSinglePageEnforcement(minimalHtml, true);
    expect(result.html).toContain('size: A4 landscape');
    expect(result.html).not.toContain('size: A4 portrait');
  });

  it('defaults to portrait when isLandscape is omitted', () => {
    const result = injectSinglePageEnforcement(minimalHtml);
    expect(result.html).toContain('size: A4 portrait');
  });

  it('injects overflow: hidden on html and body', () => {
    const result = injectSinglePageEnforcement(minimalHtml, false);
    expect(result.html).toContain('overflow: hidden');
  });

  it('injects page-break-inside: avoid', () => {
    const result = injectSinglePageEnforcement(minimalHtml, false);
    expect(result.html).toContain('page-break-inside: avoid');
  });

  it('injects break-inside: avoid', () => {
    const result = injectSinglePageEnforcement(minimalHtml, false);
    expect(result.html).toContain('break-inside: avoid');
  });

  it('injects <script> tag before </body>', () => {
    const result = injectSinglePageEnforcement(minimalHtml, false);
    expect(result.html).toContain('<script>');
    expect(result.html).toContain('</script>');
    const scriptIdx = result.html.indexOf('<script>');
    const bodyCloseIdx = result.html.indexOf('</body>');
    expect(scriptIdx).toBeLessThan(bodyCloseIdx);
  });

  it('includes transform scale logic using getBoundingClientRect', () => {
    const result = injectSinglePageEnforcement(minimalHtml, false);
    expect(result.html).toContain('getBoundingClientRect');
    expect(result.html).toContain('transform');
    expect(result.html).toContain("scale(");
  });

  it('uses single-pass scaling (no convergence loop)', () => {
    const result = injectSinglePageEnforcement(minimalHtml, false);
    // Single-pass: no while loop or MAX_ITERATIONS in the script
    expect(result.html).not.toMatch(/while\s*\(/);
    expect(result.html).not.toContain('MAX_ITERATIONS');
  });

  it('waits for document.fonts.ready before measuring', () => {
    const result = injectSinglePageEnforcement(minimalHtml, false);
    expect(result.html).toContain('document.fonts');
    expect(result.html).toContain('fonts.ready');
  });

  it('waits for images to load before measuring', () => {
    const result = injectSinglePageEnforcement(minimalHtml, false);
    expect(result.html).toContain("querySelectorAll('img')");
  });

  it('uses portrait page height (842) in script for portrait mode', () => {
    const result = injectSinglePageEnforcement(minimalHtml, false);
    expect(result.html).toContain('842');
  });

  it('uses landscape page height (595) in script for landscape mode', () => {
    const result = injectSinglePageEnforcement(minimalHtml, true);
    expect(result.html).toMatch(/var\s+pageHeight\s*=\s*595/);
  });

  it('does not modify the original content', () => {
    const result = injectSinglePageEnforcement(minimalHtml, false);
    expect(result.html).toContain('class="document-container">content</div>');
  });

  it('handles HTML without style tag gracefully', () => {
    const noStyleHtml =
      '<html><head></head><body><div class="document-container">content</div></body></html>';
    const result = injectSinglePageEnforcement(noStyleHtml, false);
    expect(result.html).toContain('<style>');
    expect(result.html).toContain('@page');
    expect(result.html).toContain('<script>');
    expect(result.cssInjected).toBe(true);
    expect(result.scriptInjected).toBe(true);
  });

  it('injects @page { margin: 0 } to prevent extra printer margins', () => {
    const result = injectSinglePageEnforcement(minimalHtml, false);
    expect(result.html).toContain('margin: 0');
  });

  describe('injection success flags', () => {
    it('returns cssInjected=true and scriptInjected=true for valid HTML', () => {
      const result = injectSinglePageEnforcement(minimalHtml, false);
      expect(result.cssInjected).toBe(true);
      expect(result.scriptInjected).toBe(true);
    });

    it('returns cssInjected=false when no </style> and no </head>', () => {
      const degenerateHtml = '<div>no head tag</div>';
      const result = injectSinglePageEnforcement(degenerateHtml, false);
      expect(result.cssInjected).toBe(false);
    });

    it('returns scriptInjected=false when no </body> tag', () => {
      const noBodyHtml = '<html><head><style></style></head><div>no body close</div></html>';
      const result = injectSinglePageEnforcement(noBodyHtml, false);
      expect(result.scriptInjected).toBe(false);
      // CSS should still be injected
      expect(result.cssInjected).toBe(true);
    });

    it('returns both false for completely degenerate HTML', () => {
      const result = injectSinglePageEnforcement('plain text', false);
      expect(result.cssInjected).toBe(false);
      expect(result.scriptInjected).toBe(false);
      // Original content preserved
      expect(result.html).toBe('plain text');
    });
  });
});

describe('injectSinglePageCssOnly', () => {
  it('injects @page CSS for portrait', () => {
    const result = injectSinglePageCssOnly(minimalHtml, false);
    expect(result).toContain('@page');
    expect(result).toContain('size: A4 portrait');
  });

  it('injects @page CSS for landscape', () => {
    const result = injectSinglePageCssOnly(minimalHtml, true);
    expect(result).toContain('size: A4 landscape');
  });

  it('does NOT inject <script> tag', () => {
    const result = injectSinglePageCssOnly(minimalHtml, false);
    expect(result).not.toContain('<script>');
  });

  it('injects overflow: hidden', () => {
    const result = injectSinglePageCssOnly(minimalHtml, false);
    expect(result).toContain('overflow: hidden');
  });

  it('injects page-break-inside: avoid', () => {
    const result = injectSinglePageCssOnly(minimalHtml, false);
    expect(result).toContain('page-break-inside: avoid');
  });

  it('defaults to portrait when isLandscape is omitted', () => {
    const result = injectSinglePageCssOnly(minimalHtml);
    expect(result).toContain('size: A4 portrait');
  });

  it('does not modify the original content', () => {
    const result = injectSinglePageCssOnly(minimalHtml, false);
    expect(result).toContain('class="document-container">content</div>');
  });
});
