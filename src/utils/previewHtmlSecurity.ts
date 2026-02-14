/**
 * Security utilities for preview HTML content.
 *
 * Injects Content-Security-Policy to block inline scripts/event handlers.
 * Used by both preview.tsx and tests to ensure parity.
 */

/** CSP meta tag that blocks all inline scripts, event handlers, and script-src. */
const CSP_META =
  '<meta http-equiv="Content-Security-Policy" content="script-src \'none\';">';

/** Scale document body to fit within the viewport height (no scrolling). */
export const FIT_TO_SCREEN_SCRIPT = `
(function() {
  var bodyH = document.body.scrollHeight;
  var viewH = window.innerHeight;
  if (bodyH > viewH) {
    var scale = viewH / bodyH;
    document.body.style.transformOrigin = 'top center';
    document.body.style.transform = 'scale(' + scale + ')';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100vh';
  }
})();
true;
`;

export interface CspInjectionResult {
  /** The HTML with CSP injected, or original HTML if injection failed. */
  html: string;
  /** Whether the CSP meta tag was successfully injected. */
  success: boolean;
}

/**
 * Inject a strict CSP meta tag into HTML to block inline scripts/event handlers.
 *
 * The `script-src 'none'` directive blocks:
 * - `<script>` tags
 * - Inline event handlers (onerror, onclick, etc.)
 * - `javascript:` URLs
 *
 * It does NOT block scripts injected via WebView's native `evaluateJavaScript` API,
 * so `injectedJavaScript` still works.
 *
 * Uses case-insensitive search for `</head>` to handle any casing.
 * Returns { html, success } so callers can disable JS when injection fails.
 */
export function injectCsp(html: string): CspInjectionResult {
  if (!html) return { html: '', success: false };
  const headCloseIdx = html.toLowerCase().indexOf('</head>');
  if (headCloseIdx !== -1) {
    return {
      html: html.slice(0, headCloseIdx) + CSP_META + '\n' + html.slice(headCloseIdx),
      success: true,
    };
  }
  return { html, success: false };
}
