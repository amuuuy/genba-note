/**
 * SaveActionSheet Component
 *
 * Action sheet for document save options:
 * - Preview (review without saving)
 * - Save as Draft
 * - Publish PDF (Pro feature)
 */

import React, { useMemo } from 'react';
import { ActionSheetModal, ActionSheetOption } from '@/components/common';
import type { DocumentStatus } from '@/types/document';

export interface SaveActionSheetProps {
  /** Whether the action sheet is visible */
  visible: boolean;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Whether this is a new document (not yet saved) */
  isNewDocument: boolean;
  /** Current document status (null for new documents) */
  currentStatus: DocumentStatus | null;
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Whether the user has Pro status */
  isPro: boolean;
  /** Called when Preview is selected */
  onPreview: () => void;
  /** Called when Save as Draft is selected */
  onSaveDraft: () => void;
  /** Called when Publish PDF is selected */
  onPublishPdf: () => void;
  /** Called when the action sheet is closed */
  onClose: () => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Action sheet presenting save options for documents
 */
export const SaveActionSheet: React.FC<SaveActionSheetProps> = ({
  visible,
  isDirty,
  isNewDocument,
  currentStatus,
  isSaving,
  isPro,
  onPreview,
  onSaveDraft,
  onPublishPdf,
  onClose,
  testID = 'save-action-sheet',
}) => {
  // Determine PDF publish sublabel based on current status
  const pdfSublabel = useMemo(() => {
    if (currentStatus === 'issued') {
      return 'PDFを再共有';
    }
    if (currentStatus === 'sent' || currentStatus === 'paid') {
      return 'PDFを生成・共有（ステータス変更なし）';
    }
    return '最終確定してPDFを生成・共有';
  }, [currentStatus]);

  const options: ActionSheetOption[] = useMemo(() => {
    return [
      {
        id: 'preview',
        label: 'レビュー',
        sublabel: '保存せずにプレビューを表示',
        icon: 'eye-outline',
        iconColor: '#5856D6',
        disabled: isSaving,
      },
      {
        id: 'save-draft',
        label: '下書き保存',
        sublabel: '下書きとして保存（後で編集可能）',
        icon: 'document-outline',
        iconColor: '#FF9500',
        disabled: isSaving || (!isDirty && !isNewDocument),
      },
      {
        id: 'publish-pdf',
        label: isPro ? 'PDF発行' : 'PDF発行（SAMPLE透かし付き）',
        sublabel: pdfSublabel,
        icon: 'share-outline',
        iconColor: '#007AFF',
        disabled: isSaving,
      },
    ];
  }, [isDirty, isNewDocument, isSaving, isPro, pdfSublabel]);

  const handleSelect = (optionId: string) => {
    switch (optionId) {
      case 'preview':
        onPreview();
        break;
      case 'save-draft':
        onSaveDraft();
        break;
      case 'publish-pdf':
        onPublishPdf();
        break;
    }
  };

  return (
    <ActionSheetModal
      visible={visible}
      title="アクションを選択"
      options={options}
      onSelect={handleSelect}
      onClose={onClose}
      testID={testID}
    />
  );
};

SaveActionSheet.displayName = 'SaveActionSheet';
