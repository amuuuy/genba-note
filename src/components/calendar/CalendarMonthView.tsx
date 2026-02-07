/**
 * CalendarMonthView
 *
 * Wrapper around react-native-calendars Calendar component.
 * Displays month grid with multi-dot markers for events.
 */

import React from 'react';
import { Calendar } from 'react-native-calendars';
import type { MarkedDateData } from '@/hooks/useCalendar';

interface CalendarMonthViewProps {
  year: number;
  month: number;
  markedDates: Record<string, MarkedDateData>;
  onDayPress: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
}

const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  year,
  month,
  markedDates,
  onDayPress,
  onMonthChange,
}) => {
  const currentDateString = `${year}-${String(month).padStart(2, '0')}-01`;

  return (
    <Calendar
      key={currentDateString}
      current={currentDateString}
      markingType="multi-dot"
      markedDates={markedDates}
      hideExtraDays
      onDayPress={(day) => onDayPress(day.dateString)}
      onMonthChange={(monthData) =>
        onMonthChange(monthData.year, monthData.month)
      }
      theme={{
        todayTextColor: '#007AFF',
        selectedDayBackgroundColor: '#007AFF',
        selectedDayTextColor: '#FFFFFF',
        arrowColor: '#007AFF',
        monthTextColor: '#000000',
        textDayFontSize: 16,
        textMonthFontSize: 16,
        textDayHeaderFontSize: 14,
      }}
      testID="calendar-month-view"
    />
  );
};

CalendarMonthView.displayName = 'CalendarMonthView';

export default CalendarMonthView;
