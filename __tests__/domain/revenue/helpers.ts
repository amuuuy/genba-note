/**
 * Test helpers for revenue domain tests
 *
 * Provides factory functions for creating test invoices
 * with specific amounts for revenue testing.
 */

import type { Document, LineItem, IssuerSnapshot } from '@/types/document';

/**
 * Create a test LineItem with sensible defaults
 */
export function createTestLineItem(overrides?: Partial<LineItem>): LineItem {
  return {
    id: `line-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Item',
    quantityMilli: 1000, // 1.000
    unit: '式',
    unitPrice: 10000,
    taxRate: 10,
    ...overrides,
  };
}

/**
 * Create a test IssuerSnapshot
 */
export function createTestIssuerSnapshot(
  overrides?: Partial<IssuerSnapshot>
): IssuerSnapshot {
  return {
    companyName: null,
    representativeName: null,
    address: null,
    phone: null,
    fax: null,
    sealImageBase64: null,
    contactPerson: null,
    email: null,
    ...overrides,
  };
}

/**
 * Create a test Invoice with sensible defaults for revenue testing
 * Default status is 'sent' (included in revenue calculations)
 *
 * @param overrides - Partial Document to override defaults
 */
export function createTestInvoice(overrides?: Partial<Document>): Document {
  const now = Date.now();
  return {
    id: `inv-${now}-${Math.random().toString(36).substr(2, 9)}`,
    documentNo: 'INV-001',
    type: 'invoice',
    status: 'sent', // Default to 'sent' for revenue tests
    clientName: 'Test Client',
    clientAddress: null,
    customerId: null,
    subject: 'Test Project',
    issueDate: '2026-01-15', // Mid-month default
    validUntil: null,
    dueDate: '2026-02-15',
    paidAt: null,
    lineItems: [createTestLineItem()],
    notes: null,
    issuerSnapshot: createTestIssuerSnapshot(),
    createdAt: now,
    updatedAt: now,
    carriedForwardAmount: null,
    ...overrides,
  };
}

/**
 * Create a test Estimate (for testing exclusion from revenue)
 *
 * @param overrides - Partial Document to override defaults
 */
export function createTestEstimate(overrides?: Partial<Document>): Document {
  const now = Date.now();
  return {
    id: `est-${now}-${Math.random().toString(36).substr(2, 9)}`,
    documentNo: 'EST-001',
    type: 'estimate',
    status: 'sent',
    clientName: 'Test Client',
    clientAddress: null,
    customerId: null,
    subject: 'Test Project',
    issueDate: '2026-01-15',
    validUntil: '2026-02-15',
    dueDate: null,
    paidAt: null,
    lineItems: [createTestLineItem()],
    notes: null,
    issuerSnapshot: createTestIssuerSnapshot(),
    createdAt: now,
    updatedAt: now,
    carriedForwardAmount: null,
    ...overrides,
  };
}

/**
 * Create a paid invoice with specific issueDate and paidAt
 *
 * @param issueDate - Issue date (YYYY-MM-DD)
 * @param paidAt - Payment date (YYYY-MM-DD)
 * @param unitPrice - Unit price for the single line item (default: 10000)
 */
export function createPaidInvoice(
  issueDate: string,
  paidAt: string,
  unitPrice: number = 10000
): Document {
  return createTestInvoice({
    status: 'paid',
    issueDate,
    paidAt,
    lineItems: [createTestLineItem({ unitPrice })],
  });
}

/**
 * Create a sent (unpaid) invoice with specific issueDate
 *
 * @param issueDate - Issue date (YYYY-MM-DD)
 * @param unitPrice - Unit price for the single line item (default: 10000)
 */
export function createSentInvoice(
  issueDate: string,
  unitPrice: number = 10000
): Document {
  return createTestInvoice({
    status: 'sent',
    issueDate,
    lineItems: [createTestLineItem({ unitPrice })],
  });
}

/**
 * Create a draft invoice (should be excluded from revenue)
 *
 * @param issueDate - Issue date (YYYY-MM-DD)
 */
export function createDraftInvoice(issueDate: string): Document {
  return createTestInvoice({
    status: 'draft',
    issueDate,
  });
}

/**
 * Create an invoice with a specific total amount
 * Note: Total = unitPrice * 1.1 (assuming qty=1, taxRate=10)
 *
 * @param issueDate - Issue date (YYYY-MM-DD)
 * @param status - Document status
 * @param totalYen - Desired total amount (will calculate unitPrice to approximate)
 */
export function createInvoiceWithTotal(
  issueDate: string,
  status: 'sent' | 'paid',
  totalYen: number
): Document {
  // total = unitPrice * 1.1 (for taxRate=10, qty=1)
  // unitPrice = total / 1.1
  const unitPrice = Math.floor(totalYen / 1.1);
  return createTestInvoice({
    status,
    issueDate,
    paidAt: status === 'paid' ? issueDate : null,
    lineItems: [createTestLineItem({ unitPrice })],
  });
}

/**
 * Create multiple invoices with varying statuses for testing
 *
 * @param config - Configuration for invoice generation
 */
export function createTestInvoiceSet(config: {
  sentCount: number;
  paidCount: number;
  draftCount: number;
  baseIssueDate: string;
}): Document[] {
  const invoices: Document[] = [];

  for (let i = 0; i < config.sentCount; i++) {
    invoices.push(
      createSentInvoice(config.baseIssueDate, 10000 + i * 1000)
    );
  }

  for (let i = 0; i < config.paidCount; i++) {
    invoices.push(
      createPaidInvoice(config.baseIssueDate, config.baseIssueDate, 20000 + i * 1000)
    );
  }

  for (let i = 0; i < config.draftCount; i++) {
    invoices.push(createDraftInvoice(config.baseIssueDate));
  }

  return invoices;
}
