/**
 * Issuer Resolver Service
 *
 * Resolves issuer information for PDF/preview generation.
 * Implements fallback logic with separate handling based on document snapshot state:
 *
 * When document has non-sensitive snapshot data (companyName, address, etc.):
 * - Non-sensitive: Use document snapshot
 * - Sensitive: Use document-specific getIssuerSnapshot(documentId)
 *
 * When document snapshot is empty (all fields null):
 * - Non-sensitive: Fallback to current settings (getSettings)
 * - Sensitive: Try document-specific snapshot first, then fallback to getSensitiveIssuerInfo
 *
 * This ensures:
 * - Company info is displayed even for documents created before settings were filled in
 * - Document-specific sensitive data is preserved when it exists
 * - Older documents with empty issuerSnapshot but existing sensitive snapshots work correctly
 */

import type { IssuerSnapshot, SensitiveIssuerSnapshot } from '@/types/document';
import type { SensitiveIssuerSettings } from '@/types/settings';
import { getIssuerSnapshot, getSensitiveIssuerInfo } from '@/storage/secureStorageService';
import { getSettings } from '@/storage/asyncStorageService';
import { imageUriToBase64 } from '@/utils/imageUtils';

/**
 * Result of issuer info resolution
 */
export interface ResolvedIssuerInfo {
  /** Resolved issuer snapshot (from document or settings) */
  issuerSnapshot: IssuerSnapshot;
  /** Resolved sensitive snapshot (bank info, invoice number) */
  sensitiveSnapshot: SensitiveIssuerSnapshot | null;
  /** Source of the resolved data */
  source: 'snapshot' | 'settings';
}

/**
 * Check if issuer snapshot has any meaningful data
 * Note: sealImageBase64 and contactPerson are excluded from this check as they're optional
 * Note: Whitespace-only strings are treated as empty (no data)
 */
export function hasIssuerSnapshotData(snapshot: IssuerSnapshot): boolean {
  return !!(
    snapshot.companyName?.trim() ||
    snapshot.representativeName?.trim() ||
    snapshot.address?.trim() ||
    snapshot.phone?.trim()
  );
}

/**
 * Load and convert seal image from URI to base64
 */
async function loadSealImageBase64(sealImageUri: string | null): Promise<string | null> {
  if (!sealImageUri) {
    return null;
  }
  try {
    return await imageUriToBase64(sealImageUri);
  } catch (error) {
    console.error('Failed to load seal image:', error);
    return null;
  }
}

/**
 * Convert SensitiveIssuerSettings to SensitiveIssuerSnapshot format
 */
function convertSettingsToSnapshot(
  settings: SensitiveIssuerSettings | null
): SensitiveIssuerSnapshot | null {
  if (!settings) return null;

  return {
    invoiceNumber: settings.invoiceNumber ?? null,
    bankName: settings.bankAccount?.bankName ?? null,
    branchName: settings.bankAccount?.branchName ?? null,
    accountType: settings.bankAccount?.accountType ?? null,
    accountNumber: settings.bankAccount?.accountNumber ?? null,
    accountHolderName: settings.bankAccount?.accountHolderName ?? null,
  };
}

/**
 * Resolve issuer information for PDF/preview generation
 *
 * @param documentId - Document ID for fetching document-specific sensitive data
 * @param documentIssuerSnapshot - Issuer snapshot embedded in the document
 * @returns Resolved issuer info with source indicator
 */
export async function resolveIssuerInfo(
  documentId: string,
  documentIssuerSnapshot: IssuerSnapshot
): Promise<ResolvedIssuerInfo> {
  // Check if document snapshot has data
  if (hasIssuerSnapshotData(documentIssuerSnapshot)) {
    // Use document snapshot
    const sensitiveResult = await getIssuerSnapshot(documentId);
    const sensitiveSnapshot =
      sensitiveResult.success && sensitiveResult.data
        ? sensitiveResult.data
        : null;

    // Load settings for fallback values (sealImage, missing companyName)
    const settingsResult = await getSettings();
    const settings = settingsResult.success ? settingsResult.data : null;

    // If document snapshot has seal image, use it; otherwise try to load from settings
    let sealImageBase64 = documentIssuerSnapshot.sealImageBase64;
    if (!sealImageBase64 && settings?.issuer.sealImageUri) {
      sealImageBase64 = await loadSealImageBase64(settings.issuer.sealImageUri);
    }

    // Fill missing/empty companyName from settings if available (for older documents)
    // Treat whitespace-only as empty to match validation behavior
    const snapshotCompanyName = documentIssuerSnapshot.companyName?.trim();
    const companyName = snapshotCompanyName || settings?.issuer.companyName || null;

    // Use document's contactPerson if set, otherwise try to get from settings (respecting showContactPerson)
    let contactPerson = documentIssuerSnapshot.contactPerson;
    if (!contactPerson && settings?.issuer.showContactPerson) {
      contactPerson = settings.issuer.contactPerson || null;
    }

    return {
      issuerSnapshot: {
        ...documentIssuerSnapshot,
        companyName,
        sealImageBase64,
        contactPerson,
      },
      sensitiveSnapshot,
      source: 'snapshot',
    };
  }

  // Fallback to current settings for non-sensitive data
  // But still check document-specific sensitive snapshot first
  const [settingsResult, docSensitiveResult, globalSensitiveResult] = await Promise.all([
    getSettings(),
    getIssuerSnapshot(documentId),
    getSensitiveIssuerInfo(),
  ]);

  // Load seal image from settings
  const sealImageUri = settingsResult.success && settingsResult.data
    ? settingsResult.data.issuer.sealImageUri
    : null;
  const sealImageBase64 = await loadSealImageBase64(sealImageUri);

  // Extract issuer info from settings
  const issuerSnapshot: IssuerSnapshot =
    settingsResult.success && settingsResult.data
      ? {
          companyName: settingsResult.data.issuer.companyName,
          representativeName: settingsResult.data.issuer.representativeName,
          address: settingsResult.data.issuer.address,
          phone: settingsResult.data.issuer.phone,
          sealImageBase64,
          // Only include contactPerson if showContactPerson is true
          contactPerson: settingsResult.data.issuer.showContactPerson
            ? settingsResult.data.issuer.contactPerson
            : null,
        }
      : {
          companyName: null,
          representativeName: null,
          address: null,
          phone: null,
          sealImageBase64: null,
          contactPerson: null,
        };

  // For sensitive data: prefer document-specific snapshot, fallback to global settings
  let sensitiveSnapshot: SensitiveIssuerSnapshot | null = null;
  if (docSensitiveResult.success && docSensitiveResult.data) {
    // Document has its own sensitive snapshot - use it
    sensitiveSnapshot = docSensitiveResult.data;
  } else if (globalSensitiveResult.success && globalSensitiveResult.data) {
    // Fallback to current global settings
    sensitiveSnapshot = convertSettingsToSnapshot(globalSensitiveResult.data);
  }

  return {
    issuerSnapshot,
    sensitiveSnapshot,
    source: 'settings',
  };
}
