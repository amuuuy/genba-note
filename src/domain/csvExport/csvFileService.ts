/**
 * CSV File Service
 *
 * Async functions for file operations and expo-sharing integration.
 * Pro feature gating is enforced at this layer (same pattern as pdfGenerationService).
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { CsvExportResult, CsvExportOptions } from './types';
import { successResult, errorResult, createCsvExportError } from './types';
import { generateCsvFilename } from './csvFormatService';
import { generateCsvFromDocuments } from './csvExportService';
import { filterDocuments } from '@/storage/asyncStorageService';
import { checkProStatus } from '@/subscription/proAccessService';

/**
 * Write CSV content to temporary file
 *
 * @param content - CSV content string
 * @param filename - Target filename
 * @returns File URI on success
 */
async function writeCsvFile(
  content: string,
  filename: string
): Promise<CsvExportResult<string>> {
  try {
    const file = new File(Paths.cache, filename);
    await file.write(content);

    return successResult(file.uri);
  } catch (error) {
    return errorResult(
      createCsvExportError(
        'FILE_WRITE_ERROR',
        error instanceof Error ? error.message : 'Failed to write CSV file',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Share CSV file via expo-sharing
 *
 * @param fileUri - URI of the file to share
 * @returns CsvExportResult
 */
async function shareCsvFile(fileUri: string): Promise<CsvExportResult<void>> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return errorResult(
        createCsvExportError(
          'SHARE_FAILED',
          'Sharing is not available on this device'
        )
      );
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
    });

    return successResult(undefined);
  } catch (error) {
    // Check if user cancelled
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('cancel') || errorMessage.includes('dismissed')) {
      return errorResult(
        createCsvExportError('SHARE_CANCELLED', 'Export was cancelled')
      );
    }

    return errorResult(
      createCsvExportError(
        'SHARE_FAILED',
        error instanceof Error ? error.message : 'Share failed',
        error instanceof Error ? error : undefined
      )
    );
  }
}

/**
 * Cleanup temporary CSV file
 *
 * @param fileUri - URI of the file to delete
 */
async function cleanupCsvFile(fileUri: string): Promise<void> {
  try {
    const file = new File(fileUri);
    await file.delete();
  } catch {
    // Silently ignore cleanup failures
  }
}

/**
 * Export invoices to CSV and share
 *
 * IMPORTANT: This function enforces Pro status check at the service layer.
 * If not Pro, returns PRO_REQUIRED error immediately.
 *
 * Flow:
 * 1. Check Pro status
 * 2. Fetch invoices from storage
 * 3. Filter by period and status
 * 4. Generate CSV content
 * 5. Write to temporary file
 * 6. Share via expo-sharing
 * 7. Cleanup temporary file
 *
 * @param options - Export options (periodType, referenceDate)
 * @returns CsvExportResult with rowCount on success
 */
export async function exportInvoicesToCsv(
  options: CsvExportOptions
): Promise<CsvExportResult<{ rowCount: number }>> {
  const { periodType, referenceDate } = options;

  // 1. Enforce Pro status check
  const proResult = await checkProStatus();
  if (!proResult.isPro) {
    return errorResult(
      createCsvExportError(
        'PRO_REQUIRED',
        'CSV export requires Pro subscription'
      )
    );
  }

  // 2. Fetch invoices from storage
  const storageResult = await filterDocuments(
    { type: 'invoice', status: ['sent', 'paid'] },
    undefined
  );

  if (!storageResult.success) {
    return errorResult(
      createCsvExportError(
        'STORAGE_ERROR',
        'Failed to fetch invoices from storage'
      )
    );
  }

  const documents = storageResult.data ?? [];

  // 3-4. Filter and generate CSV
  const { csvContent, rowCount } = generateCsvFromDocuments(
    documents,
    periodType,
    referenceDate
  );

  // Check for empty result
  if (rowCount === 0) {
    return errorResult(
      createCsvExportError(
        'NO_DATA',
        'No invoices found for the selected period'
      )
    );
  }

  // 5. Write to temporary file
  const filename = generateCsvFilename(referenceDate);
  const writeResult = await writeCsvFile(csvContent, filename);

  if (!writeResult.success) {
    return errorResult(writeResult.error!);
  }

  const fileUri = writeResult.data!;

  // 6. Share and 7. Cleanup
  try {
    const shareResult = await shareCsvFile(fileUri);

    if (!shareResult.success) {
      return errorResult(shareResult.error!);
    }

    return successResult({ rowCount });
  } finally {
    // Always cleanup temporary file
    await cleanupCsvFile(fileUri);
  }
}
