/**
 * @jest-environment jsdom
 */
/**
 * Single-Page Enforce Script DOM Execution Tests
 *
 * Uses jsdom environment to execute the injected scaling script against
 * a real DOM and verify that transform: scale() is correctly computed.
 *
 * Tests the 4 key scenarios:
 * 1. Height overflow → scales down
 * 2. Width overflow → scales down
 * 3. Content fits → no scaling
 * 4. Landscape dimensions → correct page size used
 */

import { injectSinglePageEnforcement } from '@/pdf/singlePageService';

const minimalHtml =
  '<html><head><style>body{}</style></head><body><div class="document-container">content</div></body></html>';

/**
 * Extract the enforce() function from injected HTML and execute it
 * directly in the jsdom environment (bypassing async waitAndEnforce).
 */
function runEnforceScript(isLandscape: boolean): void {
  const { html } = injectSinglePageEnforcement(minimalHtml, isLandscape);
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) throw new Error('No script found in injected HTML');

  const fullScript = scriptMatch[1];

  // Extract only the enforce() function definition (before waitAndEnforce)
  const enforceFnStart = fullScript.indexOf('function enforce()');
  const waitFnStart = fullScript.indexOf('function waitAndEnforce()');
  if (enforceFnStart === -1 || waitFnStart === -1) {
    throw new Error('Could not extract enforce function');
  }
  const enforceFn = fullScript.substring(enforceFnStart, waitFnStart);

  // Wrap and execute: define enforce, then call it immediately
  const wrappedScript = `(function() {\n${enforceFn}\nenforce();\n})();`;
  eval(wrappedScript);
}

/**
 * Set up DOM with a .document-container and mock its getBoundingClientRect.
 * Returns the container element for assertion.
 */
function setupDOM(
  containerWidth: number,
  containerHeight: number,
  bodyPadding = 0
): HTMLElement {
  document.body.innerHTML =
    '<div class="document-container">content</div>';
  const container = document.querySelector(
    '.document-container'
  ) as HTMLElement;

  container.getBoundingClientRect = jest.fn(
    () =>
      ({
        width: containerWidth,
        height: containerHeight,
        top: 0,
        left: 0,
        right: containerWidth,
        bottom: containerHeight,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
  );

  // Mock body padding via getComputedStyle
  if (bodyPadding > 0) {
    const original = window.getComputedStyle;
    jest.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
      const style = original(el);
      if (el === document.body) {
        return {
          ...style,
          paddingTop: `${bodyPadding}px`,
          paddingBottom: `${bodyPadding}px`,
          paddingLeft: `${bodyPadding}px`,
          paddingRight: `${bodyPadding}px`,
        } as CSSStyleDeclaration;
      }
      return style;
    });
  }

  return container;
}

describe('single-page enforce script DOM execution', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('scales down when content height exceeds portrait page height', () => {
    // Portrait: pageHeight=842, pageWidth=595
    // Content: 500x1200 → height overflow
    const container = setupDOM(500, 1200);
    runEnforceScript(false);

    // Expected scale: min(842/1200, 1) = 842/1200 ≈ 0.7017
    const expectedScale = 842 / 1200;
    expect(container.style.transform).toBe(`scale(${expectedScale})`);
    expect(container.style.transformOrigin).toBe('top left');
  });

  it('scales down when content width exceeds portrait page width', () => {
    // Portrait: pageWidth=595
    // Content: 800x500 → width overflow only
    const container = setupDOM(800, 500);
    runEnforceScript(false);

    // Expected scale: min(1, 595/800) = 595/800 = 0.74375
    const expectedScale = 595 / 800;
    expect(container.style.transform).toBe(`scale(${expectedScale})`);
  });

  it('applies smallest scale when both dimensions overflow', () => {
    // Portrait: pageHeight=842, pageWidth=595
    // Content: 800x1200 → both overflow
    const container = setupDOM(800, 1200);
    runEnforceScript(false);

    // scaleH = 842/1200 ≈ 0.7017, scaleW = 595/800 = 0.74375
    // scale = min(0.7017, 0.74375) = 0.7017
    const expectedScale = Math.min(842 / 1200, 595 / 800);
    expect(container.style.transform).toBe(`scale(${expectedScale})`);
  });

  it('does not scale when content fits within portrait page', () => {
    // Portrait: pageHeight=842, pageWidth=595
    // Content: 500x700 → fits
    const container = setupDOM(500, 700);
    runEnforceScript(false);

    // No transform applied
    expect(container.style.transform).toBe('');
  });

  it('uses landscape dimensions (842x595) when isLandscape=true', () => {
    // Landscape: pageHeight=595, pageWidth=842
    // Content: 500x800 → height overflow (800 > 595)
    const container = setupDOM(500, 800);
    runEnforceScript(true);

    // Expected scale: 595/800 = 0.74375
    const expectedScale = 595 / 800;
    expect(container.style.transform).toBe(`scale(${expectedScale})`);
  });

  it('accounts for body padding when calculating available space', () => {
    // Portrait: pageHeight=842, pageWidth=595, bodyPadding=30px each side
    // Available: height = 842 - 30 - 30 = 782, width = 595 - 30 - 30 = 535
    // Content: 500x800 → height overflow (800 > 782)
    const container = setupDOM(500, 800, 30);
    runEnforceScript(false);

    // Expected scale: (842 - 60) / 800 = 782/800 = 0.9775
    const expectedScale = 782 / 800;
    expect(container.style.transform).toBe(`scale(${expectedScale})`);
  });

  it('content exactly at boundary → no scaling', () => {
    // Portrait: pageHeight=842, pageWidth=595
    // Content: exactly 595x842 → fits exactly
    const container = setupDOM(595, 842);
    runEnforceScript(false);

    // No transform applied (contentHeight <= availHeight && contentWidth <= availWidth)
    expect(container.style.transform).toBe('');
  });
});
