/**
 * CalendarDayEvents
 *
 * FlatList of events for the selected date.
 * Shows "予定なし" empty state when no events exist.
 */

import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import CalendarEventCard from './CalendarEventCard';
import type { CalendarDisplayEvent } from '@/types/calendarEvent';

interface CalendarDayEventsProps {
  date: string | null;
  events: CalendarDisplayEvent[];
  onEventPress: (event: CalendarDisplayEvent) => void;
}

const CalendarDayEvents: React.FC<CalendarDayEventsProps> = ({
  date,
  events,
  onEventPress,
}) => {
  if (!date) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>日付を選択してください</Text>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>予定なし</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <CalendarEventCard event={item} onPress={onEventPress} />
      )}
      contentContainerStyle={styles.listContent}
      testID="calendar-day-events-list"
    />
  );
};

CalendarDayEvents.displayName = 'CalendarDayEvents';

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  listContent: {
    paddingVertical: 8,
  },
});

export default CalendarDayEvents;
