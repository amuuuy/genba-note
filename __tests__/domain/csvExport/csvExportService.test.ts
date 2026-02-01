/**
 * CSV Export Service Tests
 *
 * Tests for filtering invoices and converting to CSV format.
 */

import {
  filterInvoicesForExport,
  documentToCsvRow,
  documentsToCsvRows,
  generateCsvFromDocuments,
} from '@/domain/csvExport/csvExportService';
import { UTF8_BOM, type CsvInvoiceRow } from '@/domain/csvExport/types';
import {
  createTestInvoice,
  createTestEstimate,
  createPaidInvoice,
  createSentInvoice,
  createDraftInvoice,
  createTestLineItem,
  createInvoicesForExport,
} from './helpers';

// Reference date for period tests
const REFERENCE_DATE = '2026-01-15';

describe('csvExportService', () => {
  describe('filterInvoicesForExport', () => {
    describe('type filtering', () => {
      it('should exclude estimates', () => {
        const docs = [
          createTestInvoice({ issueDate: '2026-01-10' }),
          createTestEstimate({ issueDate: '2026-01-10' }),
        ];
        const result = filterInvoicesForExport(docs, 'this-month', REFERENCE_DATE);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('invoice');
      });

      it('should include only invoices', () => {
        const docs = [
          createTestEstimate({ issueDate: '2026-01-10' }),
          createTestEstimate({ issueDate: '2026-01-12' }),
        ];
        const result = filterInvoicesForExport(docs, 'this-month', REFERENCE_DATE);

        expect(result).toHaveLength(0);
      });
    });

    describe('status filtering', () => {
      it('should include sent invoices', () => {
        const docs = [createSentInvoice('2026-01-10')];
        const result = filterInvoicesForExport(docs, 'this-month', REFERENCE_DATE);

        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('sent');
      });

      it('should include paid invoices', () => {
        const docs = [createPaidInvoice('2026-01-10', '2026-01-15')];
        const result = filterInvoicesForExport(docs, 'this-month', REFERENCE_DATE);

        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('paid');
      });

      it('should exclude draft invoices', () => {
        const docs = [createDraftInvoice('2026-01-10')];
        const result = filterInvoicesForExport(docs, 'this-month', REFERENCE_DATE);

        expect(result).toHaveLength(0);
      });

      it('should filter mixed statuses correctly', () => {
        const docs = createInvoicesForExport({
          sentCount: 2,
          paidCount: 3,
          draftCount: 4,
          baseIssueDate: '2026-01-10',
        });
        const result = filterInvoicesForExport(docs, 'this-month', REFERENCE_DATE);

        expect(result).toHaveLength(5); // 2 sent + 3 paid
      });
    });

    describe('period filtering', () => {
      it('should include invoices within this-month', () => {
        const docs = [
          createSentInvoice('2026-01-01'),
          createSentInvoice('2026-01-15'),
          createSentInvoice('2026-01-31'),
        ];
        const result = filterInvoicesForExport(docs, 'this-month', REFERENCE_DATE);

        expect(result).toHaveLength(3);
      });

      it('should exclude invoices outside this-month', () => {
        const docs = [
          createSentInvoice('2025-12-31'), // previous month
          createSentInvoice('2026-02-01'), // next month
        ];
        const result = filterInvoicesForExport(docs, 'this-month', REFERENCE_DATE);

        expect(result).toHaveLength(0);
      });

      it('should filter by issueDate not paidAt', () => {
        // Invoice with issueDate in December but paidAt in January
        const doc = createPaidInvoice('2025-12-15', '2026-01-10');
        const result = filterInvoicesForExport([doc], 'this-month', REFERENCE_DATE);

        expect(result).toHaveLength(0); // Should be excluded based on issueDate
      });

      it('should work with last-3-months period', () => {
        // Reference: 2026-01-15 -> last 3 months = Nov, Dec, Jan
        const docs = [
          createSentInvoice('2025-10-15'), // October - outside
          createSentInvoice('2025-11-01'), // November - inside
          createSentInvoice('2025-12-15'), // December - inside
          createSentInvoice('2026-01-10'), // January - inside
          createSentInvoice('2026-02-01'), // February - outside
        ];
        const result = filterInvoicesForExport(docs, 'last-3-months', REFERENCE_DATE);

        expect(result).toHaveLength(3);
      });

      it('should work with this-year period', () => {
        const docs = [
          createSentInvoice('2025-12-31'), // Previous year - outside
          createSentInvoice('2026-01-01'), // This year - inside
          createSentInvoice('2026-06-15'), // This year - inside
          createSentInvoice('2026-12-31'), // This year - inside
          createSentInvoice('2027-01-01'), // Next year - outside
        ];
        const result = filterInvoicesForExport(docs, 'this-year', REFERENCE_DATE);

        expect(result).toHaveLength(3);
      });
    });

    describe('edge cases', () => {
      it('should handle empty array', () => {
        const result = filterInvoicesForExport([], 'this-month', REFERENCE_DATE);
        expect(result).toHaveLength(0);
      });

      it('should handle all excluded (no matches)', () => {
        const docs = [
          createDraftInvoice('2026-01-10'),
          createTestEstimate({ issueDate: '2026-01-10' }),
        ];
        const result = filterInvoicesForExport(docs, 'this-month', REFERENCE_DATE);

        expect(result).toHaveLength(0);
      });

      it('should combine type, status, and period filters', () => {
        const docs = [
          createSentInvoice('2026-01-10'), // ✓ invoice, sent, in period
          createDraftInvoice('2026-01-10'), // ✗ draft
          createTestEstimate({ issueDate: '2026-01-10' }), // ✗ estimate
          createSentInvoice('2025-12-10'), // ✗ outside period
        ];
        const result = filterInvoicesForExport(docs, 'this-month', REFERENCE_DATE);

        expect(result).toHaveLength(1);
      });
    });
  });

  describe('documentToCsvRow', () => {
    it('should map all fields correctly', () => {
      const doc = createTestInvoice({
        documentNo: 'INV-123',
        issueDate: '2026-01-15',
        dueDate: '2026-02-15',
        paidAt: null,
        clientName: 'Test Corp',
        subject: 'Test Project',
        status: 'sent',
        lineItems: [createTestLineItem({ quantityMilli: 1000, unitPrice: 10000, taxRate: 10 })],
      });

      const row = documentToCsvRow(doc);

      expect(row.documentNo).toBe('INV-123');
      expect(row.issueDate).toBe('2026-01-15');
      expect(row.dueDate).toBe('2026-02-15');
      expect(row.paidAt).toBe('');
      expect(row.clientName).toBe('Test Corp');
      expect(row.subject).toBe('Test Project');
      expect(row.status).toBe('sent');
    });

    it('should calculate totals correctly', () => {
      const doc = createTestInvoice({
        lineItems: [
          createTestLineItem({ quantityMilli: 2000, unitPrice: 5000, taxRate: 10 }), // subtotal: 10000, tax: 1000
        ],
      });

      const row = documentToCsvRow(doc);

      expect(row.subtotalYen).toBe(10000);
      expect(row.taxYen).toBe(1000);
      expect(row.totalYen).toBe(11000);
    });

    it('should handle multiple line items', () => {
      const doc = createTestInvoice({
        lineItems: [
          createTestLineItem({ quantityMilli: 1000, unitPrice: 10000, taxRate: 10 }), // 10000 + 1000
          createTestLineItem({ quantityMilli: 2000, unitPrice: 5000, taxRate: 10 }), // 10000 + 1000
        ],
      });

      const row = documentToCsvRow(doc);

      expect(row.subtotalYen).toBe(20000);
      expect(row.taxYen).toBe(2000);
      expect(row.totalYen).toBe(22000);
    });

    it('should handle null dueDate as empty string', () => {
      const doc = createTestInvoice({ dueDate: null });
      const row = documentToCsvRow(doc);

      expect(row.dueDate).toBe('');
    });

    it('should handle null paidAt as empty string', () => {
      const doc = createTestInvoice({ paidAt: null });
      const row = documentToCsvRow(doc);

      expect(row.paidAt).toBe('');
    });

    it('should handle null subject as empty string', () => {
      const doc = createTestInvoice({ subject: null });
      const row = documentToCsvRow(doc);

      expect(row.subject).toBe('');
    });

    it('should include paidAt for paid invoices', () => {
      const doc = createPaidInvoice('2026-01-10', '2026-01-20');
      const row = documentToCsvRow(doc);

      expect(row.paidAt).toBe('2026-01-20');
      expect(row.status).toBe('paid');
    });

    it('should handle tax-exempt items', () => {
      const doc = createTestInvoice({
        lineItems: [
          createTestLineItem({ quantityMilli: 1000, unitPrice: 10000, taxRate: 0 }),
        ],
      });

      const row = documentToCsvRow(doc);

      expect(row.subtotalYen).toBe(10000);
      expect(row.taxYen).toBe(0);
      expect(row.totalYen).toBe(10000);
    });
  });

  describe('documentsToCsvRows', () => {
    it('should convert multiple documents', () => {
      const docs = [
        createTestInvoice({ documentNo: 'INV-001' }),
        createTestInvoice({ documentNo: 'INV-002' }),
        createTestInvoice({ documentNo: 'INV-003' }),
      ];

      const rows = documentsToCsvRows(docs);

      expect(rows).toHaveLength(3);
      expect(rows[0].documentNo).toBe('INV-001');
      expect(rows[1].documentNo).toBe('INV-002');
      expect(rows[2].documentNo).toBe('INV-003');
    });

    it('should handle empty array', () => {
      const rows = documentsToCsvRows([]);
      expect(rows).toHaveLength(0);
    });
  });

  describe('generateCsvFromDocuments', () => {
    it('should filter and convert documents', () => {
      const docs = createInvoicesForExport({
        sentCount: 2,
        paidCount: 1,
        draftCount: 2,
        estimateCount: 1,
        baseIssueDate: '2026-01-10',
      });

      const result = generateCsvFromDocuments(docs, 'this-month', REFERENCE_DATE);

      expect(result.rowCount).toBe(3); // 2 sent + 1 paid
    });

    it('should return CSV content with BOM', () => {
      const docs = [createSentInvoice('2026-01-10')];

      const result = generateCsvFromDocuments(docs, 'this-month', REFERENCE_DATE);

      expect(result.csvContent.startsWith(UTF8_BOM)).toBe(true);
    });

    it('should return rowCount of 0 when no matches', () => {
      const docs = [createDraftInvoice('2026-01-10')];

      const result = generateCsvFromDocuments(docs, 'this-month', REFERENCE_DATE);

      expect(result.rowCount).toBe(0);
    });

    it('should include header row even with no data', () => {
      const docs = [createDraftInvoice('2026-01-10')];

      const result = generateCsvFromDocuments(docs, 'this-month', REFERENCE_DATE);

      expect(result.csvContent).toContain('documentNo');
    });
  });
});
