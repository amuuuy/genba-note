/**
 * Modern Template
 *
 * Clean, modern PDF template with blue accent color and 1-column flow layout.
 * Uses left accent bar, card-style totals, and borderless table design.
 *
 * Design:
 * - Accent color: #2563EB (blue)
 * - 1-column sequential flow: title -> meta -> client -> issuer
 * - Left 4px accent bar on page
 * - Transparent table header with accent-color text
 * - Card-style totals section with light blue background
 * - No black labels; labels are accent color small text
 */

import type { DocumentWithTotals, SensitiveIssuerSnapshot } from '@/types/document';
import type { TemplateOptions } from './templateRegistry';
import { getSealSizePx, DEFAULT_SEAL_SIZE } from '@/pdf/types';
import { getBackgroundCss, getBackgroundHtml } from '@/pdf/backgroundDesigns';
import { getDocumentLabels } from './documentLabels';
import {
  formatCurrency,
  formatDate,
  formatQuantity,
  parseAddressWithPostalCode,
  escapeHtml,
  isValidImageDataUri,
} from '@/pdf/templateUtils';

// === Constants ===

const ACCENT = '#2563EB';
const TEXT_COLOR = '#1F2937';
const SUB_TEXT = '#6B7280';
const DIVIDER = '#E5E7EB';
const TOTALS_BG = '#EFF6FF';
const TOTALS_BORDER = '#BFDBFE';

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

// === Section Renderers ===

/**
 * Render meta info (date label, date value, number label, number value)
 */
function renderMeta(doc: DocumentWithTotals): string {
  const labels = getDocumentLabels(doc.type);

  const periodValue = doc[labels.periodField];
  const periodHtml = periodValue
    ? `<div class="meta-row"><span class="meta-label">${escapeHtml(labels.periodLabel)}</span><span class="meta-value">${formatDate(periodValue)}</span></div>`
    : '';

  return `
    <div class="meta-section">
      <div class="meta-row">
        <span class="meta-label">${escapeHtml(labels.numberLabel)}</span>
        <span class="meta-value">${escapeHtml(doc.documentNo)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">${escapeHtml(labels.dateLabel)}</span>
        <span class="meta-value">${formatDate(doc.issueDate)}</span>
      </div>
      ${periodHtml}
    </div>
  `;
}

/**
 * Render client section with name + "御中" + address
 */
function renderClient(doc: DocumentWithTotals): string {
  const labels = getDocumentLabels(doc.type);

  const addressParts: string[] = [];
  if (doc.clientAddress) {
    const parsed = parseAddressWithPostalCode(doc.clientAddress);
    if (parsed.postalCode) {
      addressParts.push(`<div class="client-postal">${escapeHtml(parsed.postalCode)}</div>`);
    }
    if (parsed.addressLine1) {
      addressParts.push(`<div class="client-address-line">${escapeHtml(parsed.addressLine1)}</div>`);
    }
    if (parsed.addressLine2) {
      addressParts.push(`<div class="client-address-line">${escapeHtml(parsed.addressLine2)}</div>`);
    }
  }

  const subjectHtml = doc.subject
    ? `<div class="client-subject"><span class="info-label-text">件名</span><span class="info-value-text">${escapeHtml(doc.subject)}</span></div>`
    : '';

  return `
    <div class="client-section">
      ${addressParts.join('\n      ')}
      <div class="client-name">${escapeHtml(doc.clientName)}<span class="client-suffix">御中</span></div>
      <div class="greeting-text">${escapeHtml(labels.greeting)}</div>
      ${subjectHtml}
    </div>
  `;
}

/**
 * Render issuer section (right-aligned, with seal)
 */
