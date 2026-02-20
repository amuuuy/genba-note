/**
 * Formal Standard Template (FORMAL_STANDARD) - "正統派ビジネス文書"
 *
 * The original estimate template adapted for both estimate and invoice documents.
 * Based on the formal PDF template from pdfTemplateService.ts.
 *
 * Design characteristics:
 * - Gothic (sans-serif) font family
 * - 2-column header layout (client left, issuer+seal right)
 * - Seal positioned BESIDE issuer info (flexbox row)
 * - Black table header background
 * - Dotted border separators in totals section
 * - Centered title with full-width space characters
 *
 * Supports both estimate and invoice document types via getDocumentLabels().
 */

import type { DocumentWithTotals, SensitiveIssuerSnapshot } from '@/types/document';
import type { TemplateOptions } from './templateRegistry';
import { getSealSizePx, DEFAULT_SEAL_SIZE } from '@/pdf/types';
import { getBackgroundCss, getBackgroundHtml } from '@/pdf/backgroundDesigns';
import { getFormalThemeCss } from '@/pdf/themes';
import { FORMAL_COLORS } from '@/pdf/types';
import { getDocumentLabels } from './documentLabels';
import {
  formatCurrency,
  formatDate,
  formatQuantity,
  escapeHtml,
  isValidImageDataUri,
} from '@/pdf/templateUtils';

// === Local Helpers ===

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

// === CSS ===

