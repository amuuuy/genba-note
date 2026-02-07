/**
 * Calendar Aggregation Service
 *
 * Merges user-created CalendarEvents with virtual events derived from
 * existing documents (invoice due dates, estimate validity) and work logs.
 *
 * All functions are pure — no side effects or storage access.
 */

import type {
  CalendarEvent,
  CalendarDisplayEvent,
  VirtualCalendarEvent,
} from '@/types/calendarEvent';
import type { Document } from '@/types/document';
import type { WorkLogEntry } from '@/types/workLogEntry';
import { isInMonth } from '@/utils/dateUtils';

/** Color constants for virtual event sources */
export const VIRTUAL_EVENT_COLORS = {
  INVOICE_DUE: '#FF9500',        // orange
  ESTIMATE_VALID_UNTIL: '#8E8E93', // gray
  WORK_LOG: '#AF52DE',           // purple
} as const;

/**
 * Aggregate user events and virtual events for a given month.
 *
 * @param calendarEvents - User-created CalendarEvents
 * @param documents - All documents (invoices and estimates)
 * @param workLogs - All work log entries
 * @param yearMonth - Target month in 'YYYY-MM' format
 * @returns Merged and sorted CalendarDisplayEvent array
 */
export function aggregateEvents(
  calendarEvents: CalendarEvent[],
  documents: Document[],
  workLogs: WorkLogEntry[],
  yearMonth: string
): CalendarDisplayEvent[] {
  const result: CalendarDisplayEvent[] = [];

  // 1. User events (kind: 'user')
  for (const event of calendarEvents) {
    if (isInMonth(event.date, yearMonth)) {
      result.push({ ...event, kind: 'user' });
    }
  }

  // 2. Invoice due date virtual events (orange)
  for (const doc of documents) {
    if (doc.type === 'invoice' && doc.dueDate !== null && isInMonth(doc.dueDate, yearMonth)) {
      const virtualEvent: VirtualCalendarEvent = {
        id: `${doc.id}-due`,
        title: `支払期限: ${doc.documentNo}`,
        date: doc.dueDate,
        startTime: null,
        endTime: null,
        kind: 'virtual',
        source: 'invoice_due',
        color: VIRTUAL_EVENT_COLORS.INVOICE_DUE,
        sourceDocumentId: doc.id,
      };
      result.push(virtualEvent);
    }

    // 3. Estimate validUntil virtual events (gray)
    if (doc.type === 'estimate' && doc.validUntil !== null && isInMonth(doc.validUntil, yearMonth)) {
      const virtualEvent: VirtualCalendarEvent = {
        id: `${doc.id}-valid`,
        title: `有効期限: ${doc.documentNo}`,
        date: doc.validUntil,
        startTime: null,
        endTime: null,
        kind: 'virtual',
        source: 'estimate_valid_until',
        color: VIRTUAL_EVENT_COLORS.ESTIMATE_VALID_UNTIL,
        sourceDocumentId: doc.id,
      };
      result.push(virtualEvent);
    }
  }

  // 4. Work log virtual events (purple)
  for (const log of workLogs) {
    if (isInMonth(log.workDate, yearMonth)) {
      const virtualEvent: VirtualCalendarEvent = {
        id: `${log.id}-worklog`,
        title: `作業ログ: ${log.workDate}`,
        date: log.workDate,
        startTime: null,
        endTime: null,
        kind: 'virtual',
        source: 'work_log',
        color: VIRTUAL_EVENT_COLORS.WORK_LOG,
        sourceDocumentId: log.id,
      };
      result.push(virtualEvent);
    }
  }

  // Sort by date
  result.sort((a, b) => {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    return 0;
  });

  return result;
}
