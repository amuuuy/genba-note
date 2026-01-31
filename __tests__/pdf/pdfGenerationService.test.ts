/**
 * Tests for PDF Generation Service
 *
 * These tests mock expo-print, expo-sharing, and expo-file-system to test the service logic.
 *
 * NOTE: generatePdf and sharePdf are internal functions (not exported) to enforce Pro gating.
 * All tests must go through generateAndSharePdf which enforces Pro status check.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { generateAndSharePdf } from '@/pdf/pdfGenerationService';
import { setProStatusOverride, resetProStatusOverride } from '@/pdf/proGateService';
import { createTestTemplateInput } from './helpers';

// Mock expo-print, expo-sharing, and expo-file-system
jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  deleteAsync: jest.fn(),
}));

describe('pdfGenerationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetProStatusOverride();
  });

  afterEach(() => {
    resetProStatusOverride();
  });

  describe('generateAndSharePdf', () => {
    describe('Pro status enforcement', () => {
      it('returns PRO_REQUIRED error when not Pro', async () => {
        // Default is not Pro
        const input = createTestTemplateInput();
        const result = await generateAndSharePdf(input);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('PRO_REQUIRED');
        expect(result.error?.message).toContain('Pro subscription');
        expect(Print.printToFileAsync).not.toHaveBeenCalled();
      });

      it('proceeds with PDF generation when Pro', async () => {
        setProStatusOverride(true);
        (Print.printToFileAsync as jest.Mock).mockResolvedValue({
          uri: 'file:///generated.pdf',
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
        (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
        (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

        const input = createTestTemplateInput();
        const result = await generateAndSharePdf(input);

        expect(result.success).toBe(true);
        expect(Print.printToFileAsync).toHaveBeenCalled();
      });
    });

    describe('with Pro status', () => {
      beforeEach(() => {
        setProStatusOverride(true);
      });

      describe('PDF generation (internal)', () => {
        it('calls Print.printToFileAsync with generated HTML', async () => {
          (Print.printToFileAsync as jest.Mock).mockResolvedValue({
            uri: 'file:///generated.pdf',
          });
          (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
          (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
          (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

          const input = createTestTemplateInput();
          await generateAndSharePdf(input);

          expect(Print.printToFileAsync).toHaveBeenCalledWith({
            html: expect.any(String),
            base64: false,
          });
        });

        it('returns GENERATION_FAILED error on print failure', async () => {
          (Print.printToFileAsync as jest.Mock).mockRejectedValue(
            new Error('Print failed')
          );

          const input = createTestTemplateInput();
          const result = await generateAndSharePdf(input);

          expect(result.success).toBe(false);
          expect(result.error?.code).toBe('GENERATION_FAILED');
          expect(result.error?.message).toContain('Print failed');
          expect(Sharing.shareAsync).not.toHaveBeenCalled();
        });
      });

      describe('PDF sharing (internal)', () => {
        it('calls Sharing.shareAsync with file URI', async () => {
          (Print.printToFileAsync as jest.Mock).mockResolvedValue({
            uri: 'file:///generated.pdf',
          });
          (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
          (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
          (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

          const input = createTestTemplateInput();
          await generateAndSharePdf(input);

          expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///generated.pdf', {
            mimeType: 'application/pdf',
            UTI: 'com.adobe.pdf',
          });
        });

        it('returns SHARE_FAILED when sharing not available', async () => {
          (Print.printToFileAsync as jest.Mock).mockResolvedValue({
            uri: 'file:///generated.pdf',
          });
          (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);
          (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

          const input = createTestTemplateInput();
          const result = await generateAndSharePdf(input);

          expect(result.success).toBe(false);
          expect(result.error?.code).toBe('SHARE_FAILED');
        });

        it('returns SHARE_FAILED when share throws', async () => {
          (Print.printToFileAsync as jest.Mock).mockResolvedValue({
            uri: 'file:///generated.pdf',
          });
          (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
          (Sharing.shareAsync as jest.Mock).mockRejectedValue(
            new Error('Share cancelled')
          );
          (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

          const input = createTestTemplateInput();
          const result = await generateAndSharePdf(input);

          expect(result.success).toBe(false);
          expect(result.error?.code).toBe('SHARE_FAILED');
        });
      });

      describe('full flow', () => {
        it('generates HTML and PDF, then shares', async () => {
          (Print.printToFileAsync as jest.Mock).mockResolvedValue({
            uri: 'file:///generated.pdf',
          });
          (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
          (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
          (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

          const input = createTestTemplateInput();
          const result = await generateAndSharePdf(input);

          expect(result.success).toBe(true);
          expect(Print.printToFileAsync).toHaveBeenCalled();
          expect(Sharing.shareAsync).toHaveBeenCalled();
        });

        it('cleans up PDF file after sharing', async () => {
          (Print.printToFileAsync as jest.Mock).mockResolvedValue({
            uri: 'file:///generated.pdf',
          });
          (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
          (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
          (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

          const input = createTestTemplateInput();
          await generateAndSharePdf(input);

          expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
            'file:///generated.pdf',
            { idempotent: true }
          );
        });

        it('cleans up PDF file even when sharing fails', async () => {
          (Print.printToFileAsync as jest.Mock).mockResolvedValue({
            uri: 'file:///generated.pdf',
          });
          (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
          (Sharing.shareAsync as jest.Mock).mockRejectedValue(
            new Error('Share failed')
          );
          (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

          const input = createTestTemplateInput();
          await generateAndSharePdf(input);

          expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
            'file:///generated.pdf',
            { idempotent: true }
          );
        });
      });
    });
  });
});
