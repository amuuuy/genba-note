/**
 * ChartPeriodSelector Component
 *
 * Horizontal button group for selecting chart time period.
 * Options: 7日間 (daily), 4週間 (weekly), 6ヶ月 (monthly)
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { ChartPeriod } from '@/domain/finance';

export interface ChartPeriodSelectorProps {
  /** Currently selected period */
  selectedPeriod: ChartPeriod;
  /** Callback when period changes */
  onPeriodChange: (period: ChartPeriod) => void;
  /** Test ID for testing */
  testID?: string;
}

/** Period options with labels */
const PERIOD_OPTIONS: Array<{ value: ChartPeriod; label: string }> = [
  { value: 'daily', label: '7日間' },
  { value: 'weekly', label: '4週間' },
  { value: 'monthly', label: '6ヶ月' },
];

/** iOS blue color */
const ACTIVE_COLOR = '#007AFF';
/** Inactive gray */
const INACTIVE_COLOR = '#8E8E93';

/**
 * Period selector component
 */
export const ChartPeriodSelector: React.FC<ChartPeriodSelectorProps> = memo(
  ({ selectedPeriod, onPeriodChange, testID }) => {
    return (
      <View style={styles.container} testID={testID}>
        {PERIOD_OPTIONS.map((option) => {
          const isSelected = selectedPeriod === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.button, isSelected && styles.buttonSelected]}
              onPress={() => onPeriodChange(option.value)}
              accessibilityLabel={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              testID={testID ? `${testID}-${option.value}` : undefined}
            >
              <Text
                style={[styles.buttonText, isSelected && styles.buttonTextSelected]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }
);

ChartPeriodSelector.displayName = 'ChartPeriodSelector';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    minWidth: 70,
    alignItems: 'center',
  },
  buttonSelected: {
    backgroundColor: ACTIVE_COLOR,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: INACTIVE_COLOR,
  },
  buttonTextSelected: {
    color: '#fff',
  },
});
