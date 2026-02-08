/**
 * Test Helpers for PDF Module
 */

import type {
  Document,
  DocumentWithTotals,
  LineItem,
  LineItemCalculated,
  IssuerSnapshot,
  SensitiveIssuerSnapshot,
  DocumentType,
  DocumentStatus,
  TaxRate,
} from '@/types/document';
import type { PdfTemplateInput, TemplateMode } from '@/pdf/types';
import type { InvoiceTemplateType, SealSize, BackgroundDesign } from '@/types/settings';

/**
 * Generate a unique test ID
 */
let idCounter = 0;
export function generateTestId(prefix = 'test'): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now()}`;
}

/**
 * Reset ID counter (for test isolation)
 */
export function resetTestIdCounter(): void {
  idCounter = 0;
}

/**
 * Create a test line item
 */
export function createTestLineItem(
  overrides: Partial<LineItem> = {}
): LineItem {
  return {
    id: generateTestId('line'),
    name: 'テスト工事',
    quantityMilli: 1000, // 1.0
    unit: '式',
    unitPrice: 10000,
    taxRate: 10,
    ...overrides,
  };
}

/**
 * Create a calculated line item
 */
export function createTestLineItemCalculated(
  overrides: Partial<LineItemCalculated> = {}
): LineItemCalculated {
  const lineItem = createTestLineItem(overrides);
  const subtotal = Math.floor((lineItem.quantityMilli * lineItem.unitPrice) / 1000);
  const tax = Math.floor((subtotal * lineItem.taxRate) / 100);

  return {
    ...lineItem,
    subtotal: overrides.subtotal ?? subtotal,
    tax: overrides.tax ?? tax,
  };
}

/**
 * Create a test issuer snapshot
 */
export function createTestIssuerSnapshot(
  overrides: Partial<IssuerSnapshot> = {}
): IssuerSnapshot {
  return {
    companyName: 'テスト株式会社',
    representativeName: '山田太郎',
    address: '東京都渋谷区テスト1-2-3',
    phone: '03-1234-5678',
    fax: null,
    sealImageBase64: null,
    contactPerson: null,
    email: null,
    ...overrides,
  };
}

/**
 * Create a test sensitive issuer snapshot
 */
export function createTestSensitiveSnapshot(
  overrides: Partial<SensitiveIssuerSnapshot> = {}
): SensitiveIssuerSnapshot {
  return {
    invoiceNumber: 'T1234567890123',
    bankName: 'みずほ銀行',
    branchName: '渋谷',
    accountType: '普通',
    accountNumber: '1234567',
    accountHolderName: 'テスト株式会社',
    ...overrides,
  };
}

/**
 * Create a test document
 */
export function createTestDocument(
  overrides: Partial<Document> = {}
): Document {
  const type = overrides.type ?? 'estimate';
  const documentNo = type === 'estimate' ? 'EST-001' : 'INV-001';

  return {
    id: generateTestId('doc'),
    documentNo,
    type,
    status: 'draft',
    clientName: 'テスト顧客',
    clientAddress: '大阪府大阪市テスト町1-1',
    customerId: null,
    subject: 'テスト工事案件',
    issueDate: '2026-01-30',
    validUntil: type === 'estimate' ? '2026-02-28' : null,
    dueDate: type === 'invoice' ? '2026-02-28' : null,
    paidAt: null,
    lineItems: [createTestLineItem()],
    notes: 'テスト備考欄',
    issuerSnapshot: createTestIssuerSnapshot(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    carriedForwardAmount: null,
    ...overrides,
  };
}

/**
 * Create a test document with calculated totals
 */
export function createTestDocumentWithTotals(
  overrides: Partial<DocumentWithTotals> = {}
): DocumentWithTotals {
  const doc = createTestDocument(overrides);
  const lineItems = doc.lineItems;

  // Calculate totals
  const lineItemsCalculated = lineItems.map((item) => {
    const subtotal = Math.floor((item.quantityMilli * item.unitPrice) / 1000);
    const tax = Math.floor((subtotal * item.taxRate) / 100);
    return { ...item, subtotal, tax };
  });

  const subtotalYen = lineItemsCalculated.reduce((sum, item) => sum + item.subtotal, 0);
  const taxYen = lineItemsCalculated.reduce((sum, item) => sum + item.tax, 0);
  const totalYen = subtotalYen + taxYen;

  // Build tax breakdown
  const breakdownMap = new Map<TaxRate, { subtotal: number; tax: number }>();
  for (const item of lineItemsCalculated) {
    const existing = breakdownMap.get(item.taxRate);
    if (existing) {
      existing.subtotal += item.subtotal;
      existing.tax += item.tax;
    } else {
      breakdownMap.set(item.taxRate, { subtotal: item.subtotal, tax: item.tax });
    }
  }
  const taxBreakdown = Array.from(breakdownMap.entries())
    .map(([rate, values]) => ({ rate, ...values }))
    .sort((a, b) => b.rate - a.rate);

  return {
    ...doc,
    lineItemsCalculated: overrides.lineItemsCalculated ?? lineItemsCalculated,
    subtotalYen: overrides.subtotalYen ?? subtotalYen,
    taxYen: overrides.taxYen ?? taxYen,
    totalYen: overrides.totalYen ?? totalYen,
    taxBreakdown: overrides.taxBreakdown ?? taxBreakdown,
  };
}

/**
 * Create a test PDF template input
 */
export function createTestTemplateInput(
  overrides: {
    document?: Partial<DocumentWithTotals>;
    sensitiveSnapshot?: SensitiveIssuerSnapshot | null;
    mode?: TemplateMode;
    invoiceTemplateType?: InvoiceTemplateType;
    sealSize?: SealSize;
    backgroundDesign?: BackgroundDesign;
    backgroundImageDataUrl?: string | null;
  } = {}
): PdfTemplateInput {
  return {
    document: createTestDocumentWithTotals(overrides.document ?? {}),
    sensitiveSnapshot: overrides.sensitiveSnapshot === undefined
      ? createTestSensitiveSnapshot()
      : overrides.sensitiveSnapshot,
    mode: overrides.mode,
    invoiceTemplateType: overrides.invoiceTemplateType,
    sealSize: overrides.sealSize,
    backgroundDesign: overrides.backgroundDesign,
    backgroundImageDataUrl: overrides.backgroundImageDataUrl,
  };
}

/**
 * Create a null-filled sensitive snapshot (all fields null)
 */
export function createNullSensitiveSnapshot(): SensitiveIssuerSnapshot {
  return {
    invoiceNumber: null,
    bankName: null,
    branchName: null,
    accountType: null,
    accountNumber: null,
    accountHolderName: null,
  };
}
