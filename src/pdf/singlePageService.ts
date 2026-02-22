/**
 * Single-Page PDF Enforcement Service
 *
 * Injects CSS and JavaScript into HTML templates to ensure
 * PDF output fits exactly on one A4 page.
 *
 * Two variants:
 * - injectSinglePageEnforcement(): CSS + JS auto-scaler (for PDF generation via expo-print)
 * - injectSinglePageCssOnly(): CSS only (for preview WebView, where CSP blocks inline scripts)
 *
 * expo-print uses WKWebView (iOS) / WebView (Android) which executes
 * inline <script> tags before rendering to PDF.
 *
 * The JS auto-scaler waits for fonts and images to load, then measures
 * content dimensions via getBoundingClientRect() and applies a single-pass
 * transform: scale() to fit everything on one page.
 */

/** Result of single-page injection indicating what was successfully injected. */
export interface SinglePageInjectionResult {
  html: string;
  cssInjected: boolean;
  scriptInjected: boolean;
}

/**
 * CSS rules for single-page enforcement.
 *
 * - @page size prevents page breaks from creating multi-page output
 * - overflow: hidden on html/body prevents content from spilling
 * - page-break rules prevent browsers from inserting page breaks
 */
function getSinglePageCss(isLandscape: boolean): string {
  const pageSize = isLandscape ? 'A4 landscape' : 'A4 portrait';
  return `
    @page {
      size: ${pageSize};
      margin: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    * {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .document-container {
      page-break-after: avoid;
      break-after: avoid;
    }`;
}

/**
 * JavaScript auto-scaler that runs in the WebView before PDF capture.
 *
 * Single-pass algorithm using getBoundingClientRect() for accurate
 * post-render dimensions. No convergence loop needed since
 * transform: scale() does not reflow content.
 *
 * Waits for document.fonts.ready and all images to load before measuring.
 *
 * A4 dimensions in CSS points: portrait 595x842, landscape 842x595.
 */
function getSinglePageScript(isLandscape: boolean): string {
  const pageWidth = isLandscape ? 842 : 595;
  const pageHeight = isLandscape ? 595 : 842;

  return `
<script>
(function() {
  function enforce() {
    var container = document.querySelector('.document-container');
    var content = container || document.body;

    var bodyStyle = window.getComputedStyle(document.body);
    var padTop = parseFloat(bodyStyle.paddingTop) || 0;
    var padBottom = parseFloat(bodyStyle.paddingBottom) || 0;
    var padLeft = parseFloat(bodyStyle.paddingLeft) || 0;
    var padRight = parseFloat(bodyStyle.paddingRight) || 0;

    var pageHeight = ${pageHeight};
    var pageWidth = ${pageWidth};
    var availHeight = pageHeight - padTop - padBottom;
    var availWidth = pageWidth - padLeft - padRight;

    var rect = content.getBoundingClientRect();
    var contentHeight = rect.height;
    var contentWidth = rect.width;

    if (contentHeight <= availHeight && contentWidth <= availWidth) {
      return;
    }

    var scaleH = contentHeight > availHeight ? availHeight / contentHeight : 1;
    var scaleW = contentWidth > availWidth ? availWidth / contentWidth : 1;
    // Strict one-page policy: no minimum scale floor.
    // Content MUST fit on one page even if heavily scaled down.
    // Readability is managed by template layout constraints, not by
    // limiting the scale factor here.
    var scale = Math.min(scaleH, scaleW);

    content.style.transformOrigin = 'top left';
    content.style.transform = 'scale(' + scale + ')';
  }

  function waitAndEnforce() {
    var fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    var images = document.querySelectorAll('img');
    var imagePromises = [];
    for (var i = 0; i < images.length; i++) {
      if (!images[i].complete) {
        imagePromises.push(new Promise(function(resolve) {
          images[i].onload = resolve;
          images[i].onerror = resolve;
        }));
      }
    }

    Promise.all([fontsReady].concat(imagePromises)).then(function() {
      setTimeout(enforce, 50);
    });
  }

  if (document.readyState === 'complete') {
    waitAndEnforce();
  } else {
    window.addEventListener('load', waitAndEnforce);
  }
})();
</script>`;
}

/**
 * Inject CSS into an HTML string before the closing </style> tag.
 * If no <style> tag exists, creates one before </head>.
 * Returns whether injection succeeded.
 */
function injectCss(html: string, css: string): { html: string; success: boolean } {
  let result = html;
  const styleCloseIndex = result.lastIndexOf('</style>');
  if (styleCloseIndex !== -1) {
    result =
      result.slice(0, styleCloseIndex) +
      css + '\n  ' +
      result.slice(styleCloseIndex);
    return { html: result, success: true };
  }
  const headCloseIndex = result.indexOf('</head>');
  if (headCloseIndex !== -1) {
    result =
      result.slice(0, headCloseIndex) +
      `<style>${css}</style>\n` +
      result.slice(headCloseIndex);
    return { html: result, success: true };
  }
  return { html: result, success: false };
}

/**
 * Inject single-page enforcement CSS and JavaScript into an HTML string.
 *
 * Used for PDF generation (expo-print). The inline <script> measures
 * content via getBoundingClientRect() and applies transform: scale()
 * in a single pass to fit on one page.
 *
 * Returns injection result with success flags so the caller can
 * detect and handle injection failures.
 *
 * @param html - The original HTML string
 * @param isLandscape - Whether the document is landscape orientation (default: false)
 * @returns SinglePageInjectionResult with html and success flags
 */
export function injectSinglePageEnforcement(
  html: string,
  isLandscape: boolean = false
): SinglePageInjectionResult {
  // 1. Inject CSS
  const cssResult = injectCss(html, getSinglePageCss(isLandscape));
  let result = cssResult.html;

  // 2. Inject JavaScript auto-scaler before </body>
  const script = getSinglePageScript(isLandscape);
  const bodyCloseIndex = result.indexOf('</body>');
  let scriptInjected = false;
  if (bodyCloseIndex !== -1) {
    result =
      result.slice(0, bodyCloseIndex) +
      script + '\n' +
      result.slice(bodyCloseIndex);
    scriptInjected = true;
  }

  return {
    html: result,
    cssInjected: cssResult.success,
    scriptInjected,
  };
}

/**
 * Inject single-page enforcement CSS only (no JavaScript).
 *
 * Used for preview WebView where CSP blocks inline scripts.
 * The preview already uses FIT_TO_SCREEN_SCRIPT via injectedJavaScript
 * (which bypasses CSP) for auto-scaling.
 *
 * @param html - The original HTML string
 * @param isLandscape - Whether the document is landscape orientation (default: false)
 * @returns HTML string with single-page CSS injected
 */
export function injectSinglePageCssOnly(
  html: string,
  isLandscape: boolean = false
): string {
  return injectCss(html, getSinglePageCss(isLandscape)).html;
}
