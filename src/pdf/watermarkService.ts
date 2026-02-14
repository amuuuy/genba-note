/**
 * Watermark Service
 *
 * Injects a "SAMPLE" watermark overlay into HTML for free-tier PDF output.
 * Uses real HTML elements (not CSS pseudo-elements) because expo-print
 * does not support ::before / ::after pseudo-elements.
 */

/** CSS class name for the watermark overlay */
export const WATERMARK_CSS_CLASS = 'sample-watermark';

/** CSS rules for the watermark overlay */
const WATERMARK_CSS = `
    .${WATERMARK_CSS_CLASS} {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 9999;
    }
    .${WATERMARK_CSS_CLASS} span {
      font-size: 120px;
      font-weight: bold;
      color: #FF0000;
      opacity: 0.15;
      transform: rotate(-45deg);
      letter-spacing: 20px;
      user-select: none;
    }`;

/** HTML element for the watermark overlay */
const WATERMARK_HTML = `<div class="${WATERMARK_CSS_CLASS}"><span>SAMPLE</span></div>`;

/**
 * Inject a SAMPLE watermark into an HTML string.
 *
 * Inserts:
 * 1. CSS rules before </style> (or in a new <style> block before </head>)
 * 2. Watermark div before </body>
 *
 * @param html - The original HTML string
 * @returns HTML string with watermark injected
 */
export function injectSampleWatermark(html: string): string {
  let result = html;

  // 1. Inject CSS
  const styleCloseIndex = result.lastIndexOf('</style>');
  if (styleCloseIndex !== -1) {
    result =
      result.slice(0, styleCloseIndex) +
      WATERMARK_CSS + '\n  ' +
      result.slice(styleCloseIndex);
  } else {
    // No existing <style> tag - create one before </head>
    const headCloseIndex = result.indexOf('</head>');
    if (headCloseIndex !== -1) {
      result =
        result.slice(0, headCloseIndex) +
        `<style>${WATERMARK_CSS}</style>\n` +
        result.slice(headCloseIndex);
    }
  }

  // 2. Inject watermark div before </body>
  const bodyCloseIndex = result.indexOf('</body>');
  if (bodyCloseIndex !== -1) {
    result =
      result.slice(0, bodyCloseIndex) +
      WATERMARK_HTML + '\n' +
      result.slice(bodyCloseIndex);
  }

  return result;
}
