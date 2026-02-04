/**
 * Customer Edit Screen
 *
 * Creates or edits a customer.
 * Handles:
 * - id='new' for new customers
 * - id=UUID for editing existing customers
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, router, Stack, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useCustomerEdit } from '@/hooks/useCustomerEdit';
import { useCustomerPhotos } from '@/hooks/useCustomerPhotos';
import { useWorkLogEntries } from '@/hooks/useWorkLogEntries';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import { FormInput, FormSection, ConfirmDialog } from '@/components/common';
import {
  PhotoPreviewModal,
  WorkLogEntryList,
  AddWorkLogEntryModal,
} from '@/components/customer';
import type { CustomerPhoto, PhotoType } from '@/types/customerPhoto';
import type { WorkLogEntry } from '@/types/workLogEntry';

export default function CustomerEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const isNewCustomer = id === 'new';
  const customerId = isNewCustomer ? null : id ?? null;

  // Customer edit state
  const { state, updateField, save, validate } = useCustomerEdit(customerId);

  // Customer photos state (only for existing customers)
  const {
    beforePhotos,
    afterPhotos,
    undatedPhotos,
    isLoading: isPhotosLoading,
    addPhoto,
    deletePhoto,
    getPhotosByEntry,
    reassignPhoto,
    refresh: refreshPhotos,
  } = useCustomerPhotos(customerId);

  // Work log entries state (only for existing customers)
  const {
    entries: workLogEntries,
    isLoading: isEntriesLoading,
    createEntry,
    updateEntry,
    deleteEntry,
    refresh: refreshEntries,
  } = useWorkLogEntries(customerId);

  // Read-only mode state
  const { isReadOnlyMode } = useReadOnlyMode();

  // Photo preview state
  const [previewPhoto, setPreviewPhoto] = useState<CustomerPhoto | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Delete confirmation state
  const [deletePhotoConfirm, setDeletePhotoConfirm] = useState<CustomerPhoto | null>(null);
  const [deleteEntryConfirm, setDeleteEntryConfirm] = useState<WorkLogEntry | null>(null);

  // Add work log entry modal state
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);

  // Track which entry is currently being added to (for photo adds)
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);

  // Ref to latest isDirty for back handlers
  const isDirtyRef = useRef(state.isDirty);
  isDirtyRef.current = state.isDirty;

  // Handle read-only mode for new customers
  useEffect(() => {
    if (isNewCustomer && isReadOnlyMode) {
      Alert.alert(
        '読み取り専用モード',
        'データベースエラーにより、新規作成できません。',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [isNewCustomer, isReadOnlyMode]);

  // Show confirmation dialog for unsaved changes
  const showUnsavedChangesAlert = useCallback((): boolean => {
    if (isDirtyRef.current) {
      Alert.alert(
        '未保存の変更があります',
        '変更を破棄してもよろしいですか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '破棄する', style: 'destructive', onPress: () => router.back() },
        ]
      );
      return true; // Prevent default back behavior
    }
    return false;
  }, []);

  // Handle Android hardware back button
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      return showUnsavedChangesAlert();
    });
    return () => subscription.remove();
  }, [showUnsavedChangesAlert]);

  // Handle save
  const handleSave = useCallback(async () => {
    const savedCustomer = await save();
    if (savedCustomer) {
      if (isNewCustomer) {
        // Navigate to the saved customer's edit screen
        router.replace(`/customer/${savedCustomer.id}` as Href);
      } else {
        Alert.alert('保存しました');
      }
    } else if (state.errorMessage) {
      Alert.alert('エラー', state.errorMessage);
    }
  }, [save, isNewCustomer, state.errorMessage]);

  // Handle back with unsaved changes check
  const handleBack = useCallback(() => {
    if (!showUnsavedChangesAlert()) {
      router.back();
    }
  }, [showUnsavedChangesAlert]);

  // Handle photo press
  const handlePhotoPress = useCallback((photo: CustomerPhoto) => {
    setPreviewPhoto(photo);
    setShowPreview(true);
  }, []);

  // Handle add photo
  const handleAddPhoto = useCallback(async (entryId: string | null, type: PhotoType) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const success = await addPhoto(type, asset.uri, entryId, asset.fileName);
      if (!success) {
        Alert.alert('エラー', '写真の追加に失敗しました');
      }
    }
  }, [addPhoto]);

  // Handle delete photo trigger
  const handleDeletePhotoPress = useCallback((photo: CustomerPhoto) => {
    setDeletePhotoConfirm(photo);
  }, []);

  // Handle delete photo confirm
  const handleDeletePhotoConfirm = useCallback(async () => {
    if (!deletePhotoConfirm) return;

    const success = await deletePhoto(deletePhotoConfirm.id);
    if (!success) {
      Alert.alert('エラー', '写真の削除に失敗しました');
    }
    setDeletePhotoConfirm(null);
  }, [deletePhotoConfirm, deletePhoto]);

  // Handle preview delete
  const handlePreviewDelete = useCallback(() => {
    if (previewPhoto) {
      setShowPreview(false);
      setDeletePhotoConfirm(previewPhoto);
    }
  }, [previewPhoto]);

  // Close preview
  const handlePreviewClose = useCallback(() => {
    setShowPreview(false);
    setPreviewPhoto(null);
  }, []);

  // Handle add work log entry
  const handleAddEntry = useCallback(() => {
    setShowAddEntryModal(true);
  }, []);

  // Handle create work log entry
  const handleCreateEntry = useCallback(async (workDate: string, note: string | null) => {
    const entry = await createEntry(workDate, note);
    if (!entry) {
      throw new Error('作業記録の作成に失敗しました');
    }
  }, [createEntry]);

  // Handle update work log entry note
  const handleUpdateEntryNote = useCallback(async (entryId: string, note: string | null) => {
    const success = await updateEntry(entryId, note);
    if (!success) {
      Alert.alert('エラー', 'メモの更新に失敗しました');
    }
  }, [updateEntry]);

  // Handle delete work log entry trigger
  const handleDeleteEntryPress = useCallback((entry: WorkLogEntry) => {
    setDeleteEntryConfirm(entry);
  }, []);

  // Handle delete work log entry confirm
  const handleDeleteEntryConfirm = useCallback(async () => {
    if (!deleteEntryConfirm) return;

    const success = await deleteEntry(deleteEntryConfirm.id);
    if (!success) {
      Alert.alert('エラー', '作業記録の削除に失敗しました');
    } else {
      // Refresh photos to update undated photos list
      await refreshPhotos();
    }
    setDeleteEntryConfirm(null);
  }, [deleteEntryConfirm, deleteEntry, refreshPhotos]);

  // Determine title
  const title = isNewCustomer ? '新規顧客' : '顧客編集';

  // Loading state
  if (state.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen
          options={{
            title,
            headerLeft: () => (
              <Pressable onPress={handleBack} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={24} color="#007AFF" />
              </Pressable>
            ),
          }}
        />
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Error state
  if (state.errorMessage && !state.isDirty) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen
          options={{
            title,
            headerLeft: () => (
              <Pressable onPress={handleBack} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={24} color="#007AFF" />
              </Pressable>
            ),
          }}
        />
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
      </View>
    );
  }

  const isEditable = !isReadOnlyMode;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          title,
          headerLeft: () => (
            <Pressable onPress={handleBack} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={handleSave}
              disabled={!isEditable || state.isSaving}
              style={[styles.headerButton, (!isEditable || state.isSaving) && styles.headerButtonDisabled]}
            >
              {state.isSaving ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Ionicons name="checkmark" size={24} color={isEditable ? '#007AFF' : '#C7C7CC'} />
              )}
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Basic Info Section */}
        <FormSection title="基本情報">
          <FormInput
            label="顧客名"
            value={state.values.name}
            onChangeText={(value) => updateField('name', value)}
            error={state.errors.name}
            disabled={!isEditable}
            required
            placeholder="例: 株式会社○○建設"
            testID="customer-name-input"
          />
          <FormInput
            label="住所"
            value={state.values.address}
            onChangeText={(value) => updateField('address', value)}
            error={state.errors.address}
            disabled={!isEditable}
            placeholder="例: 東京都渋谷区○○1-2-3"
            testID="customer-address-input"
          />
        </FormSection>

        {/* Contact Info Section */}
        <FormSection title="連絡先">
          <FormInput
            label="電話番号"
            value={state.values.phone}
            onChangeText={(value) => updateField('phone', value)}
            error={state.errors.phone}
            disabled={!isEditable}
            placeholder="例: 03-1234-5678"
            keyboardType="phone-pad"
            testID="customer-phone-input"
          />
          <FormInput
            label="メールアドレス"
            value={state.values.email}
            onChangeText={(value) => updateField('email', value)}
            error={state.errors.email}
            disabled={!isEditable}
            placeholder="例: info@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            testID="customer-email-input"
          />
        </FormSection>

        {/* Work Log Entries (only for existing customers) */}
        {!isNewCustomer && (
          <FormSection title="現場写真">
            <WorkLogEntryList
              entries={workLogEntries}
              getPhotosByEntry={getPhotosByEntry}
              undatedPhotos={undatedPhotos}
              onPhotoPress={handlePhotoPress}
              onAddPhoto={handleAddPhoto}
              onDeletePhoto={handleDeletePhotoPress}
              onAddEntry={handleAddEntry}
              onUpdateEntryNote={handleUpdateEntryNote}
              onDeleteEntry={handleDeleteEntryPress}
              disabled={!isEditable}
              testID="work-log-entry-list"
            />
          </FormSection>
        )}
      </ScrollView>

      {/* Photo Preview Modal */}
      <PhotoPreviewModal
        visible={showPreview}
        photo={previewPhoto}
        onClose={handlePreviewClose}
        onDelete={isEditable ? handlePreviewDelete : undefined}
        testID="photo-preview-modal"
      />

      {/* Delete Photo Confirmation */}
      <ConfirmDialog
        visible={deletePhotoConfirm !== null}
        title="写真を削除"
        message="この写真を削除しますか？\nこの操作は取り消せません。"
        confirmText="削除"
        cancelText="キャンセル"
        destructive
        onConfirm={handleDeletePhotoConfirm}
        onCancel={() => setDeletePhotoConfirm(null)}
      />

      {/* Delete Work Log Entry Confirmation */}
      <ConfirmDialog
        visible={deleteEntryConfirm !== null}
        title="作業日を削除"
        message="この作業日を削除しますか？\n紐づいた写真は「日付未設定」に移動されます。"
        confirmText="削除"
        cancelText="キャンセル"
        destructive
        onConfirm={handleDeleteEntryConfirm}
        onCancel={() => setDeleteEntryConfirm(null)}
      />

      {/* Add Work Log Entry Modal */}
      <AddWorkLogEntryModal
        visible={showAddEntryModal}
        existingDates={workLogEntries.map((e) => e.workDate)}
        onClose={() => setShowAddEntryModal(false)}
        onCreate={handleCreateEntry}
        testID="add-work-log-entry-modal"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
});
