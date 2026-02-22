/**
 * PDF Template Service
 *
 * Pure functions for generating HTML templates for document preview and PDF generation.
 * Follows SPEC 2.7 for PDF content and formatting requirements.
 *
 * Two output modes:
 * - screen: Colorful preview (existing design)
 * - pdf: Formal monochrome layout for official documents
 */

import type { DocumentType, DocumentWithTotals, SensitiveIssuerSnapshot } from '@/types/document';
import type { PdfTemplateInput, PdfTemplateResult, ColorScheme, TemplateMode, PreviewOrientation, DocumentTemplateId } from './types';
import { ESTIMATE_COLORS, INVOICE_COLORS, DEFAULT_SEAL_SIZE } from './types';
import { getScreenThemeCss } from './themes';
import { getTemplate, resolveTemplateId } from './templates/templateRegistry';
import { injectSinglePageCssOnly } from './singlePageService';
import './templates/registerAllTemplates';

// Re-export formatting utilities from templateUtils for backwards compatibility
export {
  formatCurrency,
  formatQuantity,
  formatTaxRate,
  formatDate,
  parseAddressWithPostalCode,
  escapeHtml,
} from './templateUtils';
export type { ParsedAddress } from './templateUtils';

// Import for internal use
import {
  formatCurrency,
  formatQuantity,
  formatTaxRate,
  formatDate,
  escapeHtml,
} from './templateUtils';

// === Color Scheme ===

/**
 * Get color scheme for document type
 */
export function getColorScheme(type: DocumentType): ColorScheme {
  return type === 'estimate' ? ESTIMATE_COLORS : INVOICE_COLORS;
}

/**
 * Generate document title based on type and mode
 * @param type - Document type
 * @param mode - Output mode (screen uses 御, pdf uses spaced plain)
 * @returns Document title string
 */
export function generateDocumentTitle(type: DocumentType, mode: TemplateMode = 'screen'): string {
  if (mode === 'pdf') {
    // Estimate: Use full-width spaces for formal appearance
    // Invoice: No spaces for accounting-style layout
    return type === 'estimate' ? '見　積　書' : '請求書';
  }
  return type === 'estimate' ? '御見積書' : '御請求書';
}

/**
 * Generate filename title
 * @param documentNo - Document number (e.g., "EST-001")
 * @param type - Document type
 * @returns Filename title (e.g., "EST-001_見積書")
 */
export function generateFilenameTitle(documentNo: string, type: DocumentType): string {
  const suffix = type === 'estimate' ? '見積書' : '請求書';
  return `${documentNo}_${suffix}`;
}

// === Section Renderers ===

/**
 * Check if bank info has any non-null values
 */
function hasBankInfo(snapshot: SensitiveIssuerSnapshot | null): boolean {
  if (!snapshot) return false;
  return !!(
    snapshot.bankName ||
    snapshot.branchName ||
    snapshot.accountType ||
    snapshot.accountNumber ||
    snapshot.accountHolderName
  );
}

/**
 * Render bank information section (invoice only)
 */
function renderBankSection(
  snapshot: SensitiveIssuerSnapshot | null,
  isInvoice: boolean
): string {
  if (!isInvoice || !hasBankInfo(snapshot)) {
    return '';
  }

  const lines: string[] = [];

  if (snapshot!.bankName) {
    lines.push(`<div class="bank-name">${escapeHtml(snapshot!.bankName)}</div>`);
  }
  if (snapshot!.branchName) {
    lines.push(`<div class="bank-branch">${escapeHtml(snapshot!.branchName)}支店</div>`);
  }
  if (snapshot!.accountType) {
    lines.push(`<div class="bank-type">${escapeHtml(snapshot!.accountType)}</div>`);
  }
  if (snapshot!.accountNumber) {
    lines.push(`<div class="bank-number">口座番号: ${escapeHtml(snapshot!.accountNumber)}</div>`);
  }
  if (snapshot!.accountHolderName) {
    lines.push(`<div class="bank-holder">口座名義: ${escapeHtml(snapshot!.accountHolderName)}</div>`);
  }

  return `
    <div class="bank-section">
      <h3>お振込先</h3>
      ${lines.join('\n      ')}
    </div>
  `;
}

