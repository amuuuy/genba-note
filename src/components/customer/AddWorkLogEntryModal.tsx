/**
 * AddWorkLogEntryModal Component
 *
 * Modal for creating a new work log entry with date input and photos.
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
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as ImagePicker from 'expo-image-picker';

import type { PhotoType, TempPhotoInfo } from '@/types/customerPhoto';
import { generateUUID } from '@/utils/uuid';
import {
  copyCustomerPhotoToPermanentStorage,
  deleteStoredImage,
} from '@/utils/imageUtils';
import { validatePhotoLimits } from '@/domain/customer/customerPhotoService';

// Photo grid configuration
const COLUMNS = 3;
const SPACING = 8;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - 64 - SPACING * (COLUMNS - 1)) / COLUMNS;

export interface AddWorkLogEntryModalProps {
  /** Whether modal is visible */
  visible: boolean;
  /** Customer ID for photo storage */
  customerId: string;
  /** Existing dates that cannot be selected (already have entries) */
  existingDates: string[];
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback when entry is created with photos */
  onCreate: (
    workDate: string,
    note: string | null,
    photos: {
      before: Array<{ uri: string; originalFilename: string | null }>;
      after: Array<{ uri: string; originalFilename: string | null }>;
    }
  ) => Promise<void>;
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
  customerId,
  existingDates,
  onClose,
  onCreate,
  testID,
}) => {
  const [dateInput, setDateInput] = useState(getTodayString());
  const [note, setNote] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  // Temporary photos state
  const [beforePhotos, setBeforePhotos] = useState<TempPhotoInfo[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<TempPhotoInfo[]>([]);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);

  // Validation
  const isValidDate = isValidDateString(dateInput);
  const isDuplicateDate = isValidDate && existingDates.includes(dateInput);
  const isInFuture = isValidDate && isFutureDate(dateInput);
  const formattedDate = useMemo(
    () => formatDateWithWeekday(dateInput),
    [dateInput]
  );

  // Convert current dateInput to Date for picker
  const currentDateForPicker = useMemo(() => {
    if (!isValidDate) return new Date();
    const date = new Date(dateInput + 'T00:00:00');
    return isNaN(date.getTime()) ? new Date() : date;
  }, [dateInput, isValidDate]);

  const canCreate = isValidDate && !isDuplicateDate && !isInFuture && !isCreating && !isAddingPhoto;

  // Date picker handlers
  const handleOpenDatePicker = useCallback(() => {
    setIsDatePickerVisible(true);
  }, []);

  const handleDatePickerConfirm = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setDateInput(`${year}-${month}-${day}`);
    setError(null);
    setIsDatePickerVisible(false);
  }, []);

  const handleDatePickerCancel = useCallback(() => {
    setIsDatePickerVisible(false);
  }, []);

  // Handle add photo
  const handleAddPhoto = useCallback(async (type: PhotoType) => {
    setIsAddingPhoto(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Validate limits
        const validation = await validatePhotoLimits(asset.uri);
        if (!validation.success) {
          Alert.alert('エラー', '写真の追加に失敗しました');
          return;
        }
        if (!validation.data?.allowed) {
          Alert.alert('エラー', validation.data?.message || '写真を追加できません');
          return;
        }

        // Copy to permanent storage
        const permanentUri = await copyCustomerPhotoToPermanentStorage(
          asset.uri,
          customerId,
          type
        );

        if (!permanentUri) {
          Alert.alert('エラー', '写真の保存に失敗しました');
          return;
        }

        const tempPhoto: TempPhotoInfo = {
          tempId: generateUUID(),
          type,
          permanentUri,
          originalFilename: asset.fileName ?? null,
        };

        if (type === 'before') {
          setBeforePhotos((prev) => [...prev, tempPhoto]);
        } else {
          setAfterPhotos((prev) => [...prev, tempPhoto]);
        }
      }
    } catch {
      Alert.alert('エラー', '写真の追加中にエラーが発生しました');
    } finally {
      setIsAddingPhoto(false);
    }
  }, [customerId]);

  // Handle delete temp photo
  const handleDeleteTempPhoto = useCallback(async (tempId: string, type: PhotoType) => {
    // Prevent deletion during creation to avoid file/metadata inconsistency
    if (isCreating) {
      return;
    }

    const photos = type === 'before' ? beforePhotos : afterPhotos;
    const photo = photos.find((p) => p.tempId === tempId);

    if (photo) {
      // Delete from filesystem
      await deleteStoredImage(photo.permanentUri);

      // Remove from state
      if (type === 'before') {
        setBeforePhotos((prev) => prev.filter((p) => p.tempId !== tempId));
      } else {
        setAfterPhotos((prev) => prev.filter((p) => p.tempId !== tempId));
      }
    }
  }, [beforePhotos, afterPhotos, isCreating]);

  const handleCreate = async () => {
    if (!canCreate) {
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const trimmedNote = note.trim();
      await onCreate(
        dateInput,
        trimmedNote || null,
        {
          before: beforePhotos.map((p) => ({
            uri: p.permanentUri,
            originalFilename: p.originalFilename,
          })),
          after: afterPhotos.map((p) => ({
            uri: p.permanentUri,
            originalFilename: p.originalFilename,
          })),
        }
      );
      // Reset state (photos are now owned by parent)
      setDateInput(getTodayString());
      setNote('');
      setBeforePhotos([]);
      setAfterPhotos([]);
      onClose();
    } catch (e) {
      // Display the specific error message from parent
      const message = e instanceof Error ? e.message : '作業記録の作成に失敗しました';
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = async () => {
    // Prevent close during creation to avoid file/metadata inconsistency
    if (isCreating) {
      return;
    }

    // Clean up all temporary photos from filesystem
    for (const photo of [...beforePhotos, ...afterPhotos]) {
      await deleteStoredImage(photo.permanentUri);
    }

    // Reset state
    setDateInput(getTodayString());
    setNote('');
    setError(null);
    setBeforePhotos([]);
    setAfterPhotos([]);
    onClose();
  };

  const handleSetToday = () => {
    setDateInput(getTodayString());
    setError(null);
  };

  // Render photo gallery section
  const renderPhotoSection = (
    photos: TempPhotoInfo[],
    type: PhotoType,
    label: string
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.photoGrid}>
        {photos.map((photo) => (
          <View key={photo.tempId} style={styles.photoWrapper}>
            <Image
              source={{ uri: photo.permanentUri }}
              style={styles.photo}
              resizeMode="cover"
            />
            <Pressable
              style={styles.deleteButton}
              onPress={() => handleDeleteTempPhoto(photo.tempId, type)}
              accessibilityLabel="写真を削除"
              accessibilityRole="button"
              hitSlop={8}
            >
              <View style={styles.deleteIcon}>
                <Ionicons name="close" size={12} color="#fff" />
              </View>
            </Pressable>
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
            isAddingPhoto && styles.addButtonDisabled,
          ]}
          onPress={() => handleAddPhoto(type)}
          disabled={isAddingPhoto}
          accessibilityRole="button"
          accessibilityLabel={`${label}の写真を追加`}
        >
          {isAddingPhoto ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={28} color="#007AFF" />
              <Text style={styles.addText}>追加</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );

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
                <Pressable
                  style={styles.dateInputPressable}
                  onPress={handleOpenDatePicker}
                  accessibilityRole="button"
                  accessibilityLabel="日付を選択"
                >
                  <Ionicons name="calendar-outline" size={20} color="#666" />
                  <Text style={styles.dateInputText}>{dateInput}</Text>
                </Pressable>
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
              {isDuplicateDate && (
                <View style={styles.warningContainer}>
                  <Ionicons name="warning-outline" size={16} color="#FF9500" />
                  <Text style={styles.warningText}>
                    この日付の作業記録は既に存在します
                  </Text>
                </View>
              )}

              <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                date={currentDateForPicker}
                onConfirm={handleDatePickerConfirm}
                onCancel={handleDatePickerCancel}
                confirmTextIOS="確定"
                cancelTextIOS="キャンセル"
                locale="ja"
                maximumDate={new Date()}
              />
            </View>

            {/* Before photos */}
            {renderPhotoSection(beforePhotos, 'before', '作業前')}

            {/* After photos */}
            {renderPhotoSection(afterPhotos, 'after', '作業後')}

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
  dateInputPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dateInputText: {
    fontSize: 16,
    color: '#333',
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
  // Photo grid styles
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING,
  },
  photoWrapper: {
    position: 'relative',
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  deleteIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#007AFF',
    backgroundColor: '#F2F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonPressed: {
    opacity: 0.7,
    backgroundColor: '#E8F4FF',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
});
