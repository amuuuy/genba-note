/**
 * AccountTypePicker Component
 *
 * Picker for selecting bank account type (普通/当座).
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export interface AccountTypePickerProps {
  /** Current value */
  value: '普通' | '当座' | '';
  /** Callback when value changes */
  onChange: (value: '普通' | '当座' | '') => void;
  /** Error message */
  error?: string;
  /** Whether picker is disabled */
  disabled?: boolean;
}

const ACCOUNT_TYPES = [
  { value: '', label: '未選択' },
  { value: '普通', label: '普通' },
  { value: '当座', label: '当座' },
] as const;

/**
 * Account type picker with radio-style buttons
 */
export const AccountTypePicker: React.FC<AccountTypePickerProps> = ({
  value,
  onChange,
  error,
  disabled = false,
}) => {
  return (
    <View style={styles.container} testID="account-type-picker">
      <Text style={[styles.label, disabled && styles.labelDisabled]}>
        口座種別
      </Text>

      <View style={styles.optionsContainer}>
        {ACCOUNT_TYPES.map((option) => {
          const isSelected = value === option.value;
          return (
            <Pressable
              key={option.value}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                disabled && styles.optionDisabled,
              ]}
              onPress={() => !disabled && onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected, disabled }}
              accessibilityLabel={option.label}
              testID={`account-type-${option.value || 'none'}`}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                  disabled && styles.optionTextDisabled,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
};

AccountTypePicker.displayName = 'AccountTypePicker';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  labelDisabled: {
    color: '#8E8E93',
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  optionSelected: {
    backgroundColor: '#007AFF',
  },
  optionDisabled: {
    backgroundColor: '#E5E5EA',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  optionTextSelected: {
    color: '#fff',
  },
  optionTextDisabled: {
    color: '#8E8E93',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
});