function renderIssuer(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  const { issuerSnapshot } = doc;
  const labels = getDocumentLabels(doc.type);
  const hasSeal = isValidImageDataUri(issuerSnapshot.sealImageBase64);

  const lines: string[] = [];

  if (issuerSnapshot.companyName) {
    lines.push(`<div class="issuer-company">${escapeHtml(issuerSnapshot.companyName)}</div>`);
  }
  if (issuerSnapshot.representativeName) {
    lines.push(`<div class="issuer-rep">${escapeHtml(issuerSnapshot.representativeName)}</div>`);
  }

  const parsedAddress = parseAddressWithPostalCode(issuerSnapshot.address);
  if (parsedAddress.postalCode) {
    lines.push(`<div class="issuer-detail">${escapeHtml(parsedAddress.postalCode)}</div>`);
  }
  if (parsedAddress.addressLine1) {
    lines.push(`<div class="issuer-detail">${escapeHtml(parsedAddress.addressLine1)}</div>`);
  }
  if (parsedAddress.addressLine2) {
    lines.push(`<div class="issuer-detail">${escapeHtml(parsedAddress.addressLine2)}</div>`);
  }

  const telFaxParts: string[] = [];
  if (issuerSnapshot.phone) {
    telFaxParts.push(`TEL: ${escapeHtml(issuerSnapshot.phone)}`);
  }
  if (issuerSnapshot.fax) {
    telFaxParts.push(`FAX: ${escapeHtml(issuerSnapshot.fax)}`);
  }
  if (telFaxParts.length > 0) {
    lines.push(`<div class="issuer-detail">${telFaxParts.join(' / ')}</div>`);
  }

  if (labels.showRegistrationNumber && sensitiveSnapshot?.invoiceNumber) {
    lines.push(`<div class="issuer-registration">登録番号: ${escapeHtml(sensitiveSnapshot.invoiceNumber)}</div>`);
  }

  if (issuerSnapshot.contactPerson) {
    lines.push(`<div class="issuer-detail">担当: ${escapeHtml(issuerSnapshot.contactPerson)}</div>`);
  }

  if (lines.length === 0 && !hasSeal) {
    return '';
  }

  const sealHtml = hasSeal
    ? `<div class="issuer-seal"><img src="${issuerSnapshot.sealImageBase64}" alt="印影" class="seal-image" /></div>`
    : '';

  return `
    <div class="issuer-section">
      <div class="issuer-block">
        <div class="issuer-info">
          ${lines.join('\n          ')}
        </div>
        ${sealHtml}
      </div>
    </div>
  `;
}

/**
 * Render line items table (modern style: transparent header, accent text, no vertical lines)
 */
