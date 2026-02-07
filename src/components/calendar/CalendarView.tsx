/**
 * CalendarView
 *
 * Main calendar screen composing CalendarMonthView, CalendarDayEvents,
 * CalendarEventEditModal, and a FAB for creating new events.
 */

import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCalendar } from '@/hooks/useCalendar';
import { useCalendarEventEdit } from '@/hooks/useCalendarEventEdit';
import CalendarMonthView from './CalendarMonthView';
import CalendarDayEvents from './CalendarDayEvents';
import CalendarEventEditModal from './CalendarEventEditModal';
import type { CalendarDisplayEvent, CalendarEvent } from '@/types/calendarEvent';

const CalendarView: React.FC = () => {
  const calendar = useCalendar();
  const edit = useCalendarEventEdit(calendar.refresh);

  const handleDayPress = useCallback(
    (date: string) => {
      calendar.selectDate(date);
    },
    [calendar.selectDate]
  );

  const handleMonthChange = useCallback(
    (year: number, month: number) => {
      // Sync with hook state when user swipes month in Calendar component
      if (year !== calendar.currentYear || month !== calendar.currentMonth) {
        calendar.goToMonth(year, month);
      }
    },
    [calendar.currentYear, calendar.currentMonth, calendar.goToMonth]
  );

  const handleEventPress = useCallback(
    (event: CalendarDisplayEvent) => {
      if (event.kind === 'user') {
        // Cast to CalendarEvent for editing
        const { kind: _, ...calendarEvent } = event;
        edit.startEdit(calendarEvent as CalendarEvent);
      }
      // Virtual events: future enhancement — navigate to source document
    },
    [edit.startEdit]
  );

  const handleFabPress = useCallback(() => {
    edit.startCreate(calendar.selectedDate ?? undefined);
  }, [edit.startCreate, calendar.selectedDate]);

  if (calendar.isLoading && calendar.events.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {calendar.error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{calendar.error}</Text>
        </View>
      )}

      <CalendarMonthView
        year={calendar.currentYear}
        month={calendar.currentMonth}
        markedDates={calendar.markedDates}
        onDayPress={handleDayPress}
        onMonthChange={handleMonthChange}
      />

      <View style={styles.dayEventsContainer}>
        {calendar.selectedDate && (
          <Text style={styles.selectedDateLabel}>{calendar.selectedDate}</Text>
        )}
        <CalendarDayEvents
          date={calendar.selectedDate}
          events={calendar.selectedDateEvents}
          onEventPress={handleEventPress}
        />
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleFabPress}
        accessibilityRole="button"
        accessibilityLabel="予定を追加"
        testID="calendar-add-fab"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Edit Modal */}
      <CalendarEventEditModal
        visible={edit.isVisible}
        isEditing={edit.isEditing}
        isSaving={edit.isSaving}
        values={edit.values}
        errors={edit.errors}
        onUpdateField={edit.updateField}
        onSave={edit.save}
        onDelete={edit.isEditing ? edit.handleDelete : undefined}
        onClose={edit.close}
      />
    </View>
  );
};

CalendarView.displayName = 'CalendarView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  errorBanner: {
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
  },
  dayEventsContainer: {
    flex: 1,
  },
  selectedDateLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3C3C43',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default CalendarView;
