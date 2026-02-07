/**
 * CalendarEventEditModal
 *
 * Modal form for creating/editing CalendarEvent.
 * Fields: title, date, startTime, endTime, type, color, note.
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { CalendarEventType } from '@/types/calendarEvent';
import type { CalendarEventFormValues } from '@/hooks/useCalendarEventEdit';

const PRESET_COLORS = [
  '#007AFF', // blue
  '#FF9500', // orange
  '#FF3B30', // red
  '#34C759', // green
  '#AF52DE', // purple
  '#8E8E93', // gray
];

interface CalendarEventEditModalProps {
  visible: boolean;
  isEditing: boolean;
  isSaving: boolean;
  values: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    type: CalendarEventType;
    color: string;
    note: string;
  };
  errors: Record<string, string | null>;
  onUpdateField: (field: keyof CalendarEventFormValues, value: string | null) => void;
  onSave: () => void;
  onDelete?: () => void;
  onClose: () => void;
}

const CalendarEventEditModal: React.FC<CalendarEventEditModalProps> = ({
  visible,
  isEditing,
  isSaving,
  values,
  errors,
  onUpdateField,
  onSave,
  onDelete,
  onClose,
}) => {
  const handleDelete = () => {
    Alert.alert('予定を削除', 'この予定を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => onDelete?.(),
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID="calendar-event-edit-modal"
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={isSaving}>
            <Text style={styles.cancelButton}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? '予定を編集' : '予定を追加'}
          </Text>
          <TouchableOpacity onPress={onSave} disabled={isSaving}>
            <Text style={[styles.saveButton, isSaving && styles.disabledText]}>
              保存
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          {/* General error */}
          {errors._general && (
            <Text style={styles.generalError}>{errors._general}</Text>
          )}

          {/* Title */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>タイトル</Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              value={values.title}
              onChangeText={(text) => onUpdateField('title', text)}
              placeholder="予定のタイトル"
              testID="event-title-input"
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          {/* Date */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>日付</Text>
            <TextInput
              style={[styles.input, errors.date && styles.inputError]}
              value={values.date}
              onChangeText={(text) => onUpdateField('date', text)}
              placeholder="YYYY-MM-DD"
              testID="event-date-input"
            />
            {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
          </View>

          {/* Time */}
          <View style={styles.row}>
            <View style={[styles.fieldContainer, styles.halfField]}>
              <Text style={styles.label}>開始時間</Text>
              <TextInput
                style={styles.input}
                value={values.startTime}
                onChangeText={(text) => onUpdateField('startTime', text)}
                placeholder="HH:MM"
                testID="event-start-time-input"
              />
            </View>
            <View style={[styles.fieldContainer, styles.halfField]}>
              <Text style={styles.label}>終了時間</Text>
              <TextInput
                style={styles.input}
                value={values.endTime}
                onChangeText={(text) => onUpdateField('endTime', text)}
                placeholder="HH:MM"
                testID="event-end-time-input"
              />
            </View>
          </View>

          {/* Type */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>種別</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  values.type === 'schedule' && styles.typeButtonActive,
                ]}
                onPress={() => onUpdateField('type', 'schedule')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    values.type === 'schedule' && styles.typeButtonTextActive,
                  ]}
                >
                  予定
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  values.type === 'appointment' && styles.typeButtonActive,
                ]}
                onPress={() => onUpdateField('type', 'appointment')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    values.type === 'appointment' && styles.typeButtonTextActive,
                  ]}
                >
                  打ち合わせ
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Color */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>色</Text>
            <View style={styles.colorRow}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    values.color === color && styles.colorCircleSelected,
                  ]}
                  onPress={() => onUpdateField('color', color)}
                  testID={`color-picker-${color}`}
                />
              ))}
            </View>
          </View>

          {/* Note */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>メモ</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={values.note}
              onChangeText={(text) => onUpdateField('note', text)}
              placeholder="メモ（任意）"
              multiline
              numberOfLines={3}
              testID="event-note-input"
            />
          </View>

          {/* Delete button (edit mode only) */}
          {isEditing && onDelete && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={isSaving}
            >
              <Text style={styles.deleteButtonText}>この予定を削除</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

CalendarEventEditModal.displayName = 'CalendarEventEditModal';

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C6C6C8',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  cancelButton: {
    fontSize: 17,
    color: '#007AFF',
  },
  saveButton: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  disabledText: {
    opacity: 0.5,
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 16,
  },
  generalError: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3C3C43',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 0.5,
    borderColor: '#C6C6C8',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#C6C6C8',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 15,
    color: '#000000',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#000000',
  },
  deleteButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 17,
    color: '#FF3B30',
  },
});

export default CalendarEventEditModal;
