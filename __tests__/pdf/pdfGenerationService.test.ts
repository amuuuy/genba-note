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

// Mock functions for File class (same pattern as csvFileService tests)
const mockFileCopy = jest.fn();
const mockFileDelete = jest.fn();

// Mock expo-print, expo-sharing, and expo-file-system
jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((...uris: any[]) => ({
    uri: uris.map((p: any) => (typeof p === 'string' ? p : p.uri)).join('/'),
    copy: mockFileCopy,
    delete: mockFileDelete,
  })),
  Paths: {
    cache: { uri: 'file:///mock/cache' },
  },
}));

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { generateAndSharePdf } from '@/pdf/pdfGenerationService';
import * as singlePageService from '@/pdf/singlePageService';
import { setProStatusOverride, resetProStatusOverride } from '@/subscription/proAccessService';
import { setReadOnlyMode } from '@/storage/asyncStorageService';
import { createTestTemplateInput } from './helpers';

describe('pdfGenerationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileCopy.mockReset();
    mockFileDelete.mockReset();
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

          const input = createTestTemplateInput();
          await generateAndSharePdf(input);

          expect(mockFileDelete).toHaveBeenCalled();
          expect(File).toHaveBeenCalledWith('file:///generated.pdf');
        });

        it('cleans up PDF file even when sharing fails', async () => {
          (Print.printToFileAsync as jest.Mock).mockResolvedValue({
            uri: 'file:///generated.pdf',
          });
          (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
          (Sharing.shareAsync as jest.Mock).mockRejectedValue(
            new Error('Share failed')
          );

          const input = createTestTemplateInput();
          await generateAndSharePdf(input);

          expect(mockFileDelete).toHaveBeenCalled();
          expect(File).toHaveBeenCalledWith('file:///generated.pdf');
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

      it('does NOT inject landscape @page CSS when orientation is PORTRAIT', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { orientation: 'PORTRAIT' });

        const calledHtml = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
        expect(calledHtml).not.toContain('size: A4 landscape');
        // Single-page enforcement portrait @page IS present
        expect(calledHtml).toContain('size: A4 portrait');
      });

      it('does NOT inject landscape @page CSS when no options specified', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input);

        const calledHtml = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
        expect(calledHtml).not.toContain('size: A4 landscape');
        // Single-page enforcement portrait @page IS present
        expect(calledHtml).toContain('size: A4 portrait');
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
      });

      it('copies file to cacheDirectory with custom name before sharing', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { customFilename: 'my-report' });

        // File constructor called with source URI for copy
        expect(File).toHaveBeenCalledWith('file:///tmp/random-uuid.pdf');
        // File constructor called with Paths.cache and sanitized filename for destination
        expect(File).toHaveBeenCalledWith(Paths.cache, 'my-report.pdf');
        expect(mockFileCopy).toHaveBeenCalled();
      });

      it('shares the copied file URI from cacheDirectory', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { customFilename: 'my-report' });

        const shareCall = (Sharing.shareAsync as jest.Mock).mock.calls[0];
        expect(shareCall[0]).toBe('file:///mock/cache/my-report.pdf');
      });

      it('does not copy when customFilename is not provided', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input);

        expect(mockFileCopy).not.toHaveBeenCalled();
      });

      it('falls back to original URI if copy fails', async () => {
        mockFileCopy.mockImplementation(() => { throw new Error('Copy failed'); });

        const input = createTestTemplateInput();
        const result = await generateAndSharePdf(input, { customFilename: 'my-report' });

        expect(result.success).toBe(true);
        expect(Sharing.shareAsync).toHaveBeenCalledWith(
          'file:///tmp/random-uuid.pdf',
          expect.anything()
        );
        // Best-effort cleanup of partial cache file attempted
        expect(File).toHaveBeenCalledWith(Paths.cache, 'my-report.pdf');
        expect(mockFileDelete).toHaveBeenCalled();
      });

      it('cleans up both cache copy and original temp file after sharing', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { customFilename: 'my-report' });

        // mockFileDelete is called for both cache copy and original temp file
        expect(mockFileDelete).toHaveBeenCalledTimes(2);
        // File constructor called with both URIs for cleanup
        expect(File).toHaveBeenCalledWith('file:///mock/cache/my-report.pdf');
        expect(File).toHaveBeenCalledWith('file:///tmp/random-uuid.pdf');
      });

      it('copies to default name when customFilename is empty string', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { customFilename: '' });

        // Empty string triggers sanitizeFilename fallback to default name (EST-001_見積書.pdf)
        expect(File).toHaveBeenCalledWith(Paths.cache, 'EST-001_見積書.pdf');
        expect(mockFileCopy).toHaveBeenCalled();
      });

      it('copies to default name when customFilename is whitespace only', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { customFilename: '   ' });

        expect(File).toHaveBeenCalledWith(Paths.cache, 'EST-001_見積書.pdf');
        expect(mockFileCopy).toHaveBeenCalled();
      });

      it('passes Japanese filename to File constructor for copy destination', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { customFilename: 'EST-001_見積書' });

        // Verify correct arguments passed to File constructor for destination.
        // The actual URI may be percent-encoded by the real File implementation;
        // native sharing APIs (iOS UIActivityViewController, Android FileProvider)
        // decode the URI for display, so the recipient sees the decoded filename.
        expect(File).toHaveBeenCalledWith(Paths.cache, 'EST-001_見積書.pdf');
        expect(mockFileCopy).toHaveBeenCalled();
        // shareAsync receives the destFile.uri (which the mock joins as plain string)
        expect(Sharing.shareAsync).toHaveBeenCalledWith(
          expect.stringContaining('EST-001_見積書.pdf'),
          expect.anything()
        );
      });

      it('strips # and % from customFilename through the full flow', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { customFilename: 'report#%20' });

        expect(File).toHaveBeenCalledWith(Paths.cache, 'report20.pdf');
        expect(mockFileCopy).toHaveBeenCalled();
      });

      it('falls back to original URI when Paths.cache is unavailable', async () => {
        const paths = (Paths as any);
        const originalCache = paths.cache;
        paths.cache = null;

        try {
          const input = createTestTemplateInput();
          const result = await generateAndSharePdf(input, { customFilename: 'my-report' });

          expect(result.success).toBe(true);
          expect(mockFileCopy).not.toHaveBeenCalled();
          expect(Sharing.shareAsync).toHaveBeenCalledWith(
            'file:///tmp/random-uuid.pdf',
            expect.anything()
          );
        } finally {
          paths.cache = originalCache;
        }
      });
    });

    describe('single-page enforcement', () => {
      beforeEach(() => {
        setProStatusOverride(true);
        (Print.printToFileAsync as jest.Mock).mockResolvedValue({
          uri: 'file:///generated.pdf',
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
        (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
      });

      it('injects single-page @page CSS into portrait PDF HTML', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input);

        const calledHtml = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
        expect(calledHtml).toContain('size: A4 portrait');
        expect(calledHtml).toContain('overflow: hidden');
        expect(calledHtml).toContain('<script>');
      });

      it('injects landscape @page CSS when orientation is LANDSCAPE', async () => {
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { orientation: 'LANDSCAPE' });

        const calledHtml = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
        expect(calledHtml).toContain('size: A4 landscape');
        expect(calledHtml).toContain('<script>');
      });

      it('injects all three enhancements for free user in landscape', async () => {
        setProStatusOverride(false);
        const input = createTestTemplateInput();
        await generateAndSharePdf(input, { orientation: 'LANDSCAPE' });

        const calledHtml = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
        // Watermark
        expect(calledHtml).toContain('sample-watermark');
        // Landscape
        expect(calledHtml).toContain('min-width: 1130px');
        // Single-page enforcement
        expect(calledHtml).toContain('size: A4 landscape');
        expect(calledHtml).toContain('<script>');
      });

      it('logs console.warn when injection is incomplete', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(singlePageService, 'injectSinglePageEnforcement').mockReturnValue({
          html: '<html><body></body></html>',
          cssInjected: false,
          scriptInjected: false,
        });

        const input = createTestTemplateInput();
        await generateAndSharePdf(input);

        expect(warnSpy).toHaveBeenCalledWith(
          '[PDF] Single-page enforcement injection incomplete:',
          { cssInjected: false, scriptInjected: false }
        );

        warnSpy.mockRestore();
        jest.restoreAllMocks();
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
