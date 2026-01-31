/**
 * FilterChipGroup Component
 *
 * A horizontal scrollable container for filter chips.
 */

import React from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import { FilterChip } from './FilterChip';

export interface FilterOption<T extends string> {
  /** Option value */
  value: T;
  /** Display label */
  label: string;
}

export interface FilterChipGroupProps<T extends string> {
  /** Group label */
  label?: string;
  /** Available options */
  options: FilterOption<T>[];
  /** Currently selected value */
  selectedValue: T;
  /** Callback when selection changes */
  onSelect: (value: T) => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Horizontal scrollable filter chip group
 */
export function FilterChipGroup<T extends string>({
  label,
  options,
  selectedValue,
  onSelect,
  testID,
}: FilterChipGroupProps<T>): React.ReactElement {
  return (
    <View style={styles.container} testID={testID}>
      {label && <Text style={styles.label}>{label}</Text>}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {options.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            selected={option.value === selectedValue}
            onPress={() => onSelect(option.value)}
            testID={testID ? `${testID}-${option.value}` : undefined}
          />
        ))}
      </ScrollView>
    </View>
  );
}

FilterChipGroup.displayName = 'FilterChipGroup';

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 6,
    marginLeft: 4,
  },
  scrollContent: {
    paddingRight: 16,
  },
});
