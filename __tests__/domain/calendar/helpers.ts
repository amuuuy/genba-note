/**
 * Test helpers for calendar domain tests
 */

import type { CalendarEvent, VirtualCalendarEvent } from '@/types/calendarEvent';

/**
 * Create a test CalendarEvent with sensible defaults.
 * All fields can be overridden via the overrides parameter.
 */
export function createTestCalendarEvent(
  overrides?: Partial<CalendarEvent>
): CalendarEvent {
  const now = Date.now();
  return {
    id: `evt-${now}-${Math.random().toString(36).substr(2, 9)}`,
    title: 'テストイベント',
    date: '2026-02-15',
    startTime: null,
    endTime: null,
    type: 'schedule',
    color: '#007AFF',
    customerId: null,
    note: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a test VirtualCalendarEvent with sensible defaults.
 */
export function createTestVirtualEvent(
  overrides?: Partial<VirtualCalendarEvent>
): VirtualCalendarEvent {
  return {
    id: 'doc-123-due',
    title: '支払期限: INV-001',
    date: '2026-02-28',
    startTime: null,
    endTime: null,
    kind: 'virtual',
    source: 'invoice_due',
    color: '#FF9500',
    sourceDocumentId: 'doc-123',
    ...overrides,
  };
}
