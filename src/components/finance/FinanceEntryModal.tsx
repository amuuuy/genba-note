/**
 * FinanceEntryModal Component
 *
 * Modal for creating/editing income or expense entries.
 * Includes amount, date, description fields, and photo attachments.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { DatePickerInput } from '@/components/common/DatePickerInput';
import { FinancePhotoSection } from './FinancePhotoSection';
import { getTodayString } from '@/utils/dateUtils';
import { generateUUID } from '@/utils/uuid';
import {
  copyFinancePhotoToTempStorage,
  deleteStoredImage,
  getFileSize,
} from '@/utils/imageUtils';
import {
  MAX_PHOTO_SIZE_ACTIVE_BYTES,
  MAX_FINANCE_PHOTOS_PER_ENTRY,
} from '@/utils/constants';
import type { FinanceType, FinanceEntry } from '@/domain/finance';
import type { TempFinancePhotoInfo } from '@/types/financePhoto';

export interface FinanceEntryModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Type of finance entry (income or expense) */
  type: FinanceType;
  /** Callback when modal is cancelled */
  onCancel: () => void;
  /** Callback when entry is saved with photos (returns Promise for error handling) */
  onSave: (
    entry: FinanceEntry,
    photos: Array<{ uri: string; originalFilename: string | null }>
  ) => Promise<void>;
  /** Test ID for testing */
  testID?: string;
}

interface FormState {
  amount: string;
  date: string;
  description: string;
}

interface FormErrors {
  amount?: string;
  date?: string;
}

const INITIAL_FORM_STATE: FormState = {
  amount: '',
  date: '',
  description: '',
};

/**
 * Modal for creating income/expense entries
 */
