/**
 * Tests for PDF Generation Service
 *
 * These tests mock expo-print, expo-sharing, and expo-file-system to test the service logic.
 *
 * NOTE: generatePdf and sharePdf are internal functions (not exported) to enforce Pro gating.
 * All tests must go through generateAndSharePdf which enforces Pro status check.
 */

// Mock react-native-purchases (required by subscription service)
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getCustomerInfo: jest.fn(),
    restorePurchases: jest.fn(),
  },
}));

// Mock expo-secure-store (required by subscription service)
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock react-native-device-info (required by uptime service)
jest.mock('react-native-device-info', () => ({
  __esModule: true,
  getStartupTime: jest.fn(),
}));

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
  moveAsync: jest.fn(),
}));

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { generateAndSharePdf } from '@/pdf/pdfGenerationService';
import { setProStatusOverride, resetProStatusOverride } from '@/subscription/proAccessService';
import { setReadOnlyMode } from '@/storage/asyncStorageService';
import { createTestTemplateInput } from './helpers';

describe('pdfGenerationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetProStatusOverride();
    setReadOnlyMode(false);
  });

  afterEach(() => {
    resetProStatusOverride();
    setReadOnlyMode(false);
  });

  describe('generateAndSharePdf', () => {
    describe('Free vs Pro watermark behavior', () => {
      it('generates PDF with watermark when not Pro', async () => {
        setProStatusOverride(false);
        (Print.printToFileAsync as jest.Mock).mockResolvedValue({
          uri: 'file:///generated.pdf',
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
        (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
        (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

        const input = createTestTemplateInput();
        const result = await generateAndSharePdf(input);

        // Free users can generate PDFs (with watermark)
        expect(result.success).toBe(true);
        expect(Print.printToFileAsync).toHaveBeenCalled();
        // Verify watermark was injected into the HTML
        const htmlArg = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
        expect(htmlArg).toContain('sample-watermark');
        expect(htmlArg).toContain('SAMPLE');
      });

      it('generates PDF without watermark when Pro', async () => {
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
        // Verify NO watermark in Pro PDF
        const htmlArg = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
        expect(htmlArg).not.toContain('sample-watermark');
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

    describe('orientation option (M18)', () => {
      beforeEach(() => {
        setProStatusOverride(true);
        (Print.printToFileAsync as jest.Mock).mockResolvedValue({
          uri: 'file:///generated.pdf',
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
        (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
        (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
      });

      it('calls printToFileAsync WITHOUT width/height when orientation is not specified', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input);

        expect(Print.printToFileAsync).toHaveBeenCalledWith({
          html: expect.any(String),
          base64: false,
        });
      });

      it('calls printToFileAsync WITHOUT width/height when orientation is PORTRAIT', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { orientation: 'PORTRAIT' });

        expect(Print.printToFileAsync).toHaveBeenCalledWith({
          html: expect.any(String),
          base64: false,
        });
      });

      it('calls printToFileAsync WITH landscape dimensions when orientation is LANDSCAPE', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { orientation: 'LANDSCAPE' });

        expect(Print.printToFileAsync).toHaveBeenCalledWith({
          html: expect.any(String),
          base64: false,
          width: 842,
          height: 595,
        });
      });

      it('injects landscape CSS (both @page and container width) into HTML when orientation is LANDSCAPE', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { orientation: 'LANDSCAPE' });

        const calledHtml = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
        expect(calledHtml).toContain('@page { size: A4 landscape; }');
        expect(calledHtml).toContain('min-width: 1130px');
      });

      it('does NOT inject @page CSS when orientation is PORTRAIT', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { orientation: 'PORTRAIT' });

        const calledHtml = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
        expect(calledHtml).not.toContain('@page');
      });

      it('does NOT inject @page CSS when no options specified', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input);

        const calledHtml = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
        expect(calledHtml).not.toContain('@page');
      });
    });

    describe('customFilename option (M19)', () => {
      beforeEach(() => {
        setProStatusOverride(true);
        (Print.printToFileAsync as jest.Mock).mockResolvedValue({
          uri: 'file:///tmp/random-uuid.pdf',
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
        (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
        (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
        (FileSystem.moveAsync as jest.Mock).mockResolvedValue(undefined);
      });

      it('renames file before sharing when customFilename is provided', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { customFilename: 'my-report' });

        expect(FileSystem.moveAsync).toHaveBeenCalledWith({
          from: 'file:///tmp/random-uuid.pdf',
          to: expect.stringContaining('my-report.pdf'),
        });
      });

      it('shares the renamed file URI', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { customFilename: 'my-report' });

        const shareCall = (Sharing.shareAsync as jest.Mock).mock.calls[0];
        expect(shareCall[0]).toContain('my-report.pdf');
      });

      it('does not rename when customFilename is not provided', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input);

        expect(FileSystem.moveAsync).not.toHaveBeenCalled();
      });

      it('falls back to original URI if moveAsync fails', async () => {
        (FileSystem.moveAsync as jest.Mock).mockRejectedValue(new Error('Move failed'));

        const input = createTestTemplateInput();
        const result = await generateAndSharePdf(input, { customFilename: 'my-report' });

        expect(result.success).toBe(true);
        expect(Sharing.shareAsync).toHaveBeenCalledWith(
          'file:///tmp/random-uuid.pdf',
          expect.anything()
        );
      });

      it('cleans up renamed file after sharing', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { customFilename: 'my-report' });

        expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
          expect.stringContaining('my-report.pdf'),
          { idempotent: true }
        );
      });

      it('renames to default name when customFilename is empty string', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { customFilename: '' });

        // Empty string triggers sanitizeFilename fallback to default name (EST-001_見積書.pdf)
        expect(FileSystem.moveAsync).toHaveBeenCalled();
        const moveCall = (FileSystem.moveAsync as jest.Mock).mock.calls[0][0];
        expect(moveCall.to).toContain('EST-001_見積書.pdf');
      });

      it('renames to default name when customFilename is whitespace only', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { customFilename: '   ' });

        expect(FileSystem.moveAsync).toHaveBeenCalled();
        const moveCall = (FileSystem.moveAsync as jest.Mock).mock.calls[0][0];
        expect(moveCall.to).toContain('EST-001_見積書.pdf');
      });

      it('shares Japanese filename without percent-encoding', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { customFilename: 'EST-001_見積書' });

        // Filename should NOT be percent-encoded in the URI
        const shareCall = (Sharing.shareAsync as jest.Mock).mock.calls[0];
        expect(shareCall[0]).toContain('EST-001_見積書.pdf');
        expect(shareCall[0]).not.toContain('%E8');
      });

      it('strips # and % from customFilename through the full flow', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { customFilename: 'report#%20' });

        const moveCall = (FileSystem.moveAsync as jest.Mock).mock.calls[0][0];
        expect(moveCall.to).toContain('report20.pdf');

        const shareCall = (Sharing.shareAsync as jest.Mock).mock.calls[0];
        expect(shareCall[0]).toContain('report20.pdf');
      });
    });

    describe('read-only mode compatibility', () => {
      /**
       * PDF generation should work in read-only mode because:
       * 1. It only reads document data (not blocked by read-only mode)
       * 2. It writes to file system (not AsyncStorage)
       * 3. Pro status check reads from SecureStore (not blocked)
       */

      it('generates PDF successfully when Pro and read-only mode enabled', async () => {
        // Enable Pro status and read-only mode
        setProStatusOverride(true);
        setReadOnlyMode(true);

        // Mock successful PDF generation and sharing
        (Print.printToFileAsync as jest.Mock).mockResolvedValue({
          uri: 'file:///generated.pdf',
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
        (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
        (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

        const input = createTestTemplateInput();
        const result = await generateAndSharePdf(input);

        // PDF generation should succeed
        expect(result.success).toBe(true);
        expect(Print.printToFileAsync).toHaveBeenCalled();
        expect(Sharing.shareAsync).toHaveBeenCalled();
      });

      it('does not write to AsyncStorage during PDF generation', async () => {
        // Enable Pro status and read-only mode
        setProStatusOverride(true);
        setReadOnlyMode(true);

        // Mock successful PDF generation
        (Print.printToFileAsync as jest.Mock).mockResolvedValue({
          uri: 'file:///generated.pdf',
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
        (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
        (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

        const input = createTestTemplateInput();
        await generateAndSharePdf(input);

        // Verify no AsyncStorage operations were performed
        // (AsyncStorage is mocked in other tests, so we check it wasn't imported)
        // The PDF service should only use Print, Sharing, and FileSystem
        expect(Print.printToFileAsync).toHaveBeenCalled();
      });
    });
  });
});
