/**
 * Document Labels Utility
 *
 * Returns doc.type-aware labels for all templates.
 * Centralizes estimate/invoice label branching so each template
 * doesn't duplicate the same conditional logic.
 */

import type { DocumentType } from '@/types/document';

export interface DocumentLabels {
  /** Document title without spacing (e.g., '見積書' / '請求書') */
  title: string;
  /** Date label (e.g., '見積日' / '請求日') */
  dateLabel: string;
  /** Number label (e.g., '見積書番号' / '請求書番号') */
  numberLabel: string;
  /** Period field label (e.g., '見積有効期限' / '支払期限') */
  periodLabel: string;
  /** Period field key on the document (validUntil or dueDate) */
  periodField: 'validUntil' | 'dueDate';
  /** Greeting text */
  greeting: string;
  /** Whether bank info section should be shown */
  showBankInfo: boolean;
  /** Whether registration number (適格請求書番号) should be shown */
  showRegistrationNumber: boolean;
}

/**
 * Get document labels based on document type.
 * Used by all 5 templates for consistent label branching.
 */
export function getDocumentLabels(docType: DocumentType): DocumentLabels {
  if (docType === 'estimate') {
    return {
      title: '見積書',
      dateLabel: '見積日',
      numberLabel: '見積書番号',
      periodLabel: '見積有効期限',
      periodField: 'validUntil',
      greeting: '下記のとおり御見積申し上げます。',
      showBankInfo: false,
      showRegistrationNumber: false,
    };
  }

  return {
    title: '請求書',
    dateLabel: '請求日',
    numberLabel: '請求書番号',
    periodLabel: '支払期限',
    periodField: 'dueDate',
    greeting: '下記のとおり、御請求申し上げます。',
    showBankInfo: true,
    showRegistrationNumber: true,
  };
}
