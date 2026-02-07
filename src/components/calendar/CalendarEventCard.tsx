/**
 * CalendarEventCard
 *
 * Renders a single calendar event with color bar, title, time, and type.
 * Virtual events show source indicator; user events show type icon.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { CalendarDisplayEvent } from '@/types/calendarEvent';

interface CalendarEventCardProps {
  event: CalendarDisplayEvent;
  onPress: (event: CalendarDisplayEvent) => void;
}

const CalendarEventCard: React.FC<CalendarEventCardProps> = ({
  event,
  onPress,
}) => {
  const isVirtual = event.kind === 'virtual';

  const getIconName = (): keyof typeof Ionicons.glyphMap => {
    if (isVirtual) {
      if (event.source === 'invoice_due') return 'document-text-outline';
      if (event.source === 'estimate_valid_until') return 'document-outline';
      return 'camera-outline';
    }
    return event.type === 'appointment' ? 'people-outline' : 'calendar-outline';
  };

  const getTimeText = (): string => {
    if (event.startTime && event.endTime) {
      return `${event.startTime} - ${event.endTime}`;
    }
    if (event.startTime) {
      return event.startTime;
    }
    return '終日';
  };

  return (
    <TouchableOpacity
      style={[styles.container, isVirtual && styles.virtualContainer]}
      onPress={() => onPress(event)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${event.title} ${getTimeText()}`}
      testID={`calendar-event-card-${event.id}`}
    >
      <View style={[styles.colorBar, { backgroundColor: event.color }]} />
      <View style={styles.content}>
        <Text style={[styles.title, isVirtual && styles.virtualText]} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={styles.time}>{getTimeText()}</Text>
      </View>
      <Ionicons
        name={getIconName()}
        size={18}
        color={isVirtual ? '#8E8E93' : '#007AFF'}
        style={styles.icon}
      />
    </TouchableOpacity>
  );
};

CalendarEventCard.displayName = 'CalendarEventCard';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 4,
    paddingVertical: 12,
    paddingRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  virtualContainer: {
    opacity: 0.85,
  },
  colorBar: {
    width: 4,
    height: '100%',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    minHeight: 44,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  virtualText: {
    color: '#3C3C43',
  },
  time: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  icon: {
    marginLeft: 8,
  },
});

export default CalendarEventCard;
