/**
 * Test helpers for document domain tests
 *
 * Provides factory functions for creating test data.
 * These helpers ensure consistent test data across all test files.
 */

import type { Document, LineItem, IssuerSnapshot } from '@/types/document';

/**
 * Create a test LineItem with sensible defaults
 * @param overrides - Partial LineItem to override defaults
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
 * @param overrides - Partial IssuerSnapshot to override defaults
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
 * Create a test Document (estimate by default) with sensible defaults
 * @param overrides - Partial Document to override defaults
 */
export function createTestDocument(overrides?: Partial<Document>): Document {
  const now = Date.now();
  return {
    id: `doc-${now}-${Math.random().toString(36).substr(2, 9)}`,
    documentNo: 'EST-001',
    type: 'estimate',
    status: 'draft',
    clientName: 'Test Client',
    clientAddress: null,
    customerId: null,
    subject: 'Test Project',
    issueDate: '2026-01-30',
    validUntil: '2026-02-28',
    dueDate: null,
    paidAt: null,
    lineItems: [createTestLineItem()],
    carriedForwardAmount: null,
    notes: null,
    issuerSnapshot: createTestIssuerSnapshot(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a test Invoice with sensible defaults
 * @param overrides - Partial Document to override defaults
 */
export function createTestInvoice(overrides?: Partial<Document>): Document {
  const now = Date.now();
  return {
    id: `inv-${now}-${Math.random().toString(36).substr(2, 9)}`,
    documentNo: 'INV-001',
    type: 'invoice',
    status: 'draft',
    clientName: 'Test Client',
    clientAddress: null,
    customerId: null,
    subject: 'Test Project',
    issueDate: '2026-01-30',
    validUntil: null, // Invoices don't have validUntil
    dueDate: '2026-02-28',
    paidAt: null,
    lineItems: [createTestLineItem()],
    carriedForwardAmount: null,
    notes: null,
    issuerSnapshot: createTestIssuerSnapshot(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a paid invoice with all required fields set
 * @param overrides - Partial Document to override defaults
 */
export function createTestPaidInvoice(overrides?: Partial<Document>): Document {
  return createTestInvoice({
    status: 'paid',
    paidAt: '2026-01-25',
    ...overrides,
  });
}

/**
 * Create multiple test line items
 * @param count - Number of line items to create
 * @param baseOverrides - Overrides applied to all items
 */
export function createTestLineItems(
  count: number,
  baseOverrides?: Partial<LineItem>
): LineItem[] {
  return Array.from({ length: count }, (_, i) =>
    createTestLineItem({
      name: `Test Item ${i + 1}`,
      ...baseOverrides,
    })
  );
}
