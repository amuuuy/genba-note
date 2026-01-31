/**
 * Revenue Service Tests
 *
 * TDD: Tests are written first, implementation follows.
 * Tests cover revenue aggregation per SPEC 2.6.3.
 */

// Mock expo-secure-store FIRST before any imports
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock storage services
jest.mock('@/storage/asyncStorageService');
jest.mock('@/storage/secureStorageService');

import * as asyncStorageService from '@/storage/asyncStorageService';
import {
  filterInvoicesByPeriod,
  calculateRevenueSummary,
  getRevenueSummary,
  verifyInvariant,
} from '@/domain/revenue/revenueService';
import type { RevenueSummary } from '@/domain/revenue/types';
import type { Document } from '@/types/document';
import {
  createTestInvoice,
  createTestEstimate,
  createPaidInvoice,
  createSentInvoice,
  createDraftInvoice,
  createTestInvoiceSet,
  createTestLineItem,
} from './helpers';

const mockedAsyncStorage = jest.mocked(asyncStorageService);

describe('revenueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // === filterInvoicesByPeriod ===

  describe('filterInvoicesByPeriod', () => {
    const REFERENCE = '2026-01-15';

    it('should filter only invoices (exclude estimates)', () => {
      const docs: Document[] = [
        createTestInvoice({ issueDate: '2026-01-10' }),
        createTestEstimate({ issueDate: '2026-01-10' }),
      ];

      const result = filterInvoicesByPeriod(docs, 'this-month', REFERENCE);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('invoice');
    });

    it('should include sent invoices', () => {
      const docs: Document[] = [
        createSentInvoice('2026-01-10'),
      ];

      const result = filterInvoicesByPeriod(docs, 'this-month', REFERENCE);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('sent');
    });

    it('should include paid invoices', () => {
      const docs: Document[] = [
        createPaidInvoice('2026-01-10', '2026-01-15'),
      ];

      const result = filterInvoicesByPeriod(docs, 'this-month', REFERENCE);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('paid');
    });

    it('should exclude draft invoices', () => {
      const docs: Document[] = [
        createDraftInvoice('2026-01-10'),
        createSentInvoice('2026-01-10'),
      ];

      const result = filterInvoicesByPeriod(docs, 'this-month', REFERENCE);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('sent');
    });

    it('should filter by issueDate (not paidAt)', () => {
      const docs: Document[] = [
        // Paid in January, but issued in December - should NOT be included
        createPaidInvoice('2025-12-15', '2026-01-10'),
        // Issued in January - should be included
        createPaidInvoice('2026-01-05', '2026-01-10'),
      ];

      const result = filterInvoicesByPeriod(docs, 'this-month', REFERENCE);
      expect(result).toHaveLength(1);
      expect(result[0].issueDate).toBe('2026-01-05');
    });

    it('should handle empty array', () => {
      const result = filterInvoicesByPeriod([], 'this-month', REFERENCE);
      expect(result).toHaveLength(0);
    });

    it('should handle array with no matching invoices', () => {
      const docs: Document[] = [
        createSentInvoice('2025-12-15'), // Outside period
        createDraftInvoice('2026-01-10'), // Draft
        createTestEstimate({ issueDate: '2026-01-10' }), // Estimate
      ];

      const result = filterInvoicesByPeriod(docs, 'this-month', REFERENCE);
      expect(result).toHaveLength(0);
    });

    it('should work with last-3-months period', () => {
      const docs: Document[] = [
        createSentInvoice('2026-01-10'), // In range
        createSentInvoice('2025-11-15'), // In range (Nov)
        createSentInvoice('2025-10-31'), // Out of range
      ];

      // Reference: Jan 15 -> Range: Nov 1 to Jan 31
      const result = filterInvoicesByPeriod(docs, 'last-3-months', REFERENCE);
      expect(result).toHaveLength(2);
    });

    it('should work with this-year period', () => {
      const docs: Document[] = [
        createSentInvoice('2026-01-10'),
        createSentInvoice('2026-06-15'),
        createSentInvoice('2026-12-31'),
        createSentInvoice('2025-12-31'), // Out of range
      ];

      const result = filterInvoicesByPeriod(docs, 'this-year', REFERENCE);
      expect(result).toHaveLength(3);
    });
  });

  // === verifyInvariant ===

  describe('verifyInvariant', () => {
    it('should return true for valid summary (total === paid + unpaid)', () => {
      const summary: RevenueSummary = {
        total: 30000,
        paid: 20000,
        unpaid: 10000,
        invoiceCount: 3,
      };
      expect(verifyInvariant(summary)).toBe(true);
    });

    it('should return true for all paid', () => {
      const summary: RevenueSummary = {
        total: 50000,
        paid: 50000,
        unpaid: 0,
        invoiceCount: 2,
      };
      expect(verifyInvariant(summary)).toBe(true);
    });

    it('should return true for all unpaid', () => {
      const summary: RevenueSummary = {
        total: 30000,
        paid: 0,
        unpaid: 30000,
        invoiceCount: 1,
      };
      expect(verifyInvariant(summary)).toBe(true);
    });

    it('should return true for zero amounts', () => {
      const summary: RevenueSummary = {
        total: 0,
        paid: 0,
        unpaid: 0,
        invoiceCount: 0,
      };
      expect(verifyInvariant(summary)).toBe(true);
    });

    it('should return false when total !== paid + unpaid', () => {
      const summary: RevenueSummary = {
        total: 30000,
        paid: 15000,
        unpaid: 10000, // Should be 15000
        invoiceCount: 2,
      };
      expect(verifyInvariant(summary)).toBe(false);
    });
  });

  // === calculateRevenueSummary ===

  describe('calculateRevenueSummary', () => {
    describe('basic calculations', () => {
      it('should calculate correct total for single invoice', () => {
        // Default: unitPrice=10000, qty=1, taxRate=10 => total = 11000
        const invoices: Document[] = [createSentInvoice('2026-01-10')];
        const result = calculateRevenueSummary(invoices);

        expect(result.total).toBe(11000);
        expect(result.unpaid).toBe(11000);
        expect(result.paid).toBe(0);
        expect(result.invoiceCount).toBe(1);
      });

      it('should calculate correct total for multiple invoices', () => {
        const invoices: Document[] = [
          createSentInvoice('2026-01-10', 10000), // 11000
          createSentInvoice('2026-01-15', 20000), // 22000
        ];
        const result = calculateRevenueSummary(invoices);

        expect(result.total).toBe(33000);
        expect(result.invoiceCount).toBe(2);
      });

      it('should separate paid and unpaid correctly', () => {
        const invoices: Document[] = [
          createSentInvoice('2026-01-10', 10000), // unpaid: 11000
          createPaidInvoice('2026-01-15', '2026-01-20', 20000), // paid: 22000
        ];
        const result = calculateRevenueSummary(invoices);

        expect(result.total).toBe(33000);
        expect(result.paid).toBe(22000);
        expect(result.unpaid).toBe(11000);
      });

      it('should return zero for empty array', () => {
        const result = calculateRevenueSummary([]);

        expect(result.total).toBe(0);
        expect(result.paid).toBe(0);
        expect(result.unpaid).toBe(0);
        expect(result.invoiceCount).toBe(0);
      });

      it('should count invoices correctly', () => {
        const invoices: Document[] = [
          createSentInvoice('2026-01-10'),
          createSentInvoice('2026-01-15'),
          createPaidInvoice('2026-01-20', '2026-01-25'),
        ];
        const result = calculateRevenueSummary(invoices);

        expect(result.invoiceCount).toBe(3);
      });
    });

    describe('invariant', () => {
      it('should always satisfy total === paid + unpaid', () => {
        const invoices: Document[] = [
          createSentInvoice('2026-01-10', 10000),
          createPaidInvoice('2026-01-15', '2026-01-20', 20000),
          createSentInvoice('2026-01-25', 15000),
        ];
        const result = calculateRevenueSummary(invoices);

        expect(result.total).toBe(result.paid + result.unpaid);
        expect(verifyInvariant(result)).toBe(true);
      });

      it('should satisfy invariant with all paid invoices', () => {
        const invoices: Document[] = [
          createPaidInvoice('2026-01-10', '2026-01-15', 10000),
          createPaidInvoice('2026-01-15', '2026-01-20', 20000),
        ];
        const result = calculateRevenueSummary(invoices);

        expect(result.total).toBe(result.paid);
        expect(result.unpaid).toBe(0);
        expect(verifyInvariant(result)).toBe(true);
      });

      it('should satisfy invariant with all unpaid invoices', () => {
        const invoices: Document[] = [
          createSentInvoice('2026-01-10', 10000),
          createSentInvoice('2026-01-15', 20000),
        ];
        const result = calculateRevenueSummary(invoices);

        expect(result.total).toBe(result.unpaid);
        expect(result.paid).toBe(0);
        expect(verifyInvariant(result)).toBe(true);
      });

      it('should satisfy invariant with zero amounts', () => {
        const result = calculateRevenueSummary([]);

        expect(result.total).toBe(0);
        expect(result.paid).toBe(0);
        expect(result.unpaid).toBe(0);
        expect(verifyInvariant(result)).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle large amounts without overflow', () => {
        // Large unit price: 99,000,000 => total ~108,900,000
        const invoices: Document[] = [
          createTestInvoice({
            status: 'sent',
            issueDate: '2026-01-10',
            lineItems: [createTestLineItem({ unitPrice: 99000000 })],
          }),
        ];
        const result = calculateRevenueSummary(invoices);

        expect(result.total).toBe(108900000);
        expect(verifyInvariant(result)).toBe(true);
      });

      it('should handle invoices with 0% tax rate', () => {
        const invoices: Document[] = [
          createTestInvoice({
            status: 'sent',
            issueDate: '2026-01-10',
            lineItems: [createTestLineItem({ unitPrice: 10000, taxRate: 0 })],
          }),
        ];
        const result = calculateRevenueSummary(invoices);

        expect(result.total).toBe(10000); // No tax
        expect(verifyInvariant(result)).toBe(true);
      });

      it('should handle invoices with multiple line items', () => {
        const invoices: Document[] = [
          createTestInvoice({
            status: 'sent',
            issueDate: '2026-01-10',
            lineItems: [
              createTestLineItem({ unitPrice: 10000 }), // 11000
              createTestLineItem({ unitPrice: 20000 }), // 22000
            ],
          }),
        ];
        const result = calculateRevenueSummary(invoices);

        expect(result.total).toBe(33000);
        expect(verifyInvariant(result)).toBe(true);
      });

      it('should handle mixed tax rates', () => {
        const invoices: Document[] = [
          createTestInvoice({
            status: 'sent',
            issueDate: '2026-01-10',
            lineItems: [
              createTestLineItem({ unitPrice: 10000, taxRate: 10 }), // 11000
              createTestLineItem({ unitPrice: 10000, taxRate: 0 }),  // 10000
            ],
          }),
        ];
        const result = calculateRevenueSummary(invoices);

        expect(result.total).toBe(21000);
        expect(verifyInvariant(result)).toBe(true);
      });
    });
  });

  // === getRevenueSummary ===

  describe('getRevenueSummary', () => {
    const REFERENCE = '2026-01-15';

    it('should return success result with correct data', async () => {
      const invoices: Document[] = [
        createSentInvoice('2026-01-10', 10000),
        createPaidInvoice('2026-01-12', '2026-01-15', 20000),
      ];

      mockedAsyncStorage.filterDocuments.mockResolvedValue({
        success: true,
        data: invoices,
      });

      const result = await getRevenueSummary('this-month', REFERENCE);

      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(33000);
      expect(result.data?.paid).toBe(22000);
      expect(result.data?.unpaid).toBe(11000);
      expect(result.data?.invoiceCount).toBe(2);
    });

    it('should handle storage errors gracefully', async () => {
      mockedAsyncStorage.filterDocuments.mockResolvedValue({
        success: false,
        error: { code: 'READ_ERROR', message: 'Storage read failed' },
      });

      const result = await getRevenueSummary('this-month', REFERENCE);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('STORAGE_ERROR');
    });

    it('should apply period filter correctly', async () => {
      const invoices: Document[] = [
        createSentInvoice('2026-01-10', 10000), // In range
        createSentInvoice('2025-12-15', 20000), // Out of range
      ];

      mockedAsyncStorage.filterDocuments.mockResolvedValue({
        success: true,
        data: invoices,
      });

      const result = await getRevenueSummary('this-month', REFERENCE);

      expect(result.success).toBe(true);
      expect(result.data?.invoiceCount).toBe(1);
      expect(result.data?.total).toBe(11000);
    });

    it('should work with empty storage', async () => {
      mockedAsyncStorage.filterDocuments.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await getRevenueSummary('this-month', REFERENCE);

      expect(result.success).toBe(true);
      expect(result.data?.total).toBe(0);
      expect(result.data?.paid).toBe(0);
      expect(result.data?.unpaid).toBe(0);
      expect(result.data?.invoiceCount).toBe(0);
    });

    it('should filter by invoice type and sent/paid status', async () => {
      // Mock returns various documents; service should filter to only sent/paid invoices
      mockedAsyncStorage.filterDocuments.mockResolvedValue({
        success: true,
        data: [
          createSentInvoice('2026-01-10', 10000),
          createDraftInvoice('2026-01-11'),
          createTestEstimate({ issueDate: '2026-01-12' }),
        ],
      });

      const result = await getRevenueSummary('this-month', REFERENCE);

      expect(result.success).toBe(true);
      expect(result.data?.invoiceCount).toBe(1);
      expect(result.data?.total).toBe(11000);
    });

    it('should call filterDocuments with correct filter', async () => {
      mockedAsyncStorage.filterDocuments.mockResolvedValue({
        success: true,
        data: [],
      });

      await getRevenueSummary('this-month', REFERENCE);

      expect(mockedAsyncStorage.filterDocuments).toHaveBeenCalledWith(
        { type: 'invoice', status: ['sent', 'paid'] },
        undefined
      );
    });
  });
});
