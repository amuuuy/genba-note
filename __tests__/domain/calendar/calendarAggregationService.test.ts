/**
 * Tests for calendarAggregationService
 *
 * TDD approach: Write tests first, then implement to make them pass.
 *
 * Tests the aggregateEvents() pure function:
 * - Merges user CalendarEvents + virtual events from documents/work logs
 * - Filters by month range
 * - Assigns correct colors per virtual event source
 */

import { aggregateEvents, VIRTUAL_EVENT_COLORS } from '@/domain/calendar/calendarAggregationService';
import type { CalendarEvent, CalendarDisplayEvent } from '@/types/calendarEvent';
import type { Document } from '@/types/document';
import type { WorkLogEntry } from '@/types/workLogEntry';
import { createTestCalendarEvent } from './helpers';
import { createTestDocument, createTestInvoice } from '../../domain/document/helpers';

describe('calendarAggregationService', () => {
  describe('VIRTUAL_EVENT_COLORS', () => {
    it('should define colors for all virtual event sources', () => {
      expect(VIRTUAL_EVENT_COLORS.INVOICE_DUE).toBe('#FF9500');
      expect(VIRTUAL_EVENT_COLORS.ESTIMATE_VALID_UNTIL).toBe('#8E8E93');
      expect(VIRTUAL_EVENT_COLORS.WORK_LOG).toBe('#AF52DE');
    });
  });

  describe('aggregateEvents', () => {
    const emptyDocs: Document[] = [];
    const emptyLogs: WorkLogEntry[] = [];
    const emptyEvents: CalendarEvent[] = [];

    it('should return empty array when all inputs are empty', () => {
      const result = aggregateEvents(emptyEvents, emptyDocs, emptyLogs, '2026-02');
      expect(result).toEqual([]);
    });

    describe('user events', () => {
      it('should include user events with kind: "user"', () => {
        const events = [
          createTestCalendarEvent({
            id: 'evt-001',
            title: '打ち合わせ',
            date: '2026-02-15',
          }),
        ];

        const result = aggregateEvents(events, emptyDocs, emptyLogs, '2026-02');

        expect(result).toHaveLength(1);
        expect(result[0].kind).toBe('user');
        expect(result[0].title).toBe('打ち合わせ');
      });

      it('should filter out user events outside the month', () => {
        const events = [
          createTestCalendarEvent({ date: '2026-02-15' }),
          createTestCalendarEvent({ date: '2026-03-01' }),
        ];

        const result = aggregateEvents(events, emptyDocs, emptyLogs, '2026-02');

        expect(result).toHaveLength(1);
        expect(result[0].date).toBe('2026-02-15');
      });
    });

    describe('invoice due date virtual events', () => {
      it('should generate orange virtual event for invoice with dueDate', () => {
        const invoice = createTestInvoice({
          id: 'inv-001',
          documentNo: 'INV-001',
          dueDate: '2026-02-28',
        });

        const result = aggregateEvents(emptyEvents, [invoice], emptyLogs, '2026-02');

        expect(result).toHaveLength(1);
        const event = result[0];
        expect(event.kind).toBe('virtual');
        expect(event.date).toBe('2026-02-28');
        expect(event.color).toBe('#FF9500');
        expect(event.title).toBe('支払期限: INV-001');
        if (event.kind === 'virtual') {
          expect(event.source).toBe('invoice_due');
          expect(event.id).toBe('inv-001-due');
          expect(event.sourceDocumentId).toBe('inv-001');
        }
      });

      it('should NOT generate virtual event for invoice with null dueDate', () => {
        const invoice = createTestInvoice({
          id: 'inv-002',
          dueDate: null,
        });

        const result = aggregateEvents(emptyEvents, [invoice], emptyLogs, '2026-02');

        expect(result).toHaveLength(0);
      });

      it('should filter out invoice dueDate outside the month', () => {
        const invoice = createTestInvoice({
          dueDate: '2026-03-15',
        });

        const result = aggregateEvents(emptyEvents, [invoice], emptyLogs, '2026-02');

        expect(result).toHaveLength(0);
      });
    });

    describe('estimate validUntil virtual events', () => {
      it('should generate gray virtual event for estimate with validUntil', () => {
        const estimate = createTestDocument({
          id: 'est-001',
          documentNo: 'EST-001',
          type: 'estimate',
          validUntil: '2026-02-20',
        });

        const result = aggregateEvents(emptyEvents, [estimate], emptyLogs, '2026-02');

        expect(result).toHaveLength(1);
        const event = result[0];
        expect(event.kind).toBe('virtual');
        expect(event.date).toBe('2026-02-20');
        expect(event.color).toBe('#8E8E93');
        expect(event.title).toBe('有効期限: EST-001');
        if (event.kind === 'virtual') {
          expect(event.source).toBe('estimate_valid_until');
          expect(event.id).toBe('est-001-valid');
          expect(event.sourceDocumentId).toBe('est-001');
        }
      });

      it('should NOT generate virtual event for estimate with null validUntil', () => {
        const estimate = createTestDocument({
          id: 'est-002',
          type: 'estimate',
          validUntil: null,
        });

        const result = aggregateEvents(emptyEvents, [estimate], emptyLogs, '2026-02');

        expect(result).toHaveLength(0);
      });
    });

    describe('work log virtual events', () => {
      it('should generate purple virtual event for work log entry', () => {
        const workLog: WorkLogEntry = {
          id: 'wl-001',
          customerId: 'cust-001',
          workDate: '2026-02-10',
          note: '外壁工事',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const result = aggregateEvents(emptyEvents, emptyDocs, [workLog], '2026-02');

        expect(result).toHaveLength(1);
        const event = result[0];
        expect(event.kind).toBe('virtual');
        expect(event.date).toBe('2026-02-10');
        expect(event.color).toBe('#AF52DE');
        if (event.kind === 'virtual') {
          expect(event.source).toBe('work_log');
          expect(event.id).toBe('wl-001-worklog');
          expect(event.sourceDocumentId).toBe('wl-001');
        }
      });

      it('should filter out work logs outside the month', () => {
        const workLog: WorkLogEntry = {
          id: 'wl-002',
          customerId: 'cust-001',
          workDate: '2026-01-31',
          note: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const result = aggregateEvents(emptyEvents, emptyDocs, [workLog], '2026-02');

        expect(result).toHaveLength(0);
      });
    });

    describe('mixed events', () => {
      it('should merge all event types for the given month', () => {
        const calendarEvents = [
          createTestCalendarEvent({ date: '2026-02-01' }),
        ];
        const docs: Document[] = [
          createTestInvoice({ id: 'inv-010', documentNo: 'INV-010', dueDate: '2026-02-15' }),
          createTestDocument({ id: 'est-010', documentNo: 'EST-010', type: 'estimate', validUntil: '2026-02-20' }),
        ];
        const workLogs: WorkLogEntry[] = [
          {
            id: 'wl-010',
            customerId: 'cust-001',
            workDate: '2026-02-05',
            note: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ];

        const result = aggregateEvents(calendarEvents, docs, workLogs, '2026-02');

        expect(result).toHaveLength(4);
        const kinds = result.map((e) => e.kind);
        expect(kinds).toContain('user');
        expect(kinds).toContain('virtual');
      });

      it('should sort all events by date', () => {
        const calendarEvents = [
          createTestCalendarEvent({ date: '2026-02-20' }),
        ];
        const docs: Document[] = [
          createTestInvoice({ id: 'inv-020', dueDate: '2026-02-05' }),
        ];
        const workLogs: WorkLogEntry[] = [
          {
            id: 'wl-020',
            customerId: 'cust-001',
            workDate: '2026-02-10',
            note: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ];

        const result = aggregateEvents(calendarEvents, docs, workLogs, '2026-02');

        expect(result).toHaveLength(3);
        expect(result[0].date).toBe('2026-02-05');
        expect(result[1].date).toBe('2026-02-10');
        expect(result[2].date).toBe('2026-02-20');
      });
    });
  });
});