/**
 * Render issuer information section
 */
function renderIssuerSection(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  const { issuerSnapshot } = doc;
  const lines: string[] = [];

  if (issuerSnapshot.companyName) {
    lines.push(`<div class="issuer-company">${escapeHtml(issuerSnapshot.companyName)}</div>`);
  }
  if (issuerSnapshot.representativeName) {
    lines.push(`<div class="issuer-rep">${escapeHtml(issuerSnapshot.representativeName)}</div>`);
  }
  if (issuerSnapshot.address) {
    lines.push(`<div class="issuer-address">${escapeHtml(issuerSnapshot.address)}</div>`);
  }
  // TEL / FAX on the same line
  const telFaxParts: string[] = [];
  if (issuerSnapshot.phone) {
    telFaxParts.push(`TEL: ${escapeHtml(issuerSnapshot.phone)}`);
  }
  if (issuerSnapshot.fax) {
    telFaxParts.push(`FAX: ${escapeHtml(issuerSnapshot.fax)}`);
  }
  if (telFaxParts.length > 0) {
    lines.push(`<div class="issuer-tel-fax">${telFaxParts.join(' / ')}</div>`);
  }
  if (sensitiveSnapshot?.invoiceNumber) {
    lines.push(`<div class="issuer-invoice-number">登録番号: ${escapeHtml(sensitiveSnapshot.invoiceNumber)}</div>`);
  }
  if (issuerSnapshot.contactPerson) {
    lines.push(`<div class="issuer-contact">担当: ${escapeHtml(issuerSnapshot.contactPerson)}</div>`);
  }

  if (lines.length === 0) {
    return '';
  }

  return `
    <div class="issuer-section">
      ${lines.join('\n      ')}
    </div>
  `;
}

/**
 * Render line items table
 */
function renderLineItemsTable(doc: DocumentWithTotals, _colors: ColorScheme): string {
  const rows = doc.lineItemsCalculated.map((item) => {
    // 金額は税抜（subtotal = 数量 × 単価）
    return `
        <tr>
          <td class="item-name">${escapeHtml(item.name)}</td>
          <td class="item-qty">${formatQuantity(item.quantityMilli)}</td>
          <td class="item-unit">${escapeHtml(item.unit)}</td>
          <td class="item-price">${formatCurrency(item.unitPrice)}円</td>
          <td class="item-tax">${formatTaxRate(item.taxRate)}</td>
          <td class="item-total">${formatCurrency(item.subtotal)}円</td>
        </tr>`;
  });

  return `
    <table class="items-table">
      <thead>
        <tr>
          <th class="col-name">品名</th>
          <th class="col-qty">数量</th>
          <th class="col-unit">単位</th>
          <th class="col-price">単価（税抜）</th>
          <th class="col-tax">税率</th>
          <th class="col-total">金額（税抜）</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('\n')}
      </tbody>
    </table>
  `;
}

/**
 * Render totals section
 */
function renderTotalsSection(doc: DocumentWithTotals): string {
  const breakdownRows = doc.taxBreakdown.map((tb) => {
    const label = tb.rate === 0 ? '非課税対象' : `${tb.rate}%対象`;
    return `
        <div class="breakdown-row">
          <span class="breakdown-label">${label}: ${formatCurrency(tb.subtotal)}円</span>
          <span class="breakdown-tax">消費税(${tb.rate === 0 ? '非課税' : `${tb.rate}%`}): ${formatCurrency(tb.tax)}円</span>
        </div>`;
  });

  const carriedForward = doc.carriedForwardAmount ?? 0;
  const carriedForwardRow = carriedForward > 0
    ? `
      <div class="totals-row carried-forward">
        <span class="label">繰越金額</span>
        <span class="value">${formatCurrency(carriedForward)}円</span>
      </div>`
    : '';

  return `
    <div class="totals-section">
      <div class="totals-row">
        <span class="label">小計（税抜）</span>
        <span class="value">${formatCurrency(doc.subtotalYen)}円</span>
      </div>
      ${breakdownRows.join('\n')}${carriedForwardRow}
      <div class="totals-row total-final">
        <span class="label">合計（税込）</span>
        <span class="value">${formatCurrency(doc.totalYen)}円</span>
      </div>
    </div>
  `;
}
// === Screen Template (existing colorful design) ===

