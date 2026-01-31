/**
 * PDF Template Service
 *
 * Pure functions for generating HTML templates for document preview and PDF generation.
 * Follows SPEC 2.7 for PDF content and formatting requirements.
 */

import type { DocumentType, DocumentWithTotals, TaxRate, SensitiveIssuerSnapshot } from '@/types/document';
import type { PdfTemplateInput, PdfTemplateResult, ColorScheme } from './types';
import { ESTIMATE_COLORS, INVOICE_COLORS } from './types';

// === Color Scheme ===

/**
 * Get color scheme for document type
 */
export function getColorScheme(type: DocumentType): ColorScheme {
  return type === 'estimate' ? ESTIMATE_COLORS : INVOICE_COLORS;
}

// === Formatting Functions ===

/**
 * Format currency with thousand separators
 * @param amount - Amount in yen
 * @returns Formatted string (e.g., "1,234,567")
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ja-JP');
}

/**
 * Format quantity from milli-units to display string
 * @param quantityMilli - Quantity in milli-units (1000 = 1.0)
 * @returns Formatted string (e.g., "2.5", "1", "0.001")
 */
export function formatQuantity(quantityMilli: number): string {
  const value = quantityMilli / 1000;
  // Use toFixed(3) then remove trailing zeros
  const formatted = value.toFixed(3).replace(/\.?0+$/, '');
  // If result is empty string (shouldn't happen), return "0"
  return formatted || '0';
}

/**
 * Format tax rate for display
 * @param rate - Tax rate (0 or 10)
 * @returns "10%" or "非課税"
 */
export function formatTaxRate(rate: TaxRate): string {
  return rate === 0 ? '非課税' : `${rate}%`;
}

/**
 * Format date string to Japanese format
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Japanese format (e.g., "2026年1月30日")
 */
export function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return `${year}年${month}月${day}日`;
}

/**
 * Generate document title based on type
 * @param type - Document type
 * @returns "御見積書" or "御請求書"
 */
