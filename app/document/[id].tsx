/**
 * Document Edit Screen
 *
 * Creates or edits a document (estimate or invoice).
 * Handles:
 * - id='new' with type query parameter for new documents
 * - id=UUID for editing existing documents
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
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

import type { DocumentType, DocumentStatus, Document } from '@/types/document';
import { useDocumentEdit } from '@/hooks/useDocumentEdit';
import { useLineItemEditor } from '@/hooks/useLineItemEditor';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import { DocumentEditForm, SaveActionSheet, PublishConfirmModal } from '@/components/document/edit';
import { WarningDialog } from '@/components/common';
import { checkProStatus } from '@/pdf/proGateService';
import { generateAndSharePdf } from '@/pdf/pdfGenerationService';
import {
  validateDocumentForPdf,
  type PdfValidationResult,
} from '@/pdf/pdfValidationService';
import { enrichDocumentWithTotals } from '@/domain/lineItem/calculationService';
import { resolveIssuerInfo } from '@/pdf/issuerResolverService';
import { getPdfErrorMessage } from '@/constants/errorMessages';
import { changeDocumentStatus } from '@/domain/document';
import { getSettings } from '@/storage/asyncStorageService';

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

  // Action sheet and publish modal state
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPro, setIsPro] = useState(true); // Default to true, update on mount
  const [pdfValidation, setPdfValidation] = useState<PdfValidationResult | null>(null);

  // Check Pro status on mount
  useEffect(() => {
    checkProStatus().then((result) => setIsPro(result.isPro));
  }, []);

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

  // Handle preview navigation (without saving)
  const handlePreview = useCallback(() => {
    setShowActionSheet(false);

    // Build document data for preview
    const previewDocument: Partial<Document> = {
      id: state.documentId || '',
      documentNo: state.documentNo || '',
      type: state.values.type,
      status: state.status || 'draft',
      clientName: state.values.clientName,
      clientAddress: state.values.clientAddress || null,
      subject: state.values.subject || null,
      issueDate: state.values.issueDate,
      validUntil: state.values.validUntil || null,
      dueDate: state.values.dueDate || null,
      paidAt: state.values.paidAt || null,
      lineItems: state.lineItems,
      notes: state.values.notes || null,
      issuerSnapshot: state.issuerSnapshot ?? {
        companyName: null,
        representativeName: null,
        address: null,
        phone: null,
        fax: null,
        sealImageBase64: null,
        contactPerson: null,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Navigate to preview with the document data
    router.push({
      pathname: '/document/preview',
      params: { previewData: JSON.stringify(previewDocument) },
    });
  }, [state.documentId, state.documentNo, state.values, state.status, state.lineItems]);

  // Handle save as draft (existing save behavior)
  const handleSaveDraft = useCallback(async () => {
    setShowActionSheet(false);
    await handleSave();
  }, [handleSave]);

  // Handle PDF publish
  const handlePublishPdf = useCallback(async () => {
    setShowActionSheet(false);
    if (!isPro) {
      router.push('/paywall');
      return;
    }

    // Pre-validate document for PDF generation before showing confirm modal
    // Note: documentNo and companyName are auto-filled on save, so we use
    // placeholder values to skip validation for these fields. Only user-input
    // fields (dueDate, clientName, issueDate, lineItems) are effectively checked.
    // The service layer performs full validation as a second defense.
    let resolvedIssuerSnapshot = state.issuerSnapshot;

    // For new documents or documents without companyName, try to get from settings
    // This matches the fallback logic in resolveIssuerInfo which fills companyName
    // from settings when the document's issuerSnapshot lacks it.
    if (!resolvedIssuerSnapshot?.companyName?.trim()) {
      try {
        const settingsResult = await getSettings();
        const issuer = settingsResult.data?.issuer;
        if (settingsResult.success && issuer?.companyName?.trim()) {
          resolvedIssuerSnapshot = {
            companyName: issuer.companyName,
            // Preserve existing values if present, otherwise use settings
            representativeName:
              resolvedIssuerSnapshot?.representativeName ??
              issuer.representativeName ??
              null,
            address: resolvedIssuerSnapshot?.address ?? issuer.address ?? null,
            phone: resolvedIssuerSnapshot?.phone ?? issuer.phone ?? null,
            fax: resolvedIssuerSnapshot?.fax ?? issuer.fax ?? null,
            sealImageBase64: null, // Will be resolved later in PDF generation
            contactPerson: issuer.showContactPerson
              ? (resolvedIssuerSnapshot?.contactPerson ?? issuer.contactPerson ?? null)
              : null,
          };
        }
      } catch {
        // Ignore settings fetch error, validation will catch it if needed
      }
    }

    const currentDocument = {
      // Use placeholder for documentNo (auto-assigned on save)
      documentNo: state.documentNo || 'PLACEHOLDER',
      type: state.values.type,
      issueDate: state.values.issueDate,
      dueDate: state.values.dueDate || null,
      clientName: state.values.clientName,
      lineItems: state.lineItems,
      issuerSnapshot: resolvedIssuerSnapshot ?? {
        companyName: null,
        representativeName: null,
        address: null,
        phone: null,
        sealImageBase64: null,
      },
    } as Document;

    const validationResult = validateDocumentForPdf(currentDocument);
    setPdfValidation(validationResult);
    setShowPublishConfirm(true);
  }, [isPro, state.documentNo, state.values, state.lineItems, state.issuerSnapshot]);

  // Handle PDF publish confirmation
  const handlePublishConfirm = useCallback(async () => {
    setIsPublishing(true);

    try {
      // 1. Save the document first (as draft)
      const savedDocument = await save();
      if (!savedDocument) {
        setIsPublishing(false);
        setShowPublishConfirm(false);
        return;
      }

      // 2. Generate and share PDF FIRST (before changing status)
      // Use temporary 'issued' status for PDF template only
      const enriched = enrichDocumentWithTotals(savedDocument);
      const issuerInfo = await resolveIssuerInfo(savedDocument.id, savedDocument.issuerSnapshot);
      const documentForPdf = {
        ...enriched,
        status: 'issued' as DocumentStatus, // Temporary for PDF display only
        issuerSnapshot: issuerInfo.issuerSnapshot,
      };

      const result = await generateAndSharePdf({
        document: documentForPdf,
        sensitiveSnapshot: issuerInfo.sensitiveSnapshot,
      });

      // 3. Handle PDF generation/share result
      if (!result.success && result.error) {
        // PDF failed or was cancelled - do NOT change status
        if (result.error.code === 'PRO_REQUIRED') {
          router.push('/paywall');
        } else if (result.error.code !== 'SHARE_CANCELLED') {
          // Use detailed message for VALIDATION_FAILED, otherwise use generic message
          const message =
            result.error.code === 'VALIDATION_FAILED' && result.error.message
              ? result.error.message
              : getPdfErrorMessage(result.error.code);
          Alert.alert('PDF生成エラー', message);
        }
        // Status remains unchanged (draft or current)
        return;
      }

      // 4. PDF shared successfully - change status to 'issued' if applicable
      // Only change status if current status is 'draft' (domain rule: draft → issued)
      // Skip if already 'issued' or other statuses (sent/paid)
      if (savedDocument.status === 'draft') {
        const statusResult = await changeDocumentStatus(savedDocument.id, 'issued');
        if (!statusResult.success) {
          // Status change failed but PDF was shared - inform user
          Alert.alert(
            '注意',
            'PDFは共有されましたが、ステータスの更新に失敗しました。手動で「発行済」に変更してください。'
          );
        }
      }
      // If already 'issued', 'sent', or 'paid', status remains unchanged (PDF re-share)

      // 5. Navigate to the document (for both new and existing)
      // For new documents: replace with saved document route
      // For existing documents: refresh to show updated status
      router.replace(`/document/${savedDocument.id}`);
    } catch {
      Alert.alert('エラー', 'PDF発行中に予期しないエラーが発生しました');
    } finally {
      setIsPublishing(false);
      setShowPublishConfirm(false);
    }
  }, [save]);

  // Handle action sheet trigger
  const handleActionSheetOpen = useCallback(() => {
    setShowActionSheet(true);
  }, []);

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
              <Pressable
                onPress={handleActionSheetOpen}
                disabled={state.isSaving || isPublishing || isReadOnlyMode}
                style={[styles.headerButton, (state.isSaving || isPublishing || isReadOnlyMode) && styles.headerButtonDisabled]}
                accessibilityLabel={isReadOnlyMode ? '読み取り専用モード' : state.isSaving || isPublishing ? '処理中' : 'アクション'}
                accessibilityRole="button"
                accessibilityState={{ disabled: state.isSaving || isPublishing || isReadOnlyMode, busy: state.isSaving || isPublishing }}
              >
                {state.isSaving || isPublishing ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <View style={styles.actionButtonContent}>
                    <Text style={[styles.saveButtonText, isReadOnlyMode && styles.saveButtonTextDisabled]}>保存</Text>
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={isReadOnlyMode ? '#999' : '#007AFF'}
                      style={styles.actionChevron}
                    />
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={handlePublishPdf}
                disabled={state.isSaving || isPublishing || isReadOnlyMode}
                style={[styles.headerButton, (state.isSaving || isPublishing || isReadOnlyMode) && styles.headerButtonDisabled]}
                accessibilityLabel="PDF発行"
                accessibilityRole="button"
                accessibilityState={{ disabled: state.isSaving || isPublishing || isReadOnlyMode }}
              >
                <Text style={[styles.saveButtonText, (state.isSaving || isPublishing || isReadOnlyMode) && styles.saveButtonTextDisabled]}>
                  PDF
                </Text>
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

      {/* Save action sheet */}
      <SaveActionSheet
        visible={showActionSheet}
        isDirty={state.isDirty}
        isNewDocument={isNewDocument}
        currentStatus={state.status}
        isSaving={state.isSaving || isPublishing}
        isPro={isPro}
        onPreview={handlePreview}
        onSaveDraft={handleSaveDraft}
        onPublishPdf={handlePublishPdf}
        onClose={() => setShowActionSheet(false)}
      />

      {/* Publish confirmation modal */}
      <PublishConfirmModal
        visible={showPublishConfirm}
        isPublishing={isPublishing}
        currentStatus={state.status}
        onConfirm={handlePublishConfirm}
        onCancel={() => setShowPublishConfirm(false)}
        validationResult={pdfValidation ?? undefined}
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
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionChevron: {
    marginLeft: 2,
  },
});
