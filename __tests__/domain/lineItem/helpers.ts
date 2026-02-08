/**
 * Test helpers for lineItem domain tests
 *
 * Provides factory functions for creating test data.
 * These helpers ensure consistent test data across all test files.
 */

import type { LineItem, Document } from '@/types/document';

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
 * Create multiple test line items with unique names
 * @param count - Number of line items to create
 * @param baseOverrides - Overrides applied to all items
 */
export function createTestLineItems(
  count: number,
  baseOverrides?: Partial<LineItem>
): LineItem[] {
  return Array.from({ length: count }, (_, i) =>
    createTestLineItem({
      id: `line-item-${i}`,
      name: `Test Item ${i + 1}`,
      ...baseOverrides,
    })
  );
}

/**
 * Create a test Document for calculation tests
 * @param lineItems - Line items for the document
 */
export function createTestDocumentWithLineItems(
  lineItems: LineItem[]
): Document {
  const now = Date.now();
  return {
    id: `doc-${now}`,
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
    lineItems,
    notes: null,
    issuerSnapshot: {
      companyName: null,
      representativeName: null,
      address: null,
      phone: null,
      fax: null,
      sealImageBase64: null,
      contactPerson: null,
      email: null,
    },
    createdAt: now,
    updatedAt: now,
    carriedForwardAmount: null,
  };
}
