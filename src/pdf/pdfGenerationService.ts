/**
 * PDF Generation Service
 *
 * Integrates expo-print and expo-sharing for PDF generation and sharing.
 * Follows SPEC 2.7 for PDF output specifications.
 *
 * IMPORTANT: generateAndSharePdf enforces Pro status check at the service layer.
 * This ensures the business rule is enforced regardless of how the service is called.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

import type { PdfTemplateInput, PdfGenerationResult, PdfGenerationOptions, PreviewOrientation } from './types';
import { DEFAULT_INVOICE_TEMPLATE_TYPE, DEFAULT_SEAL_SIZE } from './types';
import { generateHtmlTemplate, generateFilenameTitle, injectLandscapeCss } from './pdfTemplateService';
import { sanitizeFilename } from '@/utils/filenameUtils';
import { checkProStatus } from './proGateService';
import { validateDocumentForPdf, formatValidationError } from './pdfValidationService';
import { getSettings } from '@/storage/asyncStorageService';

/**
 * Generate PDF from HTML (internal function)
 *
 * SECURITY: This function is NOT exported to enforce Pro gating.
 * All PDF generation must go through generateAndSharePdf.
 *
 * @param html - HTML content to convert to PDF
 * @returns PdfGenerationResult with fileUri on success
 */
async function generatePdf(html: string, orientation?: PreviewOrientation): Promise<PdfGenerationResult> {
  try {
    const printOptions: { html: string; base64: boolean; width?: number; height?: number } = {
      html,
      base64: false,
    };

    // A4 landscape dimensions in points (842 x 595)
    if (orientation === 'LANDSCAPE') {
      printOptions.width = 842;
      printOptions.height = 595;
    }

    const result = await Print.printToFileAsync(printOptions);

    return {
      success: true,
      fileUri: result.uri,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'GENERATION_FAILED',
        message: error instanceof Error ? error.message : 'PDF generation failed',
        originalError: error instanceof Error ? error : undefined,
      },
    };
  }
}

/**
 * Share PDF file (internal function)
 *
 * SECURITY: This function is NOT exported to enforce Pro gating.
 * All PDF sharing must go through generateAndSharePdf.
 *
 * @param fileUri - File URI of the PDF to share
 * @returns PdfGenerationResult
 */
async function sharePdf(fileUri: string): Promise<PdfGenerationResult> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return {
        success: false,
        error: {
          code: 'SHARE_FAILED',
          message: 'Sharing is not available on this device',
        },
      };
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
    });

    return {
      success: true,
      fileUri,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'SHARE_FAILED',
        message: error instanceof Error ? error.message : 'Share failed',
        originalError: error instanceof Error ? error : undefined,
      },
    };
  }
}

/**
 * Delete temporary PDF file
 *
 * @param fileUri - File URI to delete
 */
async function cleanupPdfFile(fileUri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  } catch {
    // Silently ignore cleanup failures
  }
}

/**
 * Generate HTML template, create PDF, and share
 *
 * IMPORTANT: This function enforces Pro status check at the service layer.
 * If not Pro, returns PRO_REQUIRED error immediately.
 *
 * NOTE: PDF output always uses formal monochrome theme ('pdf' mode).
 * The 'mode' property in input is ignored; formal theme is enforced for
 * professional business document quality.
 *
 * @param input - Template input with document and sensitive snapshot (mode is ignored)
 * @returns PdfGenerationResult
 */
export async function generateAndSharePdf(
  input: Omit<PdfTemplateInput, 'mode'>,
  options?: PdfGenerationOptions
): Promise<PdfGenerationResult> {
  // 1. Enforce Pro status check at service layer
  const proResult = await checkProStatus();
  if (!proResult.isPro) {
    return {
      success: false,
      error: {
        code: 'PRO_REQUIRED',
        message: 'PDF generation requires Pro subscription',
      },
    };
  }

  // 2. Validate required fields for PDF generation
  const validationResult = validateDocumentForPdf(input.document);
  if (!validationResult.isValid) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: formatValidationError(validationResult),
      },
    };
  }

  // 2.5. Load settings to get invoice template preference and seal size
  const settingsResult = await getSettings();
  const invoiceTemplateType = settingsResult.success
    ? settingsResult.data?.invoiceTemplateType ?? DEFAULT_INVOICE_TEMPLATE_TYPE
    : DEFAULT_INVOICE_TEMPLATE_TYPE;
  const sealSize = settingsResult.success
    ? settingsResult.data?.sealSize ?? DEFAULT_SEAL_SIZE
    : DEFAULT_SEAL_SIZE;

  // 3. Generate HTML template with formal PDF theme
  let { html } = generateHtmlTemplate({
    ...input,
    mode: 'pdf',
    invoiceTemplateType,
    sealSize,
  });

  // 3.5. Inject landscape CSS if orientation is LANDSCAPE
  if (options?.orientation === 'LANDSCAPE') {
    html = injectLandscapeCss(html);
  }

  // 4. Generate PDF (pass orientation for width/height)
  const pdfResult = await generatePdf(html, options?.orientation);
  if (!pdfResult.success) {
    return pdfResult;
  }

  const fileUri = pdfResult.fileUri!;
  let shareUri = fileUri;

  // 4.5. Rename PDF if customFilename is provided (M19)
  if (options?.customFilename !== undefined) {
    try {
      const sanitized = sanitizeFilename(
        options.customFilename,
        generateFilenameTitle(input.document.documentNo, input.document.type)
      );
      const dirPath = fileUri.substring(0, fileUri.lastIndexOf('/') + 1);
      const targetUri = dirPath + encodeURIComponent(sanitized);
      await FileSystem.moveAsync({ from: fileUri, to: targetUri });
      shareUri = targetUri;
    } catch {
      // If rename fails, fall back to sharing the original temp file
      shareUri = fileUri;
    }
  }

  // 5. Share PDF and cleanup
  try {
    const shareResult = await sharePdf(shareUri);
    return shareResult;
  } finally {
    // 6. Always cleanup temporary PDF file (security: remove sensitive data)
    await cleanupPdfFile(shareUri);
    if (shareUri !== fileUri) {
      await cleanupPdfFile(fileUri);
    }
  }
}
