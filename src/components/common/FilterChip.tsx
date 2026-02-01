/**
 * FilterChip Component
 *
 * A selectable chip for filtering content.
 */

import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';

export interface FilterChipProps {
  /** Chip label */
  label: string;
  /** Whether the chip is selected */
  selected: boolean;
  /** Callback when chip is pressed */
  onPress: () => void;
  /** Optional style override */
  style?: ViewStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Selectable filter chip
 */
export const FilterChip: React.FC<FilterChipProps> = React.memo(
  ({ label, selected, onPress, style, testID }) => {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.chip,
          selected && styles.chipSelected,
          pressed && styles.chipPressed,
          style,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`フィルター: ${label}`}
        testID={testID}
      >
        <Text style={[styles.label, selected && styles.labelSelected]}>
          {label}
        </Text>
      </Pressable>
    );
  }
);

FilterChip.displayName = 'FilterChip';

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: '#007AFF',
  },
  chipPressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  labelSelected: {
    color: '#fff',
  },
});
