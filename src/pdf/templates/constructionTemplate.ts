/**
 * Construction Template (CONSTRUCTION) - "建設業向け"
 *
 * A construction-industry-oriented template with:
 * - 4-column table (品番・品名, 単価, 数量, 金額) — no tax-rate/unit columns
 * - Empty ruled rows to fill a minimum of 8 visible rows
 * - 御見積金額 / 御請求金額 label with prominent amount box
 * - Issuer block with postal code, TEL/FAX, E-mail, contact person, seal
 * - Bank info section for invoices
 *
 * Supports both estimate and invoice document types via getDocumentLabels().
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
  escapeHtml,
  isValidImageDataUri,
  parseAddressWithPostalCode,
} from '@/pdf/templateUtils';

// Minimum number of visible table rows (data + empty)
const MIN_TABLE_ROWS = 8;

// === Local Helpers ===

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

function getConstructionCss(sealSizePx: number): string {
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

    /* === Date (right-aligned) === */
    .construction-date {
      text-align: right;
      font-size: 12px;
      margin-bottom: 8px;
    }

    /* === Title === */
    .construction-title {
      font-size: 26px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 0.5em;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 20px;
    }

    /* === Two-column header === */
    .construction-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      gap: 20px;
    }

    .header-left {
      flex: 1;
    }

    .header-right {
      flex-shrink: 0;
      min-width: 320px;
    }

    /* === Client section === */
    .construction-client-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .construction-client-name::after {
      content: '  御中';
      font-size: 14px;
      font-weight: normal;
    }

    .client-address {
      font-size: 12px;
      color: #333;
      margin-bottom: 4px;
    }

    .construction-subject {
      font-size: 14px;
      margin-top: 8px;
      margin-bottom: 4px;
    }

    /* === Total amount box (prominent) === */
    .construction-total-box {
      border: 2px solid #000;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      margin-top: 16px;
    }

    .construction-total-box .label {
      font-size: 14px;
      font-weight: bold;
    }

    .construction-total-box .amount {
      font-size: 22px;
      font-weight: bold;
    }

    /* === Issuer block (boxed) === */
    .construction-issuer-box {
      border: 1px solid #999;
      padding: 10px 12px;
      font-size: 11px;
      line-height: 1.6;
      overflow-wrap: break-word;
    }

    .issuer-company {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .issuer-line {
      margin-bottom: 2px;
      overflow-wrap: break-word;
    }

    .issuer-seal-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 8px;
    }

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

    /* === 4-column table === */
    .construction-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .construction-table th {
      background: #333;
      color: #fff;
      padding: 8px 10px;
      text-align: left;
      font-weight: bold;
      font-size: 11px;
      border: 1px solid #333;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .construction-table td {
      padding: 6px 10px;
      border: 1px solid #999;
      font-size: 11px;
      height: 28px;
    }

    .construction-table .col-name { width: 50%; }
    .construction-table .col-price { width: 17%; text-align: right; }
    .construction-table .col-qty { width: 13%; text-align: right; }
    .construction-table .col-total { width: 20%; text-align: right; }

    .construction-table .item-price,
    .construction-table .item-qty,
    .construction-table .item-total { text-align: right; }

    /* === Totals section (right-aligned) === */
    .construction-totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
    }

    .construction-totals-table {
      border-collapse: collapse;
      min-width: 250px;
    }

    .construction-totals-table td {
      padding: 6px 12px;
      font-size: 12px;
      border-bottom: 1px solid #ccc;
    }

    .construction-totals-table .totals-label {
      text-align: left;
    }

    .construction-totals-table .totals-value {
      text-align: right;
    }

    .construction-totals-table .total-final-row {
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
    }

    .construction-totals-table .total-final-row td {
      font-weight: bold;
      padding-top: 10px;
      padding-bottom: 10px;
      font-size: 14px;
    }

    /* === Notes section === */
    .construction-notes-section {
      margin: 20px 0;
      border: 1px solid #999;
    }

    .notes-title {
      background: #eee;
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
      min-height: 40px;
    }

    /* === Bank info section === */
    .construction-bank-section {
      border: 1px solid #999;
      padding: 10px 12px;
      margin-bottom: 20px;
      font-size: 11px;
    }

    .bank-title {
      font-weight: bold;
      margin-bottom: 4px;
    }

    .bank-line {
      margin-bottom: 2px;
    }

    /* === Print === */
    @media print {
      body { padding: 20px; }
      .document-container { max-width: none; }
    }
  `;
}

// === Section Renderers ===

function renderIssuerBlock(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  sealSizePx: number
): string {
  const { issuerSnapshot } = doc;
  const labels = getDocumentLabels(doc.type);
  const hasSeal = isValidImageDataUri(issuerSnapshot.sealImageBase64);
  const parsed = parseAddressWithPostalCode(issuerSnapshot.address);

  const lines: string[] = [];

  if (issuerSnapshot.companyName) {
    lines.push(`<div class="issuer-company">${escapeHtml(issuerSnapshot.companyName)}</div>`);
  }

  if (parsed.postalCode) {
    lines.push(`<div class="issuer-line">${escapeHtml(parsed.postalCode)}</div>`);
  }
  if (parsed.addressLine1) {
    lines.push(`<div class="issuer-line">${escapeHtml(parsed.addressLine1)}</div>`);
  }
  if (parsed.addressLine2) {
    lines.push(`<div class="issuer-line">${escapeHtml(parsed.addressLine2)}</div>`);
  }

  // TEL / FAX (separate lines to avoid overflow in narrow column)
  if (issuerSnapshot.phone) {
    lines.push(`<div class="issuer-line">TEL: ${escapeHtml(issuerSnapshot.phone)}</div>`);
  }
  if (issuerSnapshot.fax) {
    lines.push(`<div class="issuer-line">FAX: ${escapeHtml(issuerSnapshot.fax)}</div>`);
  }

  // E-mail
  if (issuerSnapshot.email) {
    lines.push(`<div class="issuer-line">E-mail: ${escapeHtml(issuerSnapshot.email)}</div>`);
  }

  // Contact person
  if (issuerSnapshot.contactPerson) {
    lines.push(`<div class="issuer-line">担当: ${escapeHtml(issuerSnapshot.contactPerson)}</div>`);
  }

  // Registration number (invoice only)
  if (labels.showRegistrationNumber && sensitiveSnapshot?.invoiceNumber) {
    lines.push(`<div class="issuer-line">登録番号: ${escapeHtml(sensitiveSnapshot.invoiceNumber)}</div>`);
  }

  if (lines.length === 0 && !hasSeal) {
    return '';
  }

  const sealHtml = hasSeal
    ? `<div class="issuer-seal"><img src="${issuerSnapshot.sealImageBase64}" alt="印影" class="seal-image" /></div>`
    : '';

  // Put seal beside the last line using flex row
  return `
    <div class="construction-issuer-box">
      <div class="issuer-seal-row">
        <div>
          ${lines.join('\n          ')}
        </div>
        ${sealHtml}
      </div>
    </div>
  `;
}

function renderLineItemsTable(doc: DocumentWithTotals): string {
  const dataRows = doc.lineItemsCalculated.map((item) => {
    return `
        <tr>
          <td class="item-name">${escapeHtml(item.name)}</td>
          <td class="item-price">${formatCurrency(item.unitPrice)}円</td>
          <td class="item-qty">${formatQuantity(item.quantityMilli)}</td>
          <td class="item-total">${formatCurrency(item.subtotal)}円</td>
        </tr>`;
  });

  // Fill empty rows to reach MIN_TABLE_ROWS
  const emptyRowCount = Math.max(0, MIN_TABLE_ROWS - dataRows.length);
  const emptyRows = Array.from({ length: emptyRowCount }, () => {
    return `
        <tr>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
          <td>&nbsp;</td>
        </tr>`;
  });

  return `
    <table class="construction-table">
      <thead>
        <tr>
          <th class="col-name">品番・品名</th>
          <th class="col-price">単価</th>
          <th class="col-qty">数量</th>
          <th class="col-total">金額</th>
        </tr>
      </thead>
      <tbody>
        ${dataRows.join('\n')}
        ${emptyRows.join('\n')}
      </tbody>
    </table>
  `;
}

function renderTotalsSection(doc: DocumentWithTotals): string {
  const carriedForward = doc.carriedForwardAmount ?? 0;
  const hasCarriedForward = carriedForward > 0;

  const carriedForwardRow = hasCarriedForward
    ? `
        <tr>
          <td class="totals-label">繰越金額</td>
          <td class="totals-value">${formatCurrency(carriedForward)}円</td>
        </tr>`
    : '';

  return `
    <div class="construction-totals-section">
      <table class="construction-totals-table">
        <tr>
          <td class="totals-label">小計</td>
          <td class="totals-value">${formatCurrency(doc.subtotalYen)}円</td>
        </tr>
        <tr>
          <td class="totals-label">消費税等</td>
          <td class="totals-value">${formatCurrency(doc.taxYen)}円</td>
        </tr>
        ${carriedForwardRow}
        <tr class="total-final-row">
          <td class="totals-label">合計金額</td>
          <td class="totals-value">${formatCurrency(doc.totalYen)}円</td>
        </tr>
      </table>
    </div>
  `;
}

function renderBankInfoSection(
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  if (!hasBankInfo(sensitiveSnapshot)) return '';

  const lines: string[] = [];
  if (sensitiveSnapshot!.bankName) {
    lines.push(`<div class="bank-line">${escapeHtml(sensitiveSnapshot!.bankName)}</div>`);
  }
  if (sensitiveSnapshot!.branchName) {
    lines.push(`<div class="bank-line">${escapeHtml(sensitiveSnapshot!.branchName)}支店</div>`);
  }
  if (sensitiveSnapshot!.accountType) {
    lines.push(`<div class="bank-line">${escapeHtml(sensitiveSnapshot!.accountType)}</div>`);
  }
  if (sensitiveSnapshot!.accountNumber) {
    lines.push(`<div class="bank-line">口座番号: ${escapeHtml(sensitiveSnapshot!.accountNumber)}</div>`);
  }
  if (sensitiveSnapshot!.accountHolderName) {
    lines.push(`<div class="bank-line">口座名義: ${escapeHtml(sensitiveSnapshot!.accountHolderName)}</div>`);
  }

  return `
    <div class="construction-bank-section">
      <div class="bank-title">お振込先</div>
      ${lines.join('\n      ')}
    </div>
  `;
}

function renderNotesSection(doc: DocumentWithTotals): string {
  return `
    <div class="construction-notes-section">
      <div class="notes-title">備考</div>
      <div class="notes-content">${doc.notes ? escapeHtml(doc.notes) : ''}</div>
    </div>
  `;
}

// === Main Template Generator ===

/**
 * Generate CONSTRUCTION template HTML
 *
 * Creates a construction-industry-oriented document with 4-column table,
 * prominent total amount box, and issuer box with postal code separation.
 */
export function generateConstructionTemplate(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  options: TemplateOptions
): string {
  const labels = getDocumentLabels(doc.type);
  const sealSizePx = getSealSizePx(options.sealSize ?? DEFAULT_SEAL_SIZE, 'CONSTRUCTION');
  const backgroundCss = getBackgroundCss(options.backgroundDesign, options.backgroundImageDataUrl);
  const backgroundHtml = getBackgroundHtml(options.backgroundDesign, options.backgroundImageDataUrl);
  const css = getConstructionCss(sealSizePx);

  // Title (with full-width spaces for visual emphasis)
  const titleText = doc.type === 'estimate' ? '見　積　書' : '請　求　書';

  // Total amount label
  const totalLabel = doc.type === 'estimate' ? '御見積金額' : '御請求金額';

  // Date
  const dateHtml = `<div class="construction-date">${formatDate(doc.issueDate)}</div>`;

  // Client
  const clientAddressHtml = doc.clientAddress
    ? `<div class="client-address">${escapeHtml(doc.clientAddress)}</div>`
    : '';

  // Subject
  const subjectHtml = doc.subject
    ? `<div class="construction-subject">${escapeHtml(doc.subject)}</div>`
    : '';

  // Period info (validUntil or dueDate)
  const periodValue = doc[labels.periodField];
  const periodHtml = periodValue
    ? `<div style="font-size: 11px; margin-top: 4px;">${escapeHtml(labels.periodLabel)}: ${formatDate(periodValue)}</div>`
    : '';

  // Document number
  const docNoHtml = `<div style="font-size: 11px; margin-top: 4px;">${escapeHtml(labels.numberLabel)}: ${escapeHtml(doc.documentNo)}</div>`;

  // Issuer block
  const issuerHtml = renderIssuerBlock(doc, sensitiveSnapshot, sealSizePx);

  // Total amount box
  const totalBoxHtml = `
    <div class="construction-total-box">
      <span class="label">${escapeHtml(totalLabel)}</span>
      <span class="amount">${formatCurrency(doc.totalYen)}円</span>
    </div>
  `;

  // Line items table
  const tableHtml = renderLineItemsTable(doc);

  // Totals section
  const totalsHtml = renderTotalsSection(doc);

  // Bank info (invoice only)
  const bankHtml = labels.showBankInfo ? renderBankInfoSection(sensitiveSnapshot) : '';

  // Notes
  const notesHtml = renderNotesSection(doc);

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
    <!-- Date -->
    ${dateHtml}

    <!-- Title -->
    <div class="construction-title">${titleText}</div>

    <!-- Two-column header -->
    <div class="construction-header">
      <div class="header-left">
        <div class="construction-client-name">${escapeHtml(doc.clientName)}</div>
        ${clientAddressHtml}
        ${subjectHtml}
        ${docNoHtml}
        ${periodHtml}

        <!-- Total amount -->
        ${totalBoxHtml}
      </div>
      <div class="header-right">
        ${issuerHtml}
      </div>
    </div>

    <!-- Line items -->
    ${tableHtml}

    <!-- Totals -->
    ${totalsHtml}

    <!-- Bank info (invoice only) -->
    ${bankHtml}

    <!-- Notes -->
    ${notesHtml}
  </div>
</body>
</html>`;
}