function renderLineItemsTable(doc: DocumentWithTotals): string {
  const rows = doc.lineItemsCalculated.map((item) => {
    return `
        <tr>
          <td class="item-name">${escapeHtml(item.name)}</td>
          <td class="item-qty">${formatQuantity(item.quantityMilli)}</td>
          <td class="item-unit">${escapeHtml(item.unit)}</td>
          <td class="item-price">${formatCurrency(item.unitPrice)}円</td>
          <td class="item-total">${formatCurrency(item.subtotal)}円</td>
        </tr>`;
  });

  return `
    <table class="modern-items-table">
      <thead>
        <tr>
          <th class="col-name">摘要</th>
          <th class="col-qty">数量</th>
          <th class="col-unit">単位</th>
          <th class="col-price">単価（税抜）</th>
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
 * Render totals section (card style with light blue background)
 */
function renderTotalsCard(doc: DocumentWithTotals): string {
  const carriedForward = doc.carriedForwardAmount ?? 0;
  const hasCarriedForward = carriedForward > 0;

  const taxBreakdownRows = doc.taxBreakdown.map((tb) => {
    const rateLabel = tb.rate === 0 ? '非課税対象' : `${tb.rate}%対象`;
    const taxLabel = tb.rate === 0 ? '非課税' : `消費税(${tb.rate}%)`;
    return `
        <div class="totals-detail-row">
          <span class="totals-detail-label">${rateLabel}: ${formatCurrency(tb.subtotal)}円</span>
          <span class="totals-detail-value">${taxLabel}: ${formatCurrency(tb.tax)}円</span>
        </div>`;
  });

  const carriedForwardRow = hasCarriedForward
    ? `
        <div class="totals-row">
          <span class="totals-label">繰越金額</span>
          <span class="totals-value">${formatCurrency(carriedForward)}円</span>
        </div>`
    : '';

  return `
    <div class="totals-card">
      <div class="totals-row">
        <span class="totals-label">小計（税抜）</span>
        <span class="totals-value">${formatCurrency(doc.subtotalYen)}円</span>
      </div>
      <div class="totals-row">
        <span class="totals-label">消費税</span>
        <span class="totals-value">${formatCurrency(doc.taxYen)}円</span>
      </div>
      ${taxBreakdownRows.join('\n')}
      ${carriedForwardRow}
      <div class="totals-row totals-total">
        <span class="totals-label">合計（税込）</span>
        <span class="totals-amount">${formatCurrency(doc.totalYen)}円</span>
      </div>
    </div>
  `;
}

/**
 * Render bank info section (invoice only)
 */
function renderBankInfo(sensitiveSnapshot: SensitiveIssuerSnapshot | null): string {
  if (!hasBankInfo(sensitiveSnapshot)) return '';

  const lines: string[] = [];
  if (sensitiveSnapshot!.bankName) {
    let bankLine = escapeHtml(sensitiveSnapshot!.bankName);
    if (sensitiveSnapshot!.branchName) {
      bankLine += ` ${escapeHtml(sensitiveSnapshot!.branchName)}支店`;
    }
    lines.push(`<div class="bank-detail">${bankLine}</div>`);
  }
  if (sensitiveSnapshot!.accountType) {
    lines.push(`<div class="bank-detail">${escapeHtml(sensitiveSnapshot!.accountType)}</div>`);
  }
  if (sensitiveSnapshot!.accountNumber) {
    lines.push(`<div class="bank-detail">口座番号: ${escapeHtml(sensitiveSnapshot!.accountNumber)}</div>`);
  }
  if (sensitiveSnapshot!.accountHolderName) {
    lines.push(`<div class="bank-detail">口座名義: ${escapeHtml(sensitiveSnapshot!.accountHolderName)}</div>`);
  }

  return `
    <div class="bank-section">
      <div class="info-label-text">お振込先</div>
      ${lines.join('\n      ')}
    </div>
  `;
}

/**
 * Render notes section (borderless, top line only)
 */
function renderNotes(doc: DocumentWithTotals): string {
  if (!doc.notes) return '';

  return `
    <div class="notes-section">
      <div class="notes-title">備考</div>
      <div class="notes-content">${escapeHtml(doc.notes)}</div>
    </div>
  `;
}

// === CSS ===

function getModernCss(sealSizePx: number): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Hiragino Kaku Gothic Pro', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif;
      font-size: 13px;
      line-height: 1.7;
      color: ${TEXT_COLOR};
      background: #fff;
      padding: 30px 40px 30px 44px;
      border-left: 4px solid ${ACCENT};
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .document-container {
      max-width: 800px;
      margin: 0 auto;
    }

    /* === Title === */
    .modern-title {
      font-size: 24px;
      font-weight: bold;
      color: ${TEXT_COLOR};
      text-align: left;
      border-bottom: 3px solid ${ACCENT};
      padding-bottom: 8px;
      margin-bottom: 24px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* === Meta Section === */
    .meta-section {
      margin-bottom: 24px;
    }

    .meta-row {
      margin-bottom: 4px;
    }

    .meta-label {
      font-size: 12px;
      color: ${SUB_TEXT};
      margin-right: 12px;
    }

    .meta-value {
      font-size: 13px;
      color: ${TEXT_COLOR};
    }

    /* === Client Section === */
    .client-section {
      margin-bottom: 32px;
    }

    .client-postal {
      font-size: 12px;
      color: ${SUB_TEXT};
    }

    .client-address-line {
      font-size: 13px;
      color: ${TEXT_COLOR};
      margin-bottom: 2px;
    }

    .client-name {
      font-size: 18px;
      font-weight: bold;
      color: ${TEXT_COLOR};
      margin-bottom: 4px;
    }

    .client-suffix {
      font-weight: normal;
      margin-left: 8px;
    }

    .greeting-text {
      font-size: 13px;
      color: ${SUB_TEXT};
      margin-top: 8px;
    }

    .client-subject {
      margin-top: 8px;
    }

    /* === Info Labels (accent color small text, no black labels) === */
    .info-label-text {
      font-size: 11px;
      font-weight: bold;
      color: ${ACCENT};
      margin-right: 8px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .info-value-text {
      font-size: 13px;
      color: ${TEXT_COLOR};
    }

    /* === Issuer Section === */
    .issuer-section {
      margin-bottom: 32px;
      text-align: right;
    }

    .issuer-block {
      display: inline-flex;
      align-items: flex-start;
      gap: 12px;
    }

    .issuer-info {
      text-align: right;
    }

    .issuer-company {
      font-size: 15px;
      font-weight: bold;
      color: ${TEXT_COLOR};
      margin-bottom: 4px;
    }

    .issuer-rep {
      font-size: 13px;
      color: ${TEXT_COLOR};
      margin-bottom: 2px;
    }

    .issuer-detail {
      font-size: 12px;
      color: ${SUB_TEXT};
      margin-bottom: 2px;
    }

    .issuer-registration {
      font-size: 11px;
      color: ${SUB_TEXT};
      margin-bottom: 2px;
    }

    .issuer-seal {
      flex-shrink: 0;
    }

    .seal-image {
      width: ${sealSizePx}px;
      height: ${sealSizePx}px;
      object-fit: contain;
      opacity: 0.85;
      mix-blend-mode: multiply;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* === Line Items Table === */
    .modern-items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    .modern-items-table th {
      background: transparent;
      color: ${ACCENT};
      font-weight: bold;
      font-size: 12px;
      padding: 12px 16px;
      border-bottom: 3px solid ${ACCENT};
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .modern-items-table td {
      padding: 12px 16px;
      font-size: 13px;
      border-bottom: 1px solid ${DIVIDER};
      background: #fff;
    }

    .modern-items-table .col-name { width: 40%; text-align: left; }
    .modern-items-table .col-qty { width: 10%; text-align: right; }
    .modern-items-table .col-unit { width: 10%; text-align: center; }
    .modern-items-table .col-price { width: 18%; text-align: right; }
    .modern-items-table .col-total { width: 22%; text-align: right; }

    .modern-items-table .item-name { text-align: left; }
    .modern-items-table .item-qty { text-align: right; }
    .modern-items-table .item-unit { text-align: center; }
    .modern-items-table .item-price { text-align: right; }
    .modern-items-table .item-total { text-align: right; }

    /* === Totals Card === */
    .totals-card {
      background-color: ${TOTALS_BG};
      border: 1px solid ${TOTALS_BORDER};
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 32px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 4px 0;
    }

    .totals-label {
      font-size: 13px;
      color: ${TEXT_COLOR};
    }

    .totals-value {
      font-size: 13px;
      color: ${TEXT_COLOR};
      font-weight: bold;
    }

    .totals-detail-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
    }

    .totals-detail-label {
      font-size: 11px;
      color: ${SUB_TEXT};
    }

    .totals-detail-value {
      font-size: 11px;
      color: ${SUB_TEXT};
    }

    .totals-total {
      margin-top: 8px;
      padding-top: 12px;
      border-top: 2px solid ${ACCENT};
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .totals-amount {
      font-size: 24px;
      font-weight: bold;
      color: ${ACCENT};
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    /* === Bank Section === */
    .bank-section {
      margin-bottom: 32px;
    }

    .bank-detail {
      font-size: 13px;
      color: ${TEXT_COLOR};
      margin-bottom: 2px;
    }

    /* === Notes Section === */
    .notes-section {
      border-top: 1px solid ${DIVIDER};
      padding-top: 16px;
      margin-bottom: 24px;
    }

    .notes-title {
      font-size: 13px;
      font-weight: bold;
      color: ${SUB_TEXT};
      margin-bottom: 8px;
    }

    .notes-content {
      font-size: 13px;
      color: ${SUB_TEXT};
      white-space: pre-wrap;
      line-height: 1.7;
    }

    /* === Print === */
    @media print {
      body {
        padding: 30px 40px 30px 44px;
        border-left: 4px solid ${ACCENT};
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .document-container {
        max-width: none;
      }
    }
  `;
}

