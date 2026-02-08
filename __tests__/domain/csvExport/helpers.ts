/**
 * Test helpers for CSV export domain tests
 *
 * Provides factory functions for creating test data for CSV export testing.
 */

import type { Document, LineItem, IssuerSnapshot } from '@/types/document';
import type { CsvInvoiceRow } from '@/domain/csvExport/types';

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
 * Create a test Invoice with sensible defaults for CSV export testing
 * Default status is 'sent' (included in CSV export)
 */
export function createTestInvoice(overrides?: Partial<Document>): Document {
  const now = Date.now();
  return {
    id: `inv-${now}-${Math.random().toString(36).substr(2, 9)}`,
    documentNo: 'INV-001',
    type: 'invoice',
    status: 'sent',
    clientName: 'Test Client',
    clientAddress: null,
    customerId: null,
    subject: 'Test Project',
    issueDate: '2026-01-15',
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
 * Create a test Estimate (should be excluded from CSV export)
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
 * Create a draft invoice (should be excluded from CSV export)
 */
export function createDraftInvoice(issueDate: string): Document {
  return createTestInvoice({
    status: 'draft',
    issueDate,
  });
}

/**
 * Create a test CsvInvoiceRow with sensible defaults
 */
export function createTestCsvRow(
  overrides?: Partial<CsvInvoiceRow>
): CsvInvoiceRow {
  return {
    documentNo: 'INV-001',
    issueDate: '2026-01-15',
    dueDate: '2026-02-15',
    paidAt: '',
    clientName: 'Test Client',
    subject: 'Test Project',
    subtotalYen: 10000,
    taxYen: 1000,
    totalYen: 11000,
    status: 'sent',
    ...overrides,
  };
}

/**
 * Create multiple invoices for export testing
 */
export function createInvoicesForExport(config: {
  sentCount: number;
  paidCount: number;
  draftCount: number;
  estimateCount?: number;
  baseIssueDate: string;
}): Document[] {
  const docs: Document[] = [];

  for (let i = 0; i < config.sentCount; i++) {
    docs.push(
      createSentInvoice(config.baseIssueDate, 10000 + i * 1000)
    );
  }

  for (let i = 0; i < config.paidCount; i++) {
    docs.push(
      createPaidInvoice(config.baseIssueDate, config.baseIssueDate, 20000 + i * 1000)
    );
  }

  for (let i = 0; i < config.draftCount; i++) {
    docs.push(createDraftInvoice(config.baseIssueDate));
  }

  const estimateCount = config.estimateCount ?? 0;
  for (let i = 0; i < estimateCount; i++) {
    docs.push(
      createTestEstimate({
        issueDate: config.baseIssueDate,
        documentNo: `EST-${String(i + 1).padStart(3, '0')}`,
      })
    );
  }

  return docs;
}
