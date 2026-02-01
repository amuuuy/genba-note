/**
 * Document Edit Screen
 *
 * Creates or edits a document (estimate or invoice).
 * Handles:
 * - id='new' with type query parameter for new documents
 * - id=UUID for editing existing documents
 */

import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, router, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import type { DocumentType, DocumentStatus } from '@/types/document';
import { useDocumentEdit } from '@/hooks/useDocumentEdit';
import { useLineItemEditor } from '@/hooks/useLineItemEditor';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import { DocumentEditForm } from '@/components/document/edit';
import { WarningDialog } from '@/components/common';

/**
 * Get display name for document type
 */
function getTypeLabel(type: DocumentType | undefined): string {
  if (type === 'estimate') return '見積書';
  if (type === 'invoice') return '請求書';
  return '書類';
}

export default function DocumentEditScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: DocumentType }>();

  const isNewDocument = id === 'new';
  const documentId = isNewDocument ? null : id ?? null;
  const documentType = (type as DocumentType) ?? 'estimate';

  // Document edit state
  const {
    state,
    updateField,
    updateLineItems,
    save,
    changeStatus,
    shouldShowSentWarning,
    acknowledgeSentWarning,
  } = useDocumentEdit(documentId, documentType);

  // Line item editor state
  const lineItemEditor = useLineItemEditor(state.lineItems);

  // Read-only mode state
  const { isReadOnlyMode } = useReadOnlyMode();

  // Track if we've synced initial line items from document to editor
  const hasInitializedLineItems = useRef(false);
  // Track if we're syncing from state to prevent reverse sync loop
  const isSyncingFromState = useRef(false);
  // Ref to latest isDirty for back handlers
  const isDirtyRef = useRef(state.isDirty);
  isDirtyRef.current = state.isDirty;

  // Reset initialization flag when document ID changes
  useEffect(() => {
    hasInitializedLineItems.current = false;
    isSyncingFromState.current = false;
  }, [documentId]);

  // Handle read-only mode for new documents
  useEffect(() => {
    if (isNewDocument && isReadOnlyMode) {
      Alert.alert(
        '読み取り専用モード',
        'データベースエラーにより、新規作成できません。',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  }, [isNewDocument, isReadOnlyMode]);

  // Sync line items from document to editor on initial load or after save
  useEffect(() => {
    if (!state.isLoading) {
      // Set flag to prevent reverse sync
      isSyncingFromState.current = true;
      lineItemEditor.setLineItems(state.lineItems);
      hasInitializedLineItems.current = true;
      // Reset flag on next tick
      setTimeout(() => {
        isSyncingFromState.current = false;
      }, 0);
    }
  }, [state.isLoading, state.lineItems, lineItemEditor.setLineItems]);

  // Sync line item changes from editor back to document state
  useEffect(() => {
    // Only sync after initial load, when not syncing from state, and when arrays differ
    if (
      hasInitializedLineItems.current &&
      !isSyncingFromState.current &&
      lineItemEditor.lineItems !== state.lineItems
    ) {
      updateLineItems(lineItemEditor.lineItems);
    }
  }, [lineItemEditor.lineItems, updateLineItems, state.lineItems]);

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
      return true; // Prevent default back
    }
    return false; // Allow default back
  }, []);

  // Handle Android hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        return showUnsavedChangesAlert();
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [showUnsavedChangesAlert])
  );

  // Handle save
  const handleSave = useCallback(async () => {
    const savedDocument = await save();
    if (savedDocument) {
      if (isNewDocument) {
        // Replace current screen with the saved document
        router.replace(`/document/${savedDocument.id}`);
      } else {
        // Show success toast (simple alert for now)
        Alert.alert('保存完了', '書類を保存しました');
      }
    }
    // Note: If save returns null, validation errors are already shown in the form
    // or errorMessage is set in state (displayed via useEffect if needed)
  }, [save, isNewDocument]);

  // Handle preview navigation
  const handlePreview = useCallback(() => {
    if (state.documentId) {
      router.push({ pathname: '/document/preview', params: { id: state.documentId } });
    } else {
      Alert.alert('保存が必要です', 'プレビューを表示するには先に保存してください。');
    }
  }, [state.documentId]);

  // Handle status transition
  const handleStatusTransition = useCallback(
    async (newStatus: DocumentStatus, paidAt?: string) => {
      // Save first if dirty
      if (state.isDirty) {
        const saved = await save();
        if (!saved) return;
      }

      const success = await changeStatus(newStatus, paidAt);
      if (!success) {
        // Status change failed - the hook has already set errorMessage
        // We'll display it via useEffect below
      }
    },
    [state.isDirty, save, changeStatus]
  );

  // Handle back press with unsaved changes check
  const handleBackPress = useCallback(() => {
    if (!showUnsavedChangesAlert()) {
      router.back();
    }
  }, [showUnsavedChangesAlert]);

  // Handle sent warning acknowledgement
  const handleSentWarningContinue = useCallback(() => {
    acknowledgeSentWarning();
  }, [acknowledgeSentWarning]);

  const handleSentWarningCancel = useCallback(() => {
    router.back();
  }, []);

  // Display error messages when they occur (handles async state updates)
  // Show for both existing documents (documentId exists) and new documents (isNewDocument)
  // Exclude initial load errors (which are shown in the error state UI)
  useEffect(() => {
    if (state.errorMessage && !state.isLoading && (state.documentId || isNewDocument)) {
      Alert.alert('エラー', state.errorMessage);
    }
  }, [state.errorMessage, state.isLoading, state.documentId, isNewDocument]);

  // Loading state
  if (state.isLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: '読み込み中...',
            headerBackTitle: '戻る',
          }}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      </>
    );
  }

  // Error state (initial load failure)
  if (state.errorMessage && !state.documentId && !isNewDocument) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'エラー',
            headerBackTitle: '戻る',
          }}
        />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>{state.errorMessage}</Text>
          <Pressable style={styles.retryButton} onPress={() => router.back()}>
            <Text style={styles.retryButtonText}>戻る</Text>
          </Pressable>
        </View>
      </>
    );
  }

  // Main content
  const screenTitle = isNewDocument
    ? `新規${getTypeLabel(state.values.type)}`
    : state.documentNo
    ? `${state.documentNo}`
    : '書類編集';

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Custom header with dynamic options */}
      <Stack.Screen
        options={{
          title: screenTitle,
          headerLeft: () => (
            <Pressable
              onPress={handleBackPress}
              hitSlop={8}
              style={styles.headerButton}
              accessibilityLabel="戻る"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={28} color="#007AFF" />
            </Pressable>
          ),
          headerRight: () => (
            <View style={styles.headerButtons}>
              {state.documentId && (
                <Pressable
                  onPress={handlePreview}
                  style={styles.headerButton}
                  accessibilityLabel="プレビュー"
                  accessibilityRole="button"
                >
                  <Ionicons name="eye-outline" size={24} color="#007AFF" />
                </Pressable>
              )}
              <Pressable
                onPress={handleSave}
                disabled={state.isSaving || isReadOnlyMode}
                style={[styles.headerButton, (state.isSaving || isReadOnlyMode) && styles.headerButtonDisabled]}
                accessibilityLabel={isReadOnlyMode ? '読み取り専用モード' : state.isSaving ? '保存中' : '保存'}
                accessibilityRole="button"
                accessibilityState={{ disabled: state.isSaving || isReadOnlyMode, busy: state.isSaving }}
              >
                {state.isSaving ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Text style={[styles.saveButtonText, isReadOnlyMode && styles.saveButtonTextDisabled]}>保存</Text>
                )}
              </Pressable>
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <DocumentEditForm
          values={state.values}
          lineItems={lineItemEditor.lineItems}
          status={state.status}
          errors={state.errors}
          isSaved={!!state.documentId}
          onFieldChange={updateField}
          onLineItemAdd={lineItemEditor.addItem}
          onLineItemUpdate={lineItemEditor.updateItem}
          onLineItemRemove={lineItemEditor.removeItem}
          onStatusTransition={handleStatusTransition}
          disabled={state.isSaving || isReadOnlyMode}
        />
      </KeyboardAvoidingView>

      {/* Sent document warning dialog */}
      <WarningDialog
        visible={shouldShowSentWarning}
        title="送付済の書類を編集"
        message="この書類は既に送付済です。編集すると取引先への通知が必要になる場合があります。"
        continueText="編集を続ける"
        cancelText="戻る"
        onContinue={handleSentWarningContinue}
        onCancel={handleSentWarningCancel}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  keyboardContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
});