function getFormalStandardCss(sealSizePx: number): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Hiragino Kaku Gothic Pro', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #000;
      padding: 30px 40px;
      background: #fff;
    }

    .document-container {
      max-width: 800px;
      margin: 0 auto;
    }

    /* === Title === */
    .formal-title {
      font-size: 26px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 0.3em;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 25px;
    }

    /* === Two-column header === */
    .formal-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .header-left {
      flex: 1;
    }

    .header-right {
      text-align: right;
      font-size: 12px;
    }

    /* === Meta info === */
    .header-meta {
      margin-bottom: 15px;
    }

    .meta-row {
      margin-bottom: 4px;
    }

    .meta-label {
      font-weight: bold;
    }

    /* === Client section === */
    .formal-client-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .formal-client-name::after {
      content: ' 御中';
      font-weight: normal;
    }

    .client-address {
      font-size: 12px;
      color: #333;
    }

    /* === Greeting === */
    .greeting-text {
      font-size: 12px;
      margin-top: 15px;
    }

    /* === Issuer block: info BESIDE seal (flexbox row) === */
    .header-issuer-block {
      display: flex;
      justify-content: flex-end;
      align-items: flex-start;
      gap: 10px;
    }

    .issuer-info {
      text-align: right;
    }

    .issuer-company {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .issuer-address {
      font-size: 11px;
      margin-bottom: 2px;
    }

    .issuer-tel-fax {
      font-size: 11px;
      margin-bottom: 2px;
    }

    .issuer-invoice-number {
      font-size: 11px;
      margin-bottom: 2px;
      color: #333;
    }

    .issuer-contact {
      font-size: 11px;
      margin-bottom: 2px;
    }

    /* === Seal container (beside issuer info) === */
    .issuer-seal {
      flex-shrink: 0;
      width: ${sealSizePx}px;
      height: ${sealSizePx}px;
    }

    .seal-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      opacity: 0.85;
      mix-blend-mode: multiply;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* === Info box === */
    .info-box {
      border: 1px solid #000;
      padding: 10px 15px;
      margin-bottom: 20px;
    }

    .info-box-row {
      margin-bottom: 6px;
    }

    .info-box-row:last-child {
      margin-bottom: 0;
    }

    .info-box-label {
      font-weight: bold;
      font-size: 11px;
      margin-right: 8px;
    }

    .info-box-value {
      font-size: 12px;
    }

    .bank-info-line {
      font-size: 11px;
      margin-left: 4px;
    }

    /* === Total amount box === */
    .total-amount-box {
      border: 2px solid #000;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      margin-bottom: 20px;
    }

    .total-amount-box .label {
      font-size: 14px;
      font-weight: bold;
    }

    .total-amount-box .amount {
      font-size: 22px;
      font-weight: bold;
    }

    /* === Line items table === */
    .formal-items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .formal-items-table th {
      background: #000;
      color: #fff;
      padding: 10px;
      text-align: left;
      font-weight: bold;
      font-size: 11px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .formal-items-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #ccc;
      font-size: 11px;
    }

    .formal-items-table tr:nth-child(even) {
      background: #f5f5f5;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .formal-items-table .col-name { width: 45%; }
    .formal-items-table .col-qty { width: 10%; text-align: right; }
    .formal-items-table .col-unit { width: 10%; text-align: center; }
    .formal-items-table .col-price { width: 15%; text-align: right; }
    .formal-items-table .col-total { width: 20%; text-align: right; }

    .formal-items-table .item-qty,
    .formal-items-table .item-price,
    .formal-items-table .item-total { text-align: right; }
    .formal-items-table .item-unit { text-align: center; }

    /* === Totals section (right-aligned, dotted borders) === */
    .formal-totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
    }

    .formal-totals-table {
      border-collapse: collapse;
      min-width: 250px;
    }

    .formal-totals-table td {
      padding: 6px 12px;
      font-size: 12px;
    }

    .formal-totals-table .totals-label {
      text-align: left;
      border-right: 1px solid #ccc;
    }

    .formal-totals-table .totals-value {
      text-align: right;
    }

    .formal-totals-table tr {
      border-bottom: 1px dotted #999;
    }

    .formal-totals-table .carried-forward-row td {
      color: #666;
    }

    .formal-totals-table .tax-breakdown-row td {
      font-size: 10px;
      color: #666;
      padding: 3px 12px;
    }

    .formal-totals-table .tax-rate-label {
      padding-left: 20px;
    }

    /* Total final row - most emphasized */
    .formal-totals-table .total-final-row {
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      background: #f5f5f5;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .formal-totals-table .total-final-row td {
      font-weight: bold;
      padding-top: 10px;
      padding-bottom: 10px;
    }

    .formal-totals-table .total-final-label {
      font-size: 13px;
    }

    .formal-totals-table .total-final-value {
      font-size: 16px;
      color: #000;
    }

    /* === Notes section === */
    .formal-notes-section {
      margin: 25px 0;
      border: 1px solid #999;
    }

    .notes-title {
      background: #f0f0f0;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: bold;
      border-bottom: 1px solid #999;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .notes-content {
      padding: 10px;
      font-size: 11px;
      white-space: pre-wrap;
    }

    /* === Print === */
    @media print {
      body { padding: 20px; }
      .document-container { max-width: none; }
    }
  `;
}

// === Section Renderers ===

/**
 * Render the document title with full-width spaces
 */
function renderTitle(doc: DocumentWithTotals): string {
  const title = doc.type === 'estimate' ? '\u898B\u3000\u7A4D\u3000\u66F8' : '\u8ACB\u3000\u6C42\u3000\u66F8';
  return `<div class="formal-title">${title}</div>`;
}

/**
 * Render issuer block with seal BESIDE info (flexbox)
 */
function renderIssuerBlock(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  sealSizePx: number
): string {
  const { issuerSnapshot } = doc;
  const labels = getDocumentLabels(doc.type);
  const hasSeal = isValidImageDataUri(issuerSnapshot.sealImageBase64);

  const infoLines: string[] = [];

  if (issuerSnapshot.companyName) {
    infoLines.push(`<div class="issuer-company">${escapeHtml(issuerSnapshot.companyName)}</div>`);
  }
  if (issuerSnapshot.address) {
    infoLines.push(`<div class="issuer-address">${escapeHtml(issuerSnapshot.address)}</div>`);
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
    infoLines.push(`<div class="issuer-tel-fax">${telFaxParts.join(' / ')}</div>`);
  }

  // Registration number (only for invoice)
  if (labels.showRegistrationNumber && sensitiveSnapshot?.invoiceNumber) {
    infoLines.push(`<div class="issuer-invoice-number">${escapeHtml('\u767B\u9332\u756A\u53F7')}: ${escapeHtml(sensitiveSnapshot.invoiceNumber)}</div>`);
  }

  if (issuerSnapshot.contactPerson) {
    infoLines.push(`<div class="issuer-contact">${escapeHtml('\u62C5\u5F53')}: ${escapeHtml(issuerSnapshot.contactPerson)}</div>`);
  }

  if (infoLines.length === 0 && !hasSeal) {
    return '';
  }

  const sealHtml = hasSeal
    ? `<div class="issuer-seal"><img src="${issuerSnapshot.sealImageBase64}" alt="\u5370\u5F71" class="seal-image" /></div>`
    : '';

  return `
      <div class="header-issuer-block">
        <div class="issuer-info">
          ${infoLines.join('\n          ')}
        </div>
        ${sealHtml}
      </div>
  `;
}

/**
 * Render info box (subject, period, bank info for invoice)
 */
function renderInfoBox(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  const labels = getDocumentLabels(doc.type);
  const rows: string[] = [];

  // Subject
  if (doc.subject) {
    rows.push(`
      <div class="info-box-row">
        <span class="info-box-label">\u4EF6\u540D:</span>
        <span class="info-box-value">${escapeHtml(doc.subject)}</span>
      </div>
    `);
  }

  // Period (validUntil for estimate, dueDate for invoice)
  const periodValue = doc[labels.periodField];
  if (periodValue) {
    rows.push(`
      <div class="info-box-row">
        <span class="info-box-label">${escapeHtml(labels.periodLabel)}:</span>
        <span class="info-box-value">${formatDate(periodValue)}</span>
      </div>
    `);
  }

  // Bank info (invoice only)
  if (labels.showBankInfo && hasBankInfo(sensitiveSnapshot)) {
    const bankLines: string[] = [];
    if (sensitiveSnapshot!.bankName) {
      bankLines.push(escapeHtml(sensitiveSnapshot!.bankName));
    }
    if (sensitiveSnapshot!.branchName) {
      bankLines.push(`${escapeHtml(sensitiveSnapshot!.branchName)}\u652F\u5E97`);
    }
    if (sensitiveSnapshot!.accountType) {
      bankLines.push(escapeHtml(sensitiveSnapshot!.accountType));
    }
    if (sensitiveSnapshot!.accountNumber) {
      bankLines.push(`\u53E3\u5EA7\u756A\u53F7: ${escapeHtml(sensitiveSnapshot!.accountNumber)}`);
    }
    if (sensitiveSnapshot!.accountHolderName) {
      bankLines.push(`\u53E3\u5EA7\u540D\u7FA9: ${escapeHtml(sensitiveSnapshot!.accountHolderName)}`);
    }

    rows.push(`
      <div class="info-box-row">
        <span class="info-box-label">\u304A\u632F\u8FBC\u5148:</span>
        <span class="info-box-value">${bankLines.join(' / ')}</span>
      </div>
    `);
  }

  if (rows.length === 0) {
    return '';
  }

  return `
    <div class="info-box">
      ${rows.join('')}
    </div>
  `;
}

/**
 * Render line items table (black header, alternating rows)
 */
function renderLineItemsTable(doc: DocumentWithTotals): string {
  const rows = doc.lineItemsCalculated.map((item) => {
    return `
        <tr>
          <td class="item-name">${escapeHtml(item.name)}</td>
          <td class="item-qty">${formatQuantity(item.quantityMilli)}</td>
          <td class="item-unit">${escapeHtml(item.unit)}</td>
          <td class="item-price">${formatCurrency(item.unitPrice)}\u5186</td>
          <td class="item-total">${formatCurrency(item.subtotal)}\u5186</td>
        </tr>`;
  });

  return `
    <table class="formal-items-table">
      <thead>
        <tr>
          <th class="col-name">\u6458\u8981</th>
          <th class="col-qty">\u6570\u91CF</th>
          <th class="col-unit">\u5358\u4F4D</th>
          <th class="col-price">\u5358\u4FA1\uFF08\u7A0E\u629C\uFF09</th>
          <th class="col-total">\u91D1\u984D\uFF08\u7A0E\u629C\uFF09</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('\n')}
      </tbody>
    </table>
  `;
}

/**
 * Render totals section (right-aligned, dotted borders)
 */
function renderTotalsSection(doc: DocumentWithTotals): string {
  const carriedForward = doc.carriedForwardAmount ?? 0;
  const hasCarriedForward = carriedForward > 0;

  const carriedForwardRow = hasCarriedForward
    ? `
        <tr class="carried-forward-row">
          <td class="totals-label">\u7E70\u8D8A\u91D1\u984D</td>
          <td class="totals-value">${formatCurrency(carriedForward)}\u5186</td>
        </tr>`
    : '';

  // Tax breakdown rows with indent
  const taxBreakdownRows = doc.taxBreakdown
    .filter((tb) => tb.tax > 0)
    .map((tb) => {
      const rateLabel = tb.rate === 0 ? '\u975E\u8AB2\u7A0E' : `${tb.rate}%`;
      return `
        <tr class="tax-breakdown-row">
          <td class="totals-label tax-rate-label">\u3000\u6D88\u8CBB\u7A0E(${rateLabel})</td>
          <td class="totals-value">${formatCurrency(tb.tax)}\u5186</td>
        </tr>`;
    })
    .join('');

  return `
    <div class="formal-totals-section">
      <table class="formal-totals-table">
        <tr>
          <td class="totals-label">\u5C0F\u8A08\uFF08\u7A0E\u629C\uFF09</td>
          <td class="totals-value">${formatCurrency(doc.subtotalYen)}\u5186</td>
        </tr>
        <tr class="tax-total-row">
          <td class="totals-label">\u6D88\u8CBB\u7A0E</td>
          <td class="totals-value">${formatCurrency(doc.taxYen)}\u5186</td>
        </tr>
        ${taxBreakdownRows}${carriedForwardRow}
        <tr class="total-final-row">
          <td class="totals-label total-final-label">\u5408\u8A08\uFF08\u7A0E\u8FBC\uFF09</td>
          <td class="totals-value total-final-value">${formatCurrency(doc.totalYen)}\u5186</td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Render notes section
 */
