/**
 * PublishConfirmModal Component
 *
 * Confirmation modal for PDF publishing action.
 * Shows a confirmation message before finalizing and generating PDF.
 * Message varies based on current document status.
 */

import React, { useMemo } from 'react';
import { ConfirmDialog } from '@/components/common';
import type { DocumentStatus } from '@/types/document';

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
}) => {
  // Determine message based on current status
  const { title, message, confirmText } = useMemo(() => {
    if (currentStatus === 'draft' || currentStatus === null) {
      // Draft or new document: status will change to 'issued'
      return {
        title: 'PDF発行の確認',
        message: '書類を「発行済」として保存し、PDFを生成します。発行後も下書きに戻して編集できます。',
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
      message: 'PDFを生成して共有します。ステータスは現在の状態のまま変更されません。',
      confirmText: isPublishing ? '共有中...' : '共有する',
    };
  }, [currentStatus, isPublishing]);

  return (
    <ConfirmDialog
      visible={visible}
      title={title}
      message={message}
      confirmText={confirmText}
      cancelText="キャンセル"
      onConfirm={onConfirm}
      onCancel={onCancel}
      testID={testID}
    />
  );
};

PublishConfirmModal.displayName = 'PublishConfirmModal';