/**
 * Generate screen template HTML (colorful preview)
 */
function generateScreenTemplate(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  colors: ColorScheme
): string {
  const themeCss = getScreenThemeCss(colors);
  const title = generateDocumentTitle(doc.type, 'screen');
  const isInvoice = doc.type === 'invoice';

  const clientAddressHtml = doc.clientAddress
    ? `<div class="client-address">${escapeHtml(doc.clientAddress)}</div>`
    : '';

  const subjectHtml = doc.subject
    ? `<div class="subject-section"><span class="label">件名:</span> ${escapeHtml(doc.subject)}</div>`
    : '';

  const dueDateHtml =
    isInvoice && doc.dueDate
      ? `<div class="due-date-section"><span class="label">お支払期限:</span> ${formatDate(doc.dueDate)}</div>`
      : '';

  const notesHtml = doc.notes
    ? `<div class="notes-section"><h3>備考</h3><p>${escapeHtml(doc.notes)}</p></div>`
    : '';

  const bankHtml = renderBankSection(sensitiveSnapshot, isInvoice);
  const issuerHtml = renderIssuerSection(doc, sensitiveSnapshot);
  const lineItemsTableHtml = renderLineItemsTable(doc, colors);
  const totalsHtml = renderTotalsSection(doc);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --primary: ${colors.primary};
      --secondary: ${colors.secondary};
      --background: ${colors.background};
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Hiragino Kaku Gothic Pro', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      padding: 20px;
      background: #fff;
    }

    .document-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      background: var(--background);
      border-bottom: 4px solid var(--primary);
      padding: 20px;
      margin-bottom: 20px;
    }

    .document-title {
      font-size: 28px;
      font-weight: bold;
      color: var(--primary);
      text-align: center;
      margin-bottom: 10px;
    }

    .document-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
      color: #666;
    }

    .document-number { font-weight: bold; }

    .client-section {
      margin-bottom: 20px;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .client-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .client-address {
      color: #666;
      font-size: 13px;
    }

    .subject-section {
      margin-bottom: 15px;
      padding: 10px;
      background: #f9f9f9;
      border-radius: 4px;
    }

    .subject-section .label {
      font-weight: bold;
      color: #666;
    }

    .due-date-section {
      margin-bottom: 15px;
      padding: 10px;
      background: #fff9e6;
      border: 1px solid #ffd54f;
      border-radius: 4px;
    }

    .due-date-section .label {
      font-weight: bold;
      color: #f57c00;
    }

    .total-box {
      border: 3px solid var(--primary);
      background: var(--background);
      padding: 20px;
      margin-bottom: 25px;
      border-radius: 8px;
      text-align: center;
    }

    .total-box .label {
      font-size: 14px;
      color: #666;
      margin-bottom: 5px;
    }

    .total-box .amount {
      font-size: 32px;
      font-weight: bold;
      color: var(--primary);
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    .items-table th {
      background: var(--primary);
      color: #fff;
      padding: 10px 8px;
      text-align: left;
      font-weight: bold;
      font-size: 13px;
    }

    .items-table td {
      padding: 10px 8px;
      border-bottom: 1px solid #eee;
      font-size: 13px;
    }

    .items-table tr:nth-child(even) { background: #f9f9f9; }

    .col-name { width: 35%; }
    .col-qty { width: 10%; text-align: right; }
    .col-unit { width: 10%; text-align: center; }
    .col-price { width: 15%; text-align: right; }
    .col-tax { width: 10%; text-align: center; }
    .col-total { width: 20%; text-align: right; }

    .item-qty, .item-price, .item-total { text-align: right; }
    .item-unit, .item-tax { text-align: center; }

    .totals-section {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
      margin-bottom: 25px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }

    .totals-row:last-child { border-bottom: none; }
    .totals-row .label { font-weight: bold; }
    .totals-row .value { font-weight: bold; }

    .total-final {
      font-size: 18px;
      color: var(--primary);
      margin-top: 10px;
      padding-top: 10px;
      border-top: 2px solid var(--primary);
    }

    .breakdown-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 13px;
      color: #666;
    }

    .notes-section {
      margin-bottom: 25px;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 4px;
    }

    .notes-section h3 {
      font-size: 14px;
      margin-bottom: 10px;
      color: #666;
    }

    .notes-section p {
      white-space: pre-wrap;
      font-size: 13px;
    }

    .bank-section {
      margin-bottom: 25px;
      padding: 15px;
      border: 2px solid var(--secondary);
      border-radius: 4px;
      background: var(--background);
    }

    .bank-section h3 {
      font-size: 14px;
      font-weight: bold;
      color: var(--primary);
      margin-bottom: 10px;
    }

    .bank-section > div {
      margin-bottom: 3px;
      font-size: 13px;
    }

    .issuer-section {
      padding: 15px;
      border-top: 2px solid #ddd;
      margin-top: 20px;
      text-align: right;
    }

    .issuer-company {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .issuer-section > div {
      font-size: 13px;
      margin-bottom: 3px;
    }

    .issuer-invoice-number {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }

    .issuer-contact {
      font-size: 13px;
      margin-bottom: 3px;
    }

    .issuer-tel-fax {
      font-size: 13px;
      margin-bottom: 3px;
    }

    .totals-row.carried-forward {
      background: #f9f9f9;
      color: #666;
    }

    ${themeCss}

    @media print {
      body { padding: 0; }
      .document-container { max-width: none; }
    }
  </style>
</head>
<body>
  <div class="document-container">
    <div class="header">
      <div class="document-title">${title}</div>
      <div class="document-meta">
        <span class="document-number">No. ${escapeHtml(doc.documentNo)}</span>
        <span class="issue-date">発行日: ${formatDate(doc.issueDate)}</span>
      </div>
    </div>

    <div class="client-section">
      <div class="client-name">${escapeHtml(doc.clientName)} 様</div>
      ${clientAddressHtml}
    </div>

    ${subjectHtml}
    ${dueDateHtml}

    <div class="total-box">
      <div class="label">合計金額（税込）</div>
      <div class="amount">${formatCurrency(doc.totalYen)}円</div>
    </div>

    ${lineItemsTableHtml}
    ${totalsHtml}
    ${notesHtml}
    ${bankHtml}
    ${issuerHtml}
  </div>
</body>
</html>`;
}


// === Main Template Generator ===

/**
 * Generate HTML template for document preview/PDF
 *
 * @param input - Template input with document data and optional mode
 * @param input.mode - Output mode: 'screen' (colorful preview) or 'pdf' (formal print)
 * @param input.templateId - Template ID for PDF output (M21). Falls back to doc.type default.
 */
export function generateHtmlTemplate(input: PdfTemplateInput): PdfTemplateResult {
  const { document: doc, sensitiveSnapshot, mode = 'screen', templateId, invoiceTemplateType, sealSize, backgroundDesign, backgroundImageDataUrl } = input;

  let html: string;

  if (mode === 'pdf') {
    // M21: Use template registry for PDF generation
    // Resolve template ID: use explicit templateId, fall back to invoiceTemplateType for backward compat
    let resolvedId: DocumentTemplateId;
    if (templateId) {
      resolvedId = resolveTemplateId(doc.type, templateId);
    } else if (doc.type === 'invoice' && invoiceTemplateType) {
      // Backward compatibility: map old InvoiceTemplateType to DocumentTemplateId
      resolvedId = resolveTemplateId(doc.type, invoiceTemplateType);
    } else {
      resolvedId = resolveTemplateId(doc.type, undefined);
    }
    const generator = getTemplate(resolvedId);
    html = generator(doc, sensitiveSnapshot, {
      sealSize: sealSize ?? DEFAULT_SEAL_SIZE,
      backgroundDesign: backgroundDesign ?? 'NONE',
      backgroundImageDataUrl,
    });
  } else {
    // Use colorful screen template for preview
    const colors = getColorScheme(doc.type);
    html = generateScreenTemplate(doc, sensitiveSnapshot, colors);
  }

  return {
    html,
    title: generateFilenameTitle(doc.documentNo, doc.type),
  };
}

// === Orientation CSS Injection (M18) ===

/** Landscape CSS: @page for print + wider container for screen */
const LANDSCAPE_CSS = [
  '@page { size: A4 landscape; }',
  '.document-container { max-width: 1130px; min-width: 1130px; }',
].join('\n    ');

/** Viewport meta tag for landscape: forces WebView to render at 1130px width */
const LANDSCAPE_VIEWPORT_META = '<meta name="viewport" content="width=1130">';

/** Viewport meta tag for portrait: forces WebView to render at 800px width */
const PORTRAIT_VIEWPORT_META = '<meta name="viewport" content="width=800">';

/**
 * Inject landscape orientation rules into an existing HTML string.
 *
 * Two mechanisms ensure the landscape layout is visible:
 * 1. CSS: `@page { size: A4 landscape }` for print/PDF context,
 *    plus `.document-container { min-width: 1130px }` for wider layout.
 * 2. Viewport meta: `<meta name="viewport" content="width=1130">` forces
 *    the WebView to render at 1130px width, which auto-scales (zooms out)
 *    on narrow mobile screens so the wider layout is visually apparent.
 */
export function injectLandscapeCss(html: string): string {
  let result = html;

  // 1. Inject CSS before the last </style> tag (or new <style> before </head>)
  const styleCloseIndex = result.lastIndexOf('</style>');
  if (styleCloseIndex !== -1) {
    result =
      result.slice(0, styleCloseIndex) +
      '\n    ' + LANDSCAPE_CSS + '\n  ' +
      result.slice(styleCloseIndex);
  } else {
    const headCloseIndex = result.indexOf('</head>');
    if (headCloseIndex !== -1) {
      result =
        result.slice(0, headCloseIndex) +
        `<style>${LANDSCAPE_CSS}</style>\n` +
        result.slice(headCloseIndex);
    }
  }

  // 2. Inject viewport meta tag in <head> for WebView zoom-out
  //    Replace existing viewport meta if present, or insert before </head>
  const existingViewport = result.match(/<meta\s+name="viewport"[^>]*>/);
  if (existingViewport) {
    result = result.replace(existingViewport[0], LANDSCAPE_VIEWPORT_META);
  } else {
    const headClose = result.indexOf('</head>');
    if (headClose !== -1) {
      result =
        result.slice(0, headClose) +
        LANDSCAPE_VIEWPORT_META + '\n' +
        result.slice(headClose);
    }
  }

  return result;
}

/**
 * Inject portrait viewport into an existing HTML string.
 *
 * Replaces the template's default `width=device-width` viewport with
 * `width=800`, which forces the WebView to render at 800px and auto-scale
 * (zoom out) on narrow mobile screens. This makes the preview match the
 * actual PDF output layout.
 */
function injectPortraitViewport(html: string): string {
  const existingViewport = html.match(/<meta\s+name="viewport"[^>]*>/);
  if (existingViewport) {
    return html.replace(existingViewport[0], PORTRAIT_VIEWPORT_META);
  }
  const headClose = html.indexOf('</head>');
  if (headClose !== -1) {
    return html.slice(0, headClose) + PORTRAIT_VIEWPORT_META + '\n' + html.slice(headClose);
  }
  return html;
}

/**
 * Toggle orientation between PORTRAIT and LANDSCAPE.
 * Exported so that preview.tsx and tests share the same logic.
 */
export function toggleOrientation(current: PreviewOrientation): PreviewOrientation {
  return current === 'PORTRAIT' ? 'LANDSCAPE' : 'PORTRAIT';
}

/**
 * Derive the display HTML from orientation.
 * Injects a fixed viewport width so the WebView auto-scales to show the
 * full page layout: 800px for PORTRAIT, 1130px for LANDSCAPE.
 * Exported so that preview.tsx and tests share the same logic.
 */
export function deriveDisplayHtml(html: string, orientation: PreviewOrientation): string {
  if (!html) return '';
  let result = orientation === 'LANDSCAPE' ? injectLandscapeCss(html) : injectPortraitViewport(html);
  result = injectSinglePageCssOnly(result, orientation === 'LANDSCAPE');
  return result;
}
