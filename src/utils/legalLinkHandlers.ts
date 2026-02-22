/**
 * Legal Link Handlers
 *
 * Pure functions for opening legal pages.
 * Extracted from paywall.tsx for testability in node test environment.
 */

import { safeOpenUrl } from './safeOpenUrl';
import { TERMS_OF_SERVICE_URL, PRIVACY_POLICY_URL } from '@/constants/legalUrls';

/** Open Terms of Service page in browser */
export function openTermsOfService(): void {
  safeOpenUrl(TERMS_OF_SERVICE_URL);
}

/** Open Privacy Policy page in browser */
export function openPrivacyPolicy(): void {
  safeOpenUrl(PRIVACY_POLICY_URL);
}