// === Main Template Generator ===

/**
 * Generate Modern template HTML
 *
 * 1-column flow layout with blue accent color.
 * Sequence: title -> meta -> client -> issuer -> table -> totals -> bank -> notes
 */
export function generateModernTemplate(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  options: TemplateOptions
): string {
  const labels = getDocumentLabels(doc.type);
  const sealSizePx = getSealSizePx(options.sealSize ?? DEFAULT_SEAL_SIZE, 'MODERN');
  const backgroundCss = getBackgroundCss(options.backgroundDesign, options.backgroundImageDataUrl);
  const backgroundHtml = getBackgroundHtml(options.backgroundDesign, options.backgroundImageDataUrl);
  const css = getModernCss(sealSizePx);

  // Sections
  const titleHtml = `<h1 class="modern-title">${escapeHtml(labels.title)}</h1>`;
  const metaHtml = renderMeta(doc);
  const clientHtml = renderClient(doc);
  const issuerHtml = renderIssuer(doc, sensitiveSnapshot);
  const tableHtml = renderLineItemsTable(doc);
  const totalsHtml = renderTotalsCard(doc);

  // Conditional sections
  const bankHtml = labels.showBankInfo ? renderBankInfo(sensitiveSnapshot) : '';
  const notesHtml = renderNotes(doc);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${css}
    ${backgroundCss}
  </style>
</head>
<body>
  <div class="document-container">
    ${backgroundHtml}
    ${titleHtml}
    ${metaHtml}
    ${clientHtml}
    ${issuerHtml}
    ${tableHtml}
    ${totalsHtml}
    ${bankHtml}
    ${notesHtml}
  </div>
</body>
</html>`;
}
