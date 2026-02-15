/**
 * URL Validation Utility
 *
 * Pure validation functions for URLs, separated from platform-specific
 * opening logic for testability in node environments.
 */

const ALLOWED_SCHEMES = /^https?:\/\//i;

/**
 * Check whether a URL string is safe to open externally.
 * Only http and https schemes are allowed.
 */
export function isOpenableUrl(url: string): boolean {
  return ALLOWED_SCHEMES.test(url);
}