export function generateDocumentTitle(type: DocumentType): string {
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
  if (issuerSnapshot.phone) {
    lines.push(`<div class="issuer-phone">TEL: ${escapeHtml(issuerSnapshot.phone)}</div>`);
  }
  if (sensitiveSnapshot?.invoiceNumber) {
    lines.push(`<div class="issuer-invoice-number">登録番号: ${escapeHtml(sensitiveSnapshot.invoiceNumber)}</div>`);
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
function renderLineItemsTable(doc: DocumentWithTotals, colors: ColorScheme): string {
  const rows = doc.lineItemsCalculated.map((item) => {
    const lineTotal = item.subtotal + item.tax;
    return `
        <tr>
          <td class="item-name">${escapeHtml(item.name)}</td>
          <td class="item-qty">${formatQuantity(item.quantityMilli)}</td>
          <td class="item-unit">${escapeHtml(item.unit)}</td>
          <td class="item-price">¥${formatCurrency(item.unitPrice)}</td>
          <td class="item-tax">${formatTaxRate(item.taxRate)}</td>
          <td class="item-total">¥${formatCurrency(lineTotal)}</td>
        </tr>`;
  });

  return `
    <table class="items-table">
      <thead>
        <tr>
          <th class="col-name">品名</th>
          <th class="col-qty">数量</th>
          <th class="col-unit">単位</th>
          <th class="col-price">単価</th>
          <th class="col-tax">税率</th>
          <th class="col-total">金額</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('\n')}
      </tbody>
    </table>
  `;
}

/**
 * Render totals section with tax breakdown
 */
function renderTotalsSection(doc: DocumentWithTotals): string {
  const breakdownRows = doc.taxBreakdown.map((tb) => {
    const label = tb.rate === 0 ? '非課税対象' : `${tb.rate}%対象`;
    return `
        <div class="breakdown-row">
          <span class="breakdown-label">${label}: ¥${formatCurrency(tb.subtotal)}</span>
          <span class="breakdown-tax">消費税: ¥${formatCurrency(tb.tax)}</span>
        </div>`;
  });

  return `
    <div class="totals-section">
      <div class="totals-row">
        <span class="label">小計</span>
        <span class="value">¥${formatCurrency(doc.subtotalYen)}</span>
      </div>
      ${breakdownRows.join('\n')}
      <div class="totals-row total-final">
        <span class="label">税込合計</span>
        <span class="value">¥${formatCurrency(doc.totalYen)}</span>
      </div>
    </div>
  `;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// === Main Template Generator ===

/**
 * Generate HTML template for document preview/PDF
 */
export function generateHtmlTemplate(input: PdfTemplateInput): PdfTemplateResult {
  const { document: doc, sensitiveSnapshot } = input;
  const colors = getColorScheme(doc.type);
  const title = generateDocumentTitle(doc.type);
  const isInvoice = doc.type === 'invoice';

  // Client section
  const clientAddressHtml = doc.clientAddress
    ? `<div class="client-address">${escapeHtml(doc.clientAddress)}</div>`
    : '';

  // Subject section
  const subjectHtml = doc.subject
    ? `<div class="subject-section"><span class="label">件名:</span> ${escapeHtml(doc.subject)}</div>`
    : '';

  // Due date section (invoice only)
  const dueDateHtml =
    isInvoice && doc.dueDate
      ? `<div class="due-date-section"><span class="label">お支払期限:</span> ${formatDate(doc.dueDate)}</div>`
      : '';

  // Notes section
  const notesHtml = doc.notes
    ? `<div class="notes-section"><h3>備考</h3><p>${escapeHtml(doc.notes)}</p></div>`
    : '';

  // Bank section (invoice only)
  const bankHtml = renderBankSection(sensitiveSnapshot, isInvoice);

  // Issuer section
  const issuerHtml = renderIssuerSection(doc, sensitiveSnapshot);

  // Line items table
  const lineItemsTableHtml = renderLineItemsTable(doc, colors);

  // Totals section
  const totalsHtml = renderTotalsSection(doc);

  const html = `<!DOCTYPE html>
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

    /* Header */
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

    .document-number {
      font-weight: bold;
    }

    /* Client Section */
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

    /* Subject */
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

    /* Due Date */
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

    /* Total Amount Box */
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

    /* Line Items Table */
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

    .items-table tr:nth-child(even) {
      background: #f9f9f9;
    }

    .col-name { width: 35%; }
    .col-qty { width: 10%; text-align: right; }
    .col-unit { width: 10%; text-align: center; }
    .col-price { width: 15%; text-align: right; }
    .col-tax { width: 10%; text-align: center; }
    .col-total { width: 20%; text-align: right; }

    .item-qty, .item-price, .item-total { text-align: right; }
    .item-unit, .item-tax { text-align: center; }

    /* Totals Section */
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

    .totals-row:last-child {
      border-bottom: none;
    }

    .totals-row .label {
      font-weight: bold;
    }

    .totals-row .value {
      font-weight: bold;
    }

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

    /* Notes Section */
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

    /* Bank Section */
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

    /* Issuer Section */
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

    /* Print styles */
    @media print {
      body {
        padding: 0;
      }

      .document-container {
        max-width: none;
      }
    }
  </style>
</head>
<body>
  <div class="document-container">
    <!-- Header -->
    <div class="header">
      <div class="document-title">${title}</div>
      <div class="document-meta">
        <span class="document-number">No. ${escapeHtml(doc.documentNo)}</span>
        <span class="issue-date">発行日: ${formatDate(doc.issueDate)}</span>
      </div>
    </div>

    <!-- Client -->
    <div class="client-section">
      <div class="client-name">${escapeHtml(doc.clientName)} 様</div>
      ${clientAddressHtml}
    </div>

    ${subjectHtml}

    ${dueDateHtml}

    <!-- Total Amount -->
    <div class="total-box">
      <div class="label">合計金額（税込）</div>
      <div class="amount">¥${formatCurrency(doc.totalYen)}</div>
    </div>

    <!-- Line Items -->
    ${lineItemsTableHtml}

    <!-- Totals -->
    ${totalsHtml}

    <!-- Notes -->
    ${notesHtml}

    <!-- Bank Info (Invoice only) -->
    ${bankHtml}

    <!-- Issuer Info -->
    ${issuerHtml}
  </div>
</body>
</html>`;

  return {
    html,
    title: generateFilenameTitle(doc.documentNo, doc.type),
  };
}
