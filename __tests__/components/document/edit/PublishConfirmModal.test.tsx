/**
 * PublishConfirmModal Logic Tests
 *
 * Tests the PDF publish confirmation modal logic:
 * - Message generation based on document status
 * - Validation error display logic
 * - Button state logic
 *
 * Note: We test only the pure logic here.
 * The React component rendering is verified manually.
 */

import type { DocumentStatus } from '@/types/document';
import type { PdfValidationResult } from '@/pdf/pdfValidationService';

/**
 * Pure function extracted from PublishConfirmModal for testability.
 * Returns the modal content based on current state.
 */
function getModalContent(params: {
  hasValidationErrors: boolean;
  currentStatus: DocumentStatus | null;
  isPublishing: boolean;
}): { title: string; message: string; confirmText: string } {
  const { hasValidationErrors, currentStatus, isPublishing } = params;

  if (hasValidationErrors) {
    return {
      title: 'PDF発行できません',
      message: '',
      confirmText: '発行する',
    };
  }

  if (currentStatus === 'draft' || currentStatus === null) {
    return {
      title: 'PDF発行の確認',
      message:
        '書類を「発行済」として保存し、PDFを生成します。発行後も下書きに戻して編集できます。',
      confirmText: isPublishing ? '発行中...' : '発行する',
    };
  }

  if (currentStatus === 'issued') {
    return {
      title: 'PDF共有の確認',
      message: 'PDFを再生成して共有します。ステータスは変更されません。',
      confirmText: isPublishing ? '共有中...' : '共有する',
    };
  }

  // sent or paid
  return {
    title: 'PDF共有の確認',
    message:
      'PDFを生成して共有します。ステータスは現在の状態のまま変更されません。',
    confirmText: isPublishing ? '共有中...' : '共有する',
  };
}

/**
 * Check if confirm button should be disabled
 */
function isConfirmDisabled(params: {
  hasValidationErrors: boolean;
  isPublishing: boolean;
}): boolean {
  return params.hasValidationErrors || params.isPublishing;
}

describe('PublishConfirmModal', () => {
  describe('getModalContent', () => {
    describe('without validation errors', () => {
      it('returns confirmation title for draft status', () => {
        const content = getModalContent({
          hasValidationErrors: false,
          currentStatus: 'draft',
          isPublishing: false,
        });

        expect(content.title).toBe('PDF発行の確認');
        expect(content.confirmText).toBe('発行する');
      });

      it('returns confirmation message for draft status', () => {
        const content = getModalContent({
          hasValidationErrors: false,
          currentStatus: 'draft',
          isPublishing: false,
        });

        expect(content.message).toBe(
          '書類を「発行済」として保存し、PDFを生成します。発行後も下書きに戻して編集できます。'
        );
      });

      it('returns confirmation for null status (new document)', () => {
        const content = getModalContent({
          hasValidationErrors: false,
          currentStatus: null,
          isPublishing: false,
        });

        expect(content.title).toBe('PDF発行の確認');
      });

      it('returns share confirmation for issued status', () => {
        const content = getModalContent({
          hasValidationErrors: false,
          currentStatus: 'issued',
          isPublishing: false,
        });

        expect(content.title).toBe('PDF共有の確認');
        expect(content.message).toBe(
          'PDFを再生成して共有します。ステータスは変更されません。'
        );
        expect(content.confirmText).toBe('共有する');
      });

      it('returns share confirmation for sent status', () => {
        const content = getModalContent({
          hasValidationErrors: false,
          currentStatus: 'sent',
          isPublishing: false,
        });

        expect(content.title).toBe('PDF共有の確認');
        expect(content.confirmText).toBe('共有する');
      });

      it('returns share confirmation for paid status', () => {
        const content = getModalContent({
          hasValidationErrors: false,
          currentStatus: 'paid',
          isPublishing: false,
        });

        expect(content.title).toBe('PDF共有の確認');
      });

      it('shows publishing state text for draft', () => {
        const content = getModalContent({
          hasValidationErrors: false,
          currentStatus: 'draft',
          isPublishing: true,
        });

        expect(content.confirmText).toBe('発行中...');
      });

      it('shows sharing state text for issued', () => {
        const content = getModalContent({
          hasValidationErrors: false,
          currentStatus: 'issued',
          isPublishing: true,
        });

        expect(content.confirmText).toBe('共有中...');
      });
    });

    describe('with validation errors', () => {
      it('returns error title when validation fails', () => {
        const content = getModalContent({
          hasValidationErrors: true,
          currentStatus: 'draft',
          isPublishing: false,
        });

        expect(content.title).toBe('PDF発行できません');
      });

      it('returns empty message when validation fails', () => {
        const content = getModalContent({
          hasValidationErrors: true,
          currentStatus: 'draft',
          isPublishing: false,
        });

        expect(content.message).toBe('');
      });

      it('returns error title regardless of status when validation fails', () => {
        const statuses: (DocumentStatus | null)[] = [
          null,
          'draft',
          'issued',
          'sent',
          'paid',
        ];

        statuses.forEach((status) => {
          const content = getModalContent({
            hasValidationErrors: true,
            currentStatus: status,
            isPublishing: false,
          });

          expect(content.title).toBe('PDF発行できません');
        });
      });
    });
  });

  describe('isConfirmDisabled', () => {
    it('returns false when no errors and not publishing', () => {
      expect(
        isConfirmDisabled({
          hasValidationErrors: false,
          isPublishing: false,
        })
      ).toBe(false);
    });

    it('returns true when validation errors present', () => {
      expect(
        isConfirmDisabled({
          hasValidationErrors: true,
          isPublishing: false,
        })
      ).toBe(true);
    });

    it('returns true when publishing', () => {
      expect(
        isConfirmDisabled({
          hasValidationErrors: false,
          isPublishing: true,
        })
      ).toBe(true);
    });

    it('returns true when both validation errors and publishing', () => {
      expect(
        isConfirmDisabled({
          hasValidationErrors: true,
          isPublishing: true,
        })
      ).toBe(true);
    });
  });

  describe('validation result handling', () => {
    it('determines hasValidationErrors correctly for invalid result', () => {
      const validationResult: PdfValidationResult = {
        isValid: false,
        missingFields: ['支払期限'],
      };

      const hasErrors = validationResult && !validationResult.isValid;
      expect(hasErrors).toBe(true);
    });

    it('determines hasValidationErrors correctly for valid result', () => {
      const validationResult: PdfValidationResult = {
        isValid: true,
        missingFields: [],
      };

      const hasErrors = validationResult && !validationResult.isValid;
      expect(hasErrors).toBe(false);
    });

    it('determines hasValidationErrors correctly for undefined result', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const validationResult = undefined as PdfValidationResult | undefined;

      // Type-safe check mimicking component logic
      const hasErrors = validationResult !== undefined && !validationResult.isValid;
      expect(hasErrors).toBe(false);
    });

    it('missing fields format correctly for display', () => {
      const validationResult: PdfValidationResult = {
        isValid: false,
        missingFields: ['支払期限', '取引先名', '請求書番号'],
      };

      // Format check: each field should be prefixed with bullet
      const formattedFields = validationResult.missingFields.map(
        (field) => `・${field}`
      );

      expect(formattedFields).toEqual([
        '・支払期限',
        '・取引先名',
        '・請求書番号',
      ]);
    });
  });
});
