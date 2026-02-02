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

import type { DocumentType, DocumentWithTotals, TaxRate, SensitiveIssuerSnapshot } from '@/types/document';
import type { PdfTemplateInput, PdfTemplateResult, ColorScheme, TemplateMode } from './types';
import { ESTIMATE_COLORS, INVOICE_COLORS, FORMAL_COLORS } from './types';
import { getScreenThemeCss, getFormalThemeCss } from './themes';

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
 * Generate document title based on type and mode
 * @param type - Document type
 * @param mode - Output mode (screen uses 御, pdf uses plain)
 * @returns Document title string
 */
export function generateDocumentTitle(type: DocumentType, mode: TemplateMode = 'screen'): string {
  if (mode === 'pdf') {
    return type === 'estimate' ? '見積書' : '請求書';
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
 * Render issuer section with seal image for formal PDF
 * Seal is overlaid on company name only (standard placement for construction industry)
 */
function renderFormalIssuerSection(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  const { issuerSnapshot } = doc;
  const hasSeal = !!issuerSnapshot.sealImageBase64;

  // Seal image - overlaid on company name only
  const sealHtml = hasSeal
    ? `<div class="seal-overlay"><img src="data:image/png;base64,${issuerSnapshot.sealImageBase64}" alt="印影" class="seal-image" /></div>`
    : '';

  // Company name: use wrapper only when seal exists to avoid unnecessary spacing
  let companyHtml = '';
  if (issuerSnapshot.companyName) {
    if (hasSeal) {
      // With seal: wrap in relative container for overlay positioning
      companyHtml = `<div class="issuer-company-wrapper"><div class="issuer-company">${escapeHtml(issuerSnapshot.companyName)}</div>${sealHtml}</div>`;
    } else {
      // Without seal: simple company name without wrapper
      companyHtml = `<div class="issuer-company">${escapeHtml(issuerSnapshot.companyName)}</div>`;
    }
  }

  // Other issuer info (address, phone, invoice number) - not overlapped by seal
  const otherLines: string[] = [];
  if (issuerSnapshot.address) {
    otherLines.push(`<div class="issuer-address">${escapeHtml(issuerSnapshot.address)}</div>`);
  }
  if (issuerSnapshot.phone) {
    otherLines.push(`<div class="issuer-phone">TEL: ${escapeHtml(issuerSnapshot.phone)}</div>`);
  }
  if (sensitiveSnapshot?.invoiceNumber) {
    otherLines.push(`<div class="issuer-invoice-number">登録番号: ${escapeHtml(sensitiveSnapshot.invoiceNumber)}</div>`);
  }

  return `
    <div class="formal-issuer-section">
      <div class="issuer-info">
        ${companyHtml}
        ${otherLines.join('\n        ')}
      </div>
    </div>
  `;
}

/**
 * Render line items table
 */
function renderLineItemsTable(doc: DocumentWithTotals, _colors: ColorScheme): string {
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
 * Render formal line items table (without tax rate column for simplicity)
 */
function renderFormalLineItemsTable(doc: DocumentWithTotals): string {
  const rows = doc.lineItemsCalculated.map((item) => {
    const lineTotal = item.subtotal + item.tax;
    return `
        <tr>
          <td class="item-name">${escapeHtml(item.name)}</td>
          <td class="item-qty">${formatQuantity(item.quantityMilli)}</td>
          <td class="item-unit">${escapeHtml(item.unit)}</td>
          <td class="item-price">${formatCurrency(item.unitPrice)}</td>
          <td class="item-total">${formatCurrency(lineTotal)}</td>
        </tr>`;
  });

  return `
    <table class="formal-items-table">
      <thead>
        <tr>
          <th class="col-name">詳細</th>
          <th class="col-qty">数量</th>
          <th class="col-unit">単位</th>
          <th class="col-price">単価</th>
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
 * Render formal totals section
 */
function renderFormalTotalsSection(doc: DocumentWithTotals): string {
  return `
    <div class="formal-totals-section">
      <table class="formal-totals-table">
        <tr>
          <td class="totals-label">小計</td>
          <td class="totals-value">${formatCurrency(doc.subtotalYen)}円</td>
        </tr>
        <tr>
          <td class="totals-label">消費税</td>
          <td class="totals-value">${formatCurrency(doc.taxYen)}円</td>
        </tr>
        <tr class="total-final-row">
          <td class="totals-label">合計金額</td>
          <td class="totals-value">${formatCurrency(doc.totalYen)}円</td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Render formal bank section
 */
function renderFormalBankSection(
  snapshot: SensitiveIssuerSnapshot | null,
  isInvoice: boolean
): string {
  if (!isInvoice || !hasBankInfo(snapshot)) {
    return '';
  }

  const parts: string[] = [];
  if (snapshot!.bankName) parts.push(escapeHtml(snapshot!.bankName));
  if (snapshot!.branchName) parts.push(`${escapeHtml(snapshot!.branchName)}支店`);
  if (snapshot!.accountType) parts.push(escapeHtml(snapshot!.accountType));
  if (snapshot!.accountNumber) parts.push(escapeHtml(snapshot!.accountNumber));
  if (snapshot!.accountHolderName) parts.push(escapeHtml(snapshot!.accountHolderName));

  return `
    <div class="formal-bank-section">
      <div class="bank-title">お振込先</div>
      <div class="bank-details">${parts.join(' ')}</div>
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
      <div class="amount">¥${formatCurrency(doc.totalYen)}</div>
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

// === Formal PDF Template (monochrome official layout) ===

/**
 * Generate formal PDF template HTML (official document layout)
 */
function generateFormalPdfTemplate(
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null
): string {
  const themeCss = getFormalThemeCss(FORMAL_COLORS);
  const title = generateDocumentTitle(doc.type, 'pdf');
  const isInvoice = doc.type === 'invoice';

  const clientAddressHtml = doc.clientAddress
    ? `<div class="client-address">${escapeHtml(doc.clientAddress)}</div>`
    : '';

  const subjectHtml = doc.subject
    ? `<div class="formal-subject">件名: ${escapeHtml(doc.subject)}</div>`
    : '';

  const dueDateHtml =
    isInvoice && doc.dueDate
      ? `<div class="formal-due-date">支払期限: ${formatDate(doc.dueDate)}</div>`
      : '';

  const introHtml = isInvoice
    ? '<div class="formal-intro">下記のとおりご請求申し上げます。</div>'
    : '<div class="formal-intro">下記のとおりお見積り申し上げます。</div>';

  const notesHtml = doc.notes
    ? `<div class="formal-notes-section"><div class="notes-title">備考欄</div><div class="notes-content">${escapeHtml(doc.notes)}</div></div>`
    : '<div class="formal-notes-section"><div class="notes-title">備考欄</div><div class="notes-content"></div></div>';

  const bankHtml = renderFormalBankSection(sensitiveSnapshot, isInvoice);
  const issuerHtml = renderFormalIssuerSection(doc, sensitiveSnapshot);
  const lineItemsTableHtml = renderFormalLineItemsTable(doc);
  const totalsHtml = renderFormalTotalsSection(doc);

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
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

    /* Title */
    .formal-title {
      font-size: 26px;
      font-weight: bold;
      text-align: center;
      letter-spacing: 0.3em;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 30px;
    }

    /* Two-column header */
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

    .header-right div {
      margin-bottom: 4px;
    }

    /* Client section */
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

    /* Subject and due date */
    .formal-subject {
      margin: 15px 0;
      font-size: 13px;
    }

    .formal-due-date {
      margin: 10px 0;
      font-size: 13px;
    }

    .formal-intro {
      margin: 15px 0;
      font-size: 12px;
    }

    /* Total amount box */
    .formal-total-box {
      border: 2px solid #000;
      padding: 12px 20px;
      margin: 20px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .formal-total-box .total-label {
      font-size: 14px;
      font-weight: bold;
    }

    .formal-total-box .total-amount {
      font-size: 22px;
      font-weight: bold;
    }

    /* Issuer section with seal overlay on company name only */
    .formal-issuer-section {
      text-align: right;
      margin: 20px 0;
    }

    .issuer-info {
      text-align: right;
    }

    /* Company name wrapper - relative container for seal overlay */
    .issuer-company-wrapper {
      position: relative;
      display: inline-block;
      min-height: 100px;
      padding-right: 60px;
    }

    .issuer-company {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .issuer-info > div {
      font-size: 11px;
      margin-bottom: 2px;
    }

    .issuer-invoice-number {
      font-size: 10px;
      color: #333;
    }

    /* Seal overlay - positioned to overlap company name only */
    .seal-overlay {
      position: absolute;
      right: -40px;
      top: -10px;
      width: 100px;
      height: 100px;
      opacity: 0.85;
    }

    .seal-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* Line items table */
    .formal-items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }

    .formal-items-table th {
      background: #000;
      color: #fff;
      padding: 8px 10px;
      text-align: left;
      font-weight: bold;
      font-size: 11px;
    }

    .formal-items-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #ccc;
      font-size: 11px;
    }

    .formal-items-table tr:nth-child(even) {
      background: #f5f5f5;
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

    /* Totals section */
    .formal-totals-section {
      display: flex;
      justify-content: flex-end;
      margin: 20px 0;
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

    .formal-totals-table .total-final-row {
      border-top: 2px solid #000;
      border-bottom: none;
    }

    .formal-totals-table .total-final-row td {
      font-weight: bold;
      font-size: 13px;
      padding-top: 10px;
    }

    /* Notes section */
    .formal-notes-section {
      margin: 25px 0;
      border: 1px solid #999;
      min-height: 60px;
    }

    .notes-title {
      background: #f0f0f0;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: bold;
      border-bottom: 1px solid #999;
    }

    .notes-content {
      padding: 10px;
      font-size: 11px;
      white-space: pre-wrap;
      min-height: 40px;
    }

    /* Bank section */
    .formal-bank-section {
      margin: 20px 0;
      padding: 10px;
      border: 1px solid #999;
    }

    .bank-title {
      font-weight: bold;
      font-size: 11px;
      margin-bottom: 5px;
    }

    .bank-details {
      font-size: 12px;
    }

    ${themeCss}

    @media print {
      body { padding: 20px; }
      .document-container { max-width: none; }
    }
  </style>
</head>
<body>
  <div class="document-container">
    <!-- Title -->
    <div class="formal-title">${title}</div>

    <!-- Two-column header -->
    <div class="formal-header">
      <div class="header-left">
        <div class="formal-client-name">${escapeHtml(doc.clientName)}</div>
        ${clientAddressHtml}
      </div>
      <div class="header-right">
        <div>発行日: ${formatDate(doc.issueDate)}</div>
        <div>請求書番号: ${escapeHtml(doc.documentNo)}</div>
      </div>
    </div>

    ${subjectHtml}
    ${dueDateHtml}

    ${introHtml}

    <!-- Total amount -->
    <div class="formal-total-box">
      <span class="total-label">合計金額</span>
      <span class="total-amount">${formatCurrency(doc.totalYen)}円</span>
    </div>

    <!-- Issuer with seal -->
    ${issuerHtml}

    <!-- Line items -->
    ${lineItemsTableHtml}

    <!-- Totals -->
    ${totalsHtml}

    <!-- Notes -->
    ${notesHtml}

    <!-- Bank info -->
    ${bankHtml}
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
 */
export function generateHtmlTemplate(input: PdfTemplateInput): PdfTemplateResult {
  const { document: doc, sensitiveSnapshot, mode = 'screen' } = input;

  let html: string;

  if (mode === 'pdf') {
    // Use formal PDF template for official documents
    html = generateFormalPdfTemplate(doc, sensitiveSnapshot);
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
