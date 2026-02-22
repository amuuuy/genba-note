/**
 * PDF Generation Service
 *
 * Integrates expo-print and expo-sharing for PDF generation and sharing.
 * Follows SPEC 2.7 for PDF output specifications.
 *
 * Free users: PDF generated with "SAMPLE" watermark overlay.
 * Pro users: PDF generated without watermark.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths, Directory } from 'expo-file-system';

import type { PdfTemplateInput, PdfGenerationResult, PdfGenerationOptions, PreviewOrientation } from './types';
import { DEFAULT_SEAL_SIZE } from './types';
import { generateHtmlTemplate, generateFilenameTitle, injectLandscapeCss } from './pdfTemplateService';
import { sanitizeFilename } from '@/utils/filenameUtils';
import { checkProStatus } from '@/subscription/proAccessService';
import { resolveTemplateForUser } from '@/constants/templateOptions';
import { validateDocumentForPdf, formatValidationError } from './pdfValidationService';
import { getSettings } from '@/storage/asyncStorageService';
import { resolveBackgroundImageDataUrl } from '@/utils/imageUtils';
import { injectSampleWatermark } from './watermarkService';
import { injectSinglePageEnforcement } from './singlePageService';

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
 * Remove orphaned PDF files from the cache directory (recursive).
 * Scans subdirectories (e.g. cache/Print/ used by expo-print) to ensure
 * all orphaned PDFs are cleaned up after app crashes.
 * Failures are silently ignored to avoid blocking app startup.
 */
export function cleanupOrphanedPdfCache(): void {
  try {
    const cacheDir = new Directory(Paths.cache);
    if (!cacheDir.exists) return;
    deletePdfFilesRecursive(cacheDir);
  } catch {
    // Silent - cleanup failure should not block app startup
  }
}

function deletePdfFilesRecursive(dir: Directory): void {
  for (const entry of dir.list()) {
    if (entry instanceof File && entry.uri.toLowerCase().endsWith('.pdf')) {
      try { entry.delete(); } catch { /* ignore individual file errors */ }
    } else if (entry instanceof Directory) {
      try { deletePdfFilesRecursive(entry); } catch { /* ignore subdirectory errors */ }
    }
  }
}

/**
 * Delete temporary PDF file
 *
 * @param fileUri - File URI to delete
 */
function cleanupPdfFile(fileUri: string): void {
  try {
    new File(fileUri).delete();
  } catch {
    // Silently ignore cleanup failures
  }
}

/**
 * Generate HTML template, create PDF, and share
 *
 * Free users: PDF is generated with a "SAMPLE" watermark overlay.
 * Pro users: PDF is generated without watermark.
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
  // 1. Check Pro status (for watermark decision)
  const proResult = await checkProStatus();
  const isPro = proResult.isPro;

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

  // 2.5. Load settings to get template preference, seal size, background design
  const settingsResult = await getSettings();
  const settings = settingsResult.success ? settingsResult.data : null;

  // M21: Select template based on document type, enforcing Pro gating at service layer
  const rawTemplateId = input.document.type === 'estimate'
    ? settings?.defaultEstimateTemplateId ?? 'FORMAL_STANDARD'
    : settings?.defaultInvoiceTemplateId ?? 'ACCOUNTING';
  const templateId = resolveTemplateForUser(input.document.type, rawTemplateId, isPro);
  const sealSize = settings?.sealSize ?? DEFAULT_SEAL_SIZE;
  const backgroundDesign = settings?.backgroundDesign ?? 'NONE';

  // Pre-load background image as data URL if IMAGE design is selected
  const backgroundImageDataUrl = await resolveBackgroundImageDataUrl(
    backgroundDesign,
    settings?.backgroundImageUri ?? null
  );

  // 3. Generate HTML template with formal PDF theme
  let { html } = generateHtmlTemplate({
    ...input,
    mode: 'pdf',
    templateId,
    sealSize,
    backgroundDesign,
    backgroundImageDataUrl,
  });

  // 3.5. Inject SAMPLE watermark for free users
  if (!isPro) {
    html = injectSampleWatermark(html);
  }

  // 3.6. Inject landscape CSS if orientation is LANDSCAPE
  if (options?.orientation === 'LANDSCAPE') {
    html = injectLandscapeCss(html);
  }

  // 3.7. Inject single-page enforcement (must be after landscape CSS injection)
  const singlePageResult = injectSinglePageEnforcement(html, options?.orientation === 'LANDSCAPE');
  html = singlePageResult.html;
  if (!singlePageResult.cssInjected || !singlePageResult.scriptInjected) {
    console.warn('[PDF] Single-page enforcement injection incomplete:', {
      cssInjected: singlePageResult.cssInjected,
      scriptInjected: singlePageResult.scriptInjected,
    });
  }

  // 4. Generate PDF (pass orientation for width/height)
  const pdfResult = await generatePdf(html, options?.orientation);
  if (!pdfResult.success) {
    return pdfResult;
  }

  const fileUri = pdfResult.fileUri!;
  let shareUri = fileUri;

  // 4.5. Copy PDF to cacheDirectory with custom filename (M19)
  if (options?.customFilename !== undefined && Paths?.cache?.uri) {
    const sanitized = sanitizeFilename(
      options.customFilename,
      generateFilenameTitle(input.document.documentNo, input.document.type)
    );
    try {
      const sourceFile = new File(fileUri);
      const destFile = new File(Paths.cache, sanitized);
      sourceFile.copy(destFile);
      shareUri = destFile.uri;
    } catch (error) {
      console.warn('[PDF] Failed to copy PDF with custom filename:', error);
      // Best-effort cleanup of partial cache file (security: prevent sensitive data residue)
      try { new File(Paths.cache, sanitized).delete(); } catch { /* ignore */ }
      shareUri = fileUri;
    }
  }

  // 5. Share PDF and cleanup
  try {
    const shareResult = await sharePdf(shareUri);
    return shareResult;
  } finally {
    // 6. Always cleanup temporary PDF file (security: remove sensitive data)
    cleanupPdfFile(shareUri);
    if (shareUri !== fileUri) {
      cleanupPdfFile(fileUri);
    }
  }
}
