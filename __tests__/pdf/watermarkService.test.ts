/**
 * Watermark Service Tests
 *
 * Tests for the SAMPLE watermark injection for free-tier PDF output.
 */

import { injectSampleWatermark, WATERMARK_CSS_CLASS } from '@/pdf/watermarkService';

describe('injectSampleWatermark', () => {
  const minimalHtml = '<html><head><style>body{}</style></head><body><div>content</div></body></html>';

  it('should inject watermark div before closing body tag', () => {
    const result = injectSampleWatermark(minimalHtml);
    expect(result).toContain(`class="${WATERMARK_CSS_CLASS}"`);
    expect(result).toContain('SAMPLE');
  });

  it('should inject watermark CSS before closing style tag', () => {
    const result = injectSampleWatermark(minimalHtml);
    expect(result).toContain(`.${WATERMARK_CSS_CLASS}`);
    expect(result).toContain('transform: rotate(-45deg)');
  });

  it('should use fixed positioning for the watermark', () => {
    const result = injectSampleWatermark(minimalHtml);
    expect(result).toContain('position: fixed');
  });

  it('should set low opacity for semi-transparency', () => {
    const result = injectSampleWatermark(minimalHtml);
    expect(result).toMatch(/opacity:\s*0\.\d/);
  });

  it('should place watermark div before </body>', () => {
    const result = injectSampleWatermark(minimalHtml);
    const watermarkIndex = result.indexOf(WATERMARK_CSS_CLASS);
    const bodyCloseIndex = result.indexOf('</body>');
    expect(watermarkIndex).toBeLessThan(bodyCloseIndex);
  });

  it('should not modify the original content', () => {
    const result = injectSampleWatermark(minimalHtml);
    expect(result).toContain('<div>content</div>');
  });

  it('should handle HTML without style tag gracefully', () => {
    const noStyleHtml = '<html><head></head><body><div>content</div></body></html>';
    const result = injectSampleWatermark(noStyleHtml);
    // Should still inject the watermark div
    expect(result).toContain('SAMPLE');
    // CSS should be injected as inline style block
    expect(result).toContain(`<style>`);
  });

  it('should use pointer-events none so watermark does not block interaction', () => {
    const result = injectSampleWatermark(minimalHtml);
    expect(result).toContain('pointer-events: none');
  });

  it('should use z-index to ensure watermark is on top', () => {
    const result = injectSampleWatermark(minimalHtml);
    expect(result).toContain('z-index: 9999');
  });
});
