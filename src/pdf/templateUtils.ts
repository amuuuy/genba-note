/**
 * Template Utilities
 *
 * Shared utility functions for PDF template generation.
 * Extracted to avoid circular dependencies between template modules.
 */

import type { TaxRate } from '@/types/document';

// === Formatting Functions ===

/**
 * Format currency with thousand separators
 * @param amount - Amount in yen
 * @returns Formatted string (e.g., "1,234,567")
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ja-JP');
}

/**
 * Format quantity from milli-units to display string
 * @param quantityMilli - Quantity in milli-units (1000 = 1.0)
 * @returns Formatted string (e.g., "2.5", "1", "0.001")
 */
export function formatQuantity(quantityMilli: number): string {
  const value = quantityMilli / 1000;
  // Use toFixed(3) then remove trailing zeros
  const formatted = value.toFixed(3).replace(/\.?0+$/, '');
  // If result is empty string (shouldn't happen), return "0"
  return formatted || '0';
}

/**
 * Format tax rate for display
 * @param rate - Tax rate (0 or 10)
 * @returns "10%" or "非課税"
 */
export function formatTaxRate(rate: TaxRate): string {
  return rate === 0 ? '非課税' : `${rate}%`;
}

/**
 * Format date string to Japanese format
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Japanese format (e.g., "2026年1月30日")
 */
export function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  return `${year}年${month}月${day}日`;
}

// === Address Parsing ===

/**
 * Parsed address structure
 */
export interface ParsedAddress {
  postalCode: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
}

/**
 * Parse address string to extract postal code and split into lines
 * Supports formats:
 * - 〒xxx-xxxx Address
 * - xxx-xxxx Address
 * - xxxxxxx Address (no hyphen)
 * - Address only (no postal code)
 *
 * Multi-line addresses can be separated by:
 * - Newline character (\n)
 * - Double full-width space (　　)
 *
 * @param address - Address string to parse
 * @returns Parsed address with postal code and address lines
 */
export function parseAddressWithPostalCode(address: string | null): ParsedAddress {
  if (!address || address.trim() === '') {
    return { postalCode: null, addressLine1: null, addressLine2: null };
  }

  const trimmed = address.trim();

  // Pattern: 〒xxx-xxxx or xxx-xxxx or xxxxxxx at start
  const postalMatch = trimmed.match(/^〒?(\d{3})-?(\d{4})\s*/);

  if (postalMatch) {
    const postalCode = `〒${postalMatch[1]}-${postalMatch[2]}`;
    const remaining = trimmed.slice(postalMatch[0].length).trim();

    if (!remaining) {
      return { postalCode, addressLine1: null, addressLine2: null };
    }

    // Split remaining by newline or double full-width space
    const lines = remaining.split(/\n|　{2,}/).map(l => l.trim()).filter(Boolean);

    return {
      postalCode,
      addressLine1: lines[0] || null,
      addressLine2: lines.length > 1 ? lines.slice(1).join(' ') : null,
    };
  }

  // No postal code - split address into lines (also support double full-width space)
  const lines = trimmed.split(/\n|　{2,}/).map(l => l.trim()).filter(Boolean);
  return {
    postalCode: null,
    addressLine1: lines[0] || null,
    addressLine2: lines.length > 1 ? lines.slice(1).join(' ') : null,
  };
}

// === HTML Utilities ===

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// === Image Validation ===

/**
 * Validate that a string is a valid data URI for safe raster images
 * Only allows PNG, JPEG, GIF, WEBP formats to prevent XSS via SVG
 *
 * @param uri - The data URI to validate
 * @returns true if valid raster image data URI, false otherwise
 */
export function isValidImageDataUri(uri: string | null | undefined): boolean {
  if (!uri) return false;
  // Only allow safe raster image formats (no SVG to prevent XSS)
  // Full match: reject URIs with quotes, spaces, or other non-Base64 chars to prevent attribute injection
  return /^data:image\/(png|jpeg|jpg|gif|webp);base64,[A-Za-z0-9+/]+=*$/.test(uri);
}