function renderNotesSection(doc: DocumentWithTotals): string {
  return `
    <div class="formal-notes-section">
      <div class="notes-title">\u5099\u8003</div>
      <div class="notes-content">${doc.notes ? escapeHtml(doc.notes) : ''}</div>
    </div>
  `;
}

// === Main Template Generator ===

/**
 * Generate FORMAL_STANDARD template HTML
 *
 * Creates a formal business document ("正統派ビジネス文書") with Gothic typeface,
 * 2-column header, seal beside issuer info, black table headers, and dotted totals borders.
 *
 * @param doc - Document with calculated totals
 * @param sensitiveSnapshot - Sensitive issuer information (bank account, etc.)
 * @param options - Template options (seal size, background design)
 * @returns Complete HTML string for the document
 */
export function generateFormalStandardTemplate(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  options: TemplateOptions
): string {
  const labels = getDocumentLabels(doc.type);
  const sealSizePx = getSealSizePx(options.sealSize ?? DEFAULT_SEAL_SIZE, 'FORMAL_STANDARD');
  const backgroundCss = getBackgroundCss(options.backgroundDesign, options.backgroundImageDataUrl);
  const backgroundHtml = getBackgroundHtml(options.backgroundDesign, options.backgroundImageDataUrl);
  const themeCss = getFormalThemeCss(FORMAL_COLORS);
  const css = getFormalStandardCss(sealSizePx);

  // Title
  const titleHtml = renderTitle(doc);

  // Client address
  const clientAddressHtml = doc.clientAddress
    ? `<div class="client-address">${escapeHtml(doc.clientAddress)}</div>`
    : '';

  // Greeting text
  const greetingText = doc.type === 'estimate'
    ? '\u4E0B\u8A18\u306E\u3068\u304A\u308A\u304A\u898B\u7A4D\u308A\u7533\u3057\u4E0A\u3052\u307E\u3059\u3002'
    : labels.greeting;

  // Meta info
  const metaHtml = `
        <div class="header-meta">
          <div class="meta-row"><span class="meta-label">${escapeHtml(labels.dateLabel)}:</span> ${formatDate(doc.issueDate)}</div>
          <div class="meta-row"><span class="meta-label">${escapeHtml(labels.numberLabel)}:</span> ${escapeHtml(doc.documentNo)}</div>
        </div>
  `;

  // Issuer block (with seal beside info)
  const issuerHtml = renderIssuerBlock(doc, sensitiveSnapshot, sealSizePx);

  // Info box (subject, period, bank info)
  const infoBoxHtml = renderInfoBox(doc, sensitiveSnapshot);

  // Total amount box
  const totalBoxHtml = `
    <div class="total-amount-box">
      <span class="label">\u5408\u8A08\uFF08\u7A0E\u8FBC\uFF09</span>
      <span class="amount">${formatCurrency(doc.totalYen)}\u5186</span>
    </div>
  `;

  // Line items table
  const tableHtml = renderLineItemsTable(doc);

  // Totals section
  const totalsHtml = renderTotalsSection(doc);

  // Notes section
  const notesHtml = renderNotesSection(doc);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${css}
    ${themeCss}
    ${backgroundCss}
  </style>
</head>
<body>
  <div class="document-container">
    ${backgroundHtml}
    <!-- Title -->
    ${titleHtml}

    <!-- Two-column header -->
    <div class="formal-header">
      <div class="header-left">
        <div class="formal-client-name">${escapeHtml(doc.clientName)}</div>
        ${clientAddressHtml}
        <div class="greeting-text">${escapeHtml(greetingText)}</div>
      </div>
      <div class="header-right">
        ${metaHtml}
        ${issuerHtml}
      </div>
    </div>

    <!-- Info box (subject, period, bank info) -->
    ${infoBoxHtml}

    <!-- Total amount -->
    ${totalBoxHtml}

    <!-- Line items -->
    ${tableHtml}

    <!-- Totals -->
    ${totalsHtml}

    <!-- Notes -->
    ${notesHtml}
  </div>
</body>
</html>`;
}
