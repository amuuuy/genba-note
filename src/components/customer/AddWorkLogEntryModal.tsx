/**
 * AddWorkLogEntryModal Component
 *
 * Modal for creating a new work log entry with date input.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface AddWorkLogEntryModalProps {
  /** Whether modal is visible */
  visible: boolean;
  /** Existing dates that cannot be selected (already have entries) */
  existingDates: string[];
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when entry is created */
  onCreate: (workDate: string, note: string | null) => Promise<void>;
  /** Test ID */
  testID?: string;
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate date string format (YYYY-MM-DD) and check if it's a valid date
 */
function isValidDateString(dateString: string): boolean {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(dateString)) {
    return false;
  }
  const date = new Date(dateString + 'T00:00:00');
  if (isNaN(date.getTime())) {
    return false;
  }
  // Check if the date components match (to catch invalid dates like 2024-02-30)
  const [year, month, day] = dateString.split('-').map(Number);
  return (
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

/**
 * Check if date is in the future
 */
function isFutureDate(dateString: string): boolean {
  const today = getTodayString();
  return dateString > today;
}

/**
 * Format date string for display with Japanese weekday
 */
function formatDateWithWeekday(dateString: string): string | null {
  if (!isValidDateString(dateString)) {
    return null;
  }
  const date = new Date(dateString + 'T00:00:00');
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[date.getDay()];
  const [year, month, day] = dateString.split('-').map(Number);
  return `${year}/${month}/${day} (${weekday})`;
}

/**
 * Add work log entry modal component
 */
export const AddWorkLogEntryModal: React.FC<AddWorkLogEntryModalProps> = ({
  visible,
  existingDates,
  onClose,
  onCreate,
  testID,
}) => {
  const [dateInput, setDateInput] = useState(getTodayString());
  const [note, setNote] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation
  const isValidDate = isValidDateString(dateInput);
  const isDuplicateDate = isValidDate && existingDates.includes(dateInput);
  const isInFuture = isValidDate && isFutureDate(dateInput);
  const formattedDate = useMemo(
    () => formatDateWithWeekday(dateInput),
    [dateInput]
  );

  const canCreate = isValidDate && !isDuplicateDate && !isInFuture && !isCreating;

  const handleDateChange = useCallback((text: string) => {
    // Allow only numbers and hyphens
    const cleaned = text.replace(/[^\d-]/g, '');
    setDateInput(cleaned);
    setError(null);
  }, []);

  const handleCreate = async () => {
    if (!canCreate) {
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const trimmedNote = note.trim();
      await onCreate(dateInput, trimmedNote || null);
      // Reset state
      setDateInput(getTodayString());
      setNote('');
      onClose();
    } catch {
      setError('作業記録の作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setDateInput(getTodayString());
    setNote('');
    setError(null);
    onClose();
  };

  const handleSetToday = () => {
    setDateInput(getTodayString());
    setError(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      testID={testID}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={handleClose}
              style={styles.headerButton}
              accessibilityRole="button"
              accessibilityLabel="キャンセル"
            >
              <Text style={styles.cancelText}>キャンセル</Text>
            </Pressable>
            <Text style={styles.headerTitle}>作業日を追加</Text>
            <Pressable
              onPress={handleCreate}
              style={[
                styles.headerButton,
                !canCreate && styles.headerButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="追加"
              disabled={!canCreate}
            >
              <Text
                style={[
                  styles.createText,
                  !canCreate && styles.createTextDisabled,
                ]}
              >
                追加
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            {/* Date input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>作業日</Text>

              <View style={styles.dateInputContainer}>
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <TextInput
                  style={styles.dateInput}
                  value={dateInput}
                  onChangeText={handleDateChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  autoCorrect={false}
                />
                <Pressable
                  style={styles.todayButton}
                  onPress={handleSetToday}
                  accessibilityLabel="今日の日付を入力"
                >
                  <Text style={styles.todayButtonText}>今日</Text>
                </Pressable>
              </View>

              {/* Date preview */}
              {formattedDate && (
                <Text style={styles.datePreview}>{formattedDate}</Text>
              )}

              {/* Validation messages */}
              {!isValidDate && dateInput.length >= 10 && (
                <View style={styles.warningContainer}>
                  <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                  <Text style={styles.errorText}>
                    日付の形式が正しくありません (YYYY-MM-DD)
                  </Text>
                </View>
              )}

              {isDuplicateDate && (
                <View style={styles.warningContainer}>
                  <Ionicons name="warning-outline" size={16} color="#FF9500" />
                  <Text style={styles.warningText}>
                    この日付の作業記録は既に存在します
                  </Text>
                </View>
              )}

              {isInFuture && (
                <View style={styles.warningContainer}>
                  <Ionicons name="warning-outline" size={16} color="#FF9500" />
                  <Text style={styles.warningText}>
                    未来の日付は選択できません
                  </Text>
                </View>
              )}
            </View>

            {/* Note input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>メモ（任意）</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="作業内容のメモを入力..."
                placeholderTextColor="#C7C7CC"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Error message */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

AddWorkLogEntryModal.displayName = 'AddWorkLogEntryModal';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 80,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  cancelText: {
    fontSize: 17,
    color: '#007AFF',
  },
  createText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'right',
  },
  createTextDisabled: {
    color: '#C7C7CC',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dateInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
    marginLeft: 8,
  },
  todayButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  datePreview: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#FF9500',
    marginLeft: 6,
  },
  noteInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2F2',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginLeft: 8,
  },
});
