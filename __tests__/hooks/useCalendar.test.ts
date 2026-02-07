/**
 * Tests for useCalendar — fetchAndAggregateEvents
 *
 * Tests the fail-closed data loading logic:
 * - All sources succeed → events populated, no error
 * - Any source fails → events empty, error set with source names
 *
 * Note: renderHook unavailable in this project (testEnvironment: 'node').
 * We test the exported fetchAndAggregateEvents function directly.
 */

import { fetchAndAggregateEvents } from '@/hooks/useCalendar';
import { createTestCalendarEvent } from '../domain/calendar/helpers';

// Mock expo-router (contains JSX that Jest can't parse)
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
}));

// Mock dependencies
jest.mock('@/domain/calendar/calendarService', () => ({
  getCalendarEvents: jest.fn(),
}));

jest.mock('@/storage/asyncStorageService', () => ({
  getAllDocuments: jest.fn(),
}));

jest.mock('@/domain/customer/workLogEntryService', () => ({
  getAllWorkLogEntries: jest.fn(),
}));

jest.mock('@/domain/calendar/calendarAggregationService', () => ({
  aggregateEvents: jest.fn(() => []),
}));

const { getCalendarEvents } = jest.mocked(
  require('@/domain/calendar/calendarService')
);
const { getAllDocuments } = jest.mocked(
  require('@/storage/asyncStorageService')
);
const { getAllWorkLogEntries } = jest.mocked(
  require('@/domain/customer/workLogEntryService')
);
const { aggregateEvents } = jest.mocked(
  require('@/domain/calendar/calendarAggregationService')
);

describe('fetchAndAggregateEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return aggregated events when all sources succeed', async () => {
    const mockEvents = [createTestCalendarEvent({ date: '2026-02-15' })];
    const mockAggregated = [{ ...mockEvents[0], kind: 'user' as const }];
    getCalendarEvents.mockResolvedValue({ success: true, data: mockEvents });
    getAllDocuments.mockResolvedValue({ success: true, data: [] });
    getAllWorkLogEntries.mockResolvedValue({ success: true, data: [] });
    aggregateEvents.mockReturnValue(mockAggregated);

    const result = await fetchAndAggregateEvents('2026-02');

    expect(result.error).toBeNull();
    expect(result.events).toEqual(mockAggregated);
    expect(result.events[0].kind).toBe('user');
    expect(aggregateEvents).toHaveBeenCalledWith(mockEvents, [], [], '2026-02');
  });

  it('should return empty events and error when calendar source fails', async () => {
    getCalendarEvents.mockResolvedValue({
      success: false,
      error: { code: 'READ_ERROR', message: 'fail' },
    });
    getAllDocuments.mockResolvedValue({ success: true, data: [] });
    getAllWorkLogEntries.mockResolvedValue({ success: true, data: [] });

    const result = await fetchAndAggregateEvents('2026-02');

    expect(result.events).toEqual([]);
    expect(result.error).toContain('カレンダー');
    expect(result.error).not.toContain('書類');
  });

  it('should return empty events and error when documents source fails', async () => {
    getCalendarEvents.mockResolvedValue({ success: true, data: [] });
    getAllDocuments.mockResolvedValue({
      success: false,
      error: { code: 'READ_ERROR', message: 'fail' },
    });
    getAllWorkLogEntries.mockResolvedValue({ success: true, data: [] });

    const result = await fetchAndAggregateEvents('2026-02');

    expect(result.events).toEqual([]);
    expect(result.error).toContain('書類');
  });

  it('should return empty events and error when work logs source fails', async () => {
    getCalendarEvents.mockResolvedValue({ success: true, data: [] });
    getAllDocuments.mockResolvedValue({ success: true, data: [] });
    getAllWorkLogEntries.mockResolvedValue({
      success: false,
      error: { code: 'STORAGE_ERROR', message: 'fail' },
    });

    const result = await fetchAndAggregateEvents('2026-02');

    expect(result.events).toEqual([]);
    expect(result.error).toContain('作業ログ');
  });

  it('should list all failed sources in error message', async () => {
    getCalendarEvents.mockResolvedValue({
      success: false,
      error: { code: 'READ_ERROR', message: 'fail' },
    });
    getAllDocuments.mockResolvedValue({
      success: false,
      error: { code: 'READ_ERROR', message: 'fail' },
    });
    getAllWorkLogEntries.mockResolvedValue({
      success: false,
      error: { code: 'STORAGE_ERROR', message: 'fail' },
    });

    const result = await fetchAndAggregateEvents('2026-02');

    expect(result.events).toEqual([]);
    expect(result.error).toContain('カレンダー');
    expect(result.error).toContain('書類');
    expect(result.error).toContain('作業ログ');
  });

  it('should not call aggregateEvents when any source fails', async () => {
    getCalendarEvents.mockResolvedValue({
      success: false,
      error: { code: 'READ_ERROR', message: 'fail' },
    });
    getAllDocuments.mockResolvedValue({ success: true, data: [] });
    getAllWorkLogEntries.mockResolvedValue({ success: true, data: [] });

    await fetchAndAggregateEvents('2026-02');

    expect(aggregateEvents).not.toHaveBeenCalled();
  });
});
