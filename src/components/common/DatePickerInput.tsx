/**
 * DatePickerInput Component
 *
 * A text input for date entry in YYYY-MM-DD format.
 * Uses existing dateUtils.ts for validation.
 * Displays formatted date and validates on blur.
 * Tapping the calendar icon opens a native date picker modal.
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { getTodayString, parseLocalDate, formatDateToString } from '@/utils/dateUtils';
import { formatDateForDisplay, parseDateInput } from './dateInputHelpers';

// Re-export helpers for convenience
export { formatDateForDisplay, parseDateInput } from './dateInputHelpers';

export interface DatePickerInputProps {
  /** Current date value in YYYY-MM-DD format */
  value: string | null;
  /** Callback when date changes (receives YYYY-MM-DD or null) */
  onChange: (date: string | null) => void;
  /** Label text displayed above input */
  label: string;
  /** Error message to display below input */
  error?: string | null;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Date input with label and error display
 */
export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  label,
  error,
  disabled = false,
  required = false,
  placeholder = 'YYYY-MM-DD',
  testID,
}) => {
  // Use display mode to show formatted date, edit mode for raw input
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value ?? '');
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Convert current value to Date for picker initial value
  const currentDateForPicker = useMemo(() => {
    if (!value) return new Date();
    return parseLocalDate(value) ?? new Date();
  }, [value]);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
    setInputValue(value ?? '');
  }, [value]);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    const parsed = parseDateInput(inputValue);
    onChange(parsed);
    setInputValue(parsed ?? '');
  }, [inputValue, onChange]);

  const handleChangeText = useCallback((text: string) => {
    setInputValue(text);
  }, []);

  const handleTodayPress = useCallback(() => {
    if (disabled) return;
    const today = getTodayString();
    onChange(today);
    setInputValue(today);
  }, [disabled, onChange]);

  const handleClearPress = useCallback(() => {
    if (disabled) return;
    onChange(null);
    setInputValue('');
  }, [disabled, onChange]);

  const handleContainerPress = useCallback(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  // Calendar picker is only available on native platforms (iOS/Android)
  const isNativePlatform = Platform.OS !== 'web';

  const handleCalendarPress = useCallback(() => {
    if (disabled || !isNativePlatform) return;
    setIsPickerVisible(true);
  }, [disabled, isNativePlatform]);

  const handlePickerConfirm = useCallback((date: Date) => {
    setIsPickerVisible(false);
    const dateString = formatDateToString(date);
    onChange(dateString);
    setInputValue(dateString);
  }, [onChange]);

  const handlePickerCancel = useCallback(() => {
    setIsPickerVisible(false);
  }, []);

  const displayValue = isEditing
    ? inputValue
    : value
      ? formatDateForDisplay(value)
      : '';

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.labelContainer}>
        <Text style={[styles.label, disabled && styles.labelDisabled]}>
          {label}
        </Text>
        {required && <Text style={styles.requiredIndicator}>必須</Text>}
      </View>
      <View style={styles.inputContainer}>
        {isNativePlatform ? (
          <Pressable
            onPress={handleCalendarPress}
            disabled={disabled}
            style={styles.calendarButton}
            accessibilityLabel="カレンダーから選択"
            accessibilityRole="button"
          >
            <Ionicons
              name="calendar-outline"
              size={24}
              color={disabled ? '#C7C7CC' : '#007AFF'}
            />
          </Pressable>
        ) : (
          <View style={styles.calendarButton}>
            <Ionicons
              name="calendar-outline"
              size={24}
              color={disabled ? '#C7C7CC' : '#8E8E93'}
            />
          </View>
        )}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            disabled && styles.inputDisabled,
            error && styles.inputError,
          ]}
          value={displayValue}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={isEditing ? placeholder : '日付を入力'}
          placeholderTextColor="#8E8E93"
          editable={!disabled}
          keyboardType="numeric"
          accessibilityLabel={label}
          accessibilityHint={required ? '必須項目、YYYY-MM-DD形式' : 'YYYY-MM-DD形式'}
          accessibilityState={{ disabled }}
        />
        {!disabled && (
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleTodayPress}
              style={styles.todayButton}
              accessibilityLabel="今日の日付を入力"
              accessibilityRole="button"
            >
              <Text style={styles.todayButtonText}>今日</Text>
            </Pressable>
            {value && (
              <Pressable
                onPress={handleClearPress}
                style={styles.clearButton}
                accessibilityLabel="日付をクリア"
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={20} color="#8E8E93" />
              </Pressable>
            )}
          </View>
        )}
      </View>
      {error && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      )}
      {isNativePlatform && (
        <DateTimePickerModal
          isVisible={isPickerVisible}
          mode="date"
          date={currentDateForPicker}
          onConfirm={handlePickerConfirm}
          onCancel={handlePickerCancel}
          confirmTextIOS="確定"
          cancelTextIOS="キャンセル"
          locale="ja"
        />
      )}
    </View>
  );
};

DatePickerInput.displayName = 'DatePickerInput';

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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  calendarButton: {
    padding: 8,
    marginLeft: -8,
    marginRight: 0,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 12,
  },
  inputDisabled: {
    color: '#8E8E93',
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  clearButton: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
});
