/**
 * PublishConfirmModal Component
 *
 * Confirmation modal for PDF publishing action.
 * Shows a confirmation message before finalizing and generating PDF.
 * Message varies based on current document status.
 *
 * When validation errors are present, displays a warning list
 * of missing required fields and disables the publish button.
 */

import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DocumentStatus } from '@/types/document';
import type { PdfValidationResult } from '@/pdf/pdfValidationService';

export interface PublishConfirmModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Whether the publish operation is in progress */
  isPublishing: boolean;
  /** Current document status (null for new documents) */
  currentStatus: DocumentStatus | null;
  /** Called when publish is confirmed */
  onConfirm: () => void;
  /** Called when cancelled */
  onCancel: () => void;
  /** Test ID for testing */
  testID?: string;
  /** PDF validation result for pre-publish validation display */
  validationResult?: PdfValidationResult;
}

/**
 * Confirmation modal for PDF publish action
 */
export const PublishConfirmModal: React.FC<PublishConfirmModalProps> = ({
  visible,
  isPublishing,
  currentStatus,
  onConfirm,
  onCancel,
  testID = 'publish-confirm-modal',
  validationResult,
}) => {
  const hasValidationErrors = validationResult && !validationResult.isValid;

  // Determine message based on current status
  const { title, message, confirmText } = useMemo(() => {
    if (hasValidationErrors) {
      return {
        title: 'PDF発行できません',
        message: '',
        confirmText: '発行する',
      };
    }

    if (currentStatus === 'draft' || currentStatus === null) {
      // Draft or new document: status will change to 'issued'
      return {
        title: 'PDF発行の確認',
        message:
          '書類を「発行済」として保存し、PDFを生成します。発行後も下書きに戻して編集できます。',
        confirmText: isPublishing ? '発行中...' : '発行する',
      };
    }
    if (currentStatus === 'issued') {
      // Already issued: just re-share PDF
      return {
        title: 'PDF共有の確認',
        message: 'PDFを再生成して共有します。ステータスは変更されません。',
        confirmText: isPublishing ? '共有中...' : '共有する',
      };
    }
    // sent or paid: generate and share PDF without status change
    return {
      title: 'PDF共有の確認',
      message:
        'PDFを生成して共有します。ステータスは現在の状態のまま変更されません。',
      confirmText: isPublishing ? '共有中...' : '共有する',
    };
  }, [currentStatus, isPublishing, hasValidationErrors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      testID={testID}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.dialog} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>

          {hasValidationErrors ? (
            <View style={styles.warningContainer} testID="validation-warning">
              <View style={styles.warningHeader}>
                <Ionicons name="warning" size={20} color="#FF9500" />
                <Text style={styles.warningTitle}>
                  以下の項目を入力してください:
                </Text>
              </View>
              {validationResult!.missingFields.map((field, index) => (
                <Text
                  key={index}
                  style={styles.warningItem}
                  testID={`missing-field-${index}`}
                >
                  ・{field}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.message}>{message}</Text>
          )}

          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="キャンセル"
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                styles.confirmButton,
                (hasValidationErrors || isPublishing) &&
                  styles.confirmButtonDisabled,
              ]}
              onPress={onConfirm}
              disabled={hasValidationErrors || isPublishing}
              accessibilityRole="button"
              accessibilityLabel={confirmText}
            >
              <Text
                style={[
                  styles.confirmButtonText,
                  (hasValidationErrors || isPublishing) &&
                    styles.confirmButtonTextDisabled,
                ]}
              >
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

PublishConfirmModal.displayName = 'PublishConfirmModal';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  warningContainer: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginLeft: 8,
  },
  warningItem: {
    fontSize: 14,
    color: '#333',
    paddingLeft: 28,
    paddingVertical: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  confirmButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  confirmButtonTextDisabled: {
    color: '#fff',
  },
});