export const FinanceEntryModal: React.FC<FinanceEntryModalProps> = ({
  visible,
  type,
  onCancel,
  onSave,
  testID,
}) => {
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [photos, setPhotos] = useState<TempFinancePhotoInfo[]>([]);
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setForm({
        ...INITIAL_FORM_STATE,
        date: getTodayString(),
      });
      setErrors({});
      setIsSaving(false);
      setPhotos([]);
      setIsAddingPhoto(false);
    }
  }, [visible]);

  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      // Clear error when field is updated
      if (field in errors) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Validate amount
    const amountStr = form.amount.trim();
    if (!amountStr) {
      newErrors.amount = '金額を入力してください';
    } else {
      const amount = Number(amountStr);
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = '有効な金額を入力してください';
      } else if (amount > 999999999) {
        newErrors.amount = '金額が大きすぎます';
      }
    }

    // Validate date
    if (!form.date) {
      newErrors.date = '日付を入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  // Handle add photo
  const handleAddPhoto = useCallback(async () => {
    // Check per-entry limit
    if (photos.length >= MAX_FINANCE_PHOTOS_PER_ENTRY) {
      Alert.alert('エラー', `1件あたりの写真上限（${MAX_FINANCE_PHOTOS_PER_ENTRY}枚）に達しました。`);
      return;
    }

    setIsAddingPhoto(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Validate file size
        const fileSizeResult = await getFileSize(asset.uri);
        if (!fileSizeResult.success) {
          Alert.alert('エラー', '写真の読み込みに失敗しました');
          return;
        }
        if (fileSizeResult.size! > MAX_PHOTO_SIZE_ACTIVE_BYTES) {
          const sizeMB = (fileSizeResult.size! / (1024 * 1024)).toFixed(1);
          const limitMB = (MAX_PHOTO_SIZE_ACTIVE_BYTES / (1024 * 1024)).toFixed(1);
          Alert.alert('エラー', `写真サイズ（${sizeMB}MB）が制限（${limitMB}MB）を超えています。`);
          return;
        }

        // Copy to temp storage; will be moved to entry directory on save
        const tempUri = await copyFinancePhotoToTempStorage(asset.uri);

        if (!tempUri) {
          Alert.alert('エラー', '写真の保存に失敗しました');
          return;
        }

        const tempPhoto: TempFinancePhotoInfo = {
          tempId: generateUUID(),
          permanentUri: tempUri,
          originalFilename: asset.fileName ?? null,
        };

        setPhotos((prev) => [...prev, tempPhoto]);
      }
    } catch {
      Alert.alert('エラー', '写真の追加中にエラーが発生しました');
    } finally {
      setIsAddingPhoto(false);
    }
  }, [photos.length]);

  // Handle delete temp photo
  const handleDeletePhoto = useCallback(
    async (tempId: string) => {
      // Prevent deletion during save to avoid inconsistency
      if (isSaving) {
        return;
      }

      const photo = photos.find((p) => p.tempId === tempId);
      if (photo) {
        // Delete from filesystem
        await deleteStoredImage(photo.permanentUri);
        // Remove from state
        setPhotos((prev) => prev.filter((p) => p.tempId !== tempId));
      }
    },
    [photos, isSaving]
  );

  // Handle cancel with cleanup
  const handleCancel = useCallback(async () => {
    // Prevent cancel during save
    if (isSaving) {
      return;
    }

    // Clean up all temporary photos from filesystem
    for (const photo of photos) {
      await deleteStoredImage(photo.permanentUri);
    }

    onCancel();
  }, [photos, isSaving, onCancel]);

  const handleSave = useCallback(async () => {
    if (isSaving || !validateForm()) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const entry: FinanceEntry = {
        id: generateUUID(),
        type,
        amount: Number(form.amount.trim()),
        date: form.date,
        description: form.description.trim(),
        createdAt: now,
        updatedAt: now,
      };

      // Convert temp photos to photo data for parent
      const photoData = photos.map((p) => ({
        uri: p.permanentUri,
        originalFilename: p.originalFilename,
      }));

      await onSave(entry, photoData);
      // Parent will close modal on success
    } finally {
      // Always reset isSaving to allow retry on failure
      setIsSaving(false);
    }
  }, [isSaving, validateForm, type, form, photos, onSave]);

  const title = type === 'income' ? '収入追加' : '支出追加';
  const canSave =
    form.amount.trim() !== '' && form.date !== '' && !isSaving && !isAddingPhoto;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
      testID={testID}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={handleCancel}
            style={styles.headerButton}
            accessibilityLabel="キャンセル"
            accessibilityRole="button"
            disabled={isSaving}
          >
            <Text style={[styles.cancelText, isSaving && styles.cancelTextDisabled]}>
              キャンセル
            </Text>
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <Pressable
            onPress={handleSave}
            style={styles.headerButton}
            disabled={!canSave}
            accessibilityLabel="保存"
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
          >
            <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
              保存
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.contentContainer}
        >
          {/* Amount Input */}
          <View style={styles.fieldContainer}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>金額（円）</Text>
              <Text style={styles.requiredIndicator}>必須</Text>
            </View>
            <TextInput
              style={[styles.input, errors.amount && styles.inputError]}
              value={form.amount}
              onChangeText={(text) => updateField('amount', text)}
              placeholder="0"
              placeholderTextColor="#8E8E93"
              keyboardType="number-pad"
              accessibilityLabel="金額"
              testID="finance-amount-input"
            />
            {errors.amount && (
              <Text style={styles.errorText} accessibilityRole="alert">
                {errors.amount}
              </Text>
            )}
          </View>

          {/* Date Input */}
          <DatePickerInput
            value={form.date}
            onChange={(date) => updateField('date', date ?? '')}
            label="日付"
            error={errors.date}
            required
            testID="finance-date-input"
          />

          {/* Photo Section */}
          <FinancePhotoSection
            photos={photos}
            onAddPhoto={handleAddPhoto}
            onDeletePhoto={handleDeletePhoto}
            isAddingPhoto={isAddingPhoto}
            disabled={isSaving}
            testID="finance-photo-section"
          />

          {/* Description Input */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>説明/メモ</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.description}
              onChangeText={(text) => updateField('description', text)}
              placeholder="メモを入力（任意）"
              placeholderTextColor="#8E8E93"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessibilityLabel="説明"
              testID="finance-description-input"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

FinanceEntryModal.displayName = 'FinanceEntryModal';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  headerButton: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
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
  cancelTextDisabled: {
    color: '#C7C7CC',
  },
  saveText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'right',
  },
  saveTextDisabled: {
    color: '#C7C7CC',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  fieldContainer: {
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    minHeight: 44,
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
});
