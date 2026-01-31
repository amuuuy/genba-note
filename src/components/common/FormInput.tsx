/**
 * FormInput Component
 *
 * A reusable text input with label, optional indicator, and error display.
 * Follows iOS design patterns with appropriate touch targets.
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';

export interface FormInputProps
  extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  /** Current input value */
  value: string;
  /** Callback when value changes */
  onChangeText: (text: string) => void;
  /** Label text displayed above input */
  label: string;
  /** Error message to display below input */
  error?: string | null;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is required (shows indicator) */
  required?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Form input with label and error display
 */
export const FormInput: React.FC<FormInputProps> = ({
  value,
  onChangeText,
  label,
  error,
  disabled = false,
  required = false,
  testID,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  ...textInputProps
}) => {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.labelContainer}>
        <Text style={[styles.label, disabled && styles.labelDisabled]}>
          {label}
        </Text>
        {required && <Text style={styles.requiredIndicator}>必須</Text>}
      </View>
      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          disabled && styles.inputDisabled,
          error && styles.inputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8E8E93"
        editable={!disabled}
        multiline={multiline}
        keyboardType={keyboardType}
        accessibilityLabel={label}
        accessibilityHint={required ? '必須項目' : undefined}
        accessibilityState={{ disabled }}
        {...textInputProps}
      />
      {error && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
};

FormInput.displayName = 'FormInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  labelDisabled: {
    color: '#8E8E93',
  },
  requiredIndicator: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: '#FFEBEE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    minHeight: 44, // Touch target minimum
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    backgroundColor: '#E5E5EA',
    color: '#8E8E93',
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
});
