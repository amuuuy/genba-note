/**
 * PDF Template Theme CSS
 *
 * Theme-specific CSS styles for screen preview and formal PDF output.
 * Separates visual styling from layout structure.
 */

import type { ColorScheme } from './types';

/**
 * Screen Theme CSS - Colorful styling for preview
 *
 * Uses document-type specific colors (blue for estimate, orange for invoice)
 * for vibrant, easy-to-distinguish preview.
 */
export function getScreenThemeCss(colors: ColorScheme): string {
  return `
    /* Header with color background */
    .header {
      background: ${colors.background};
      border-bottom: 4px solid ${colors.primary};
    }

    .document-title {
      color: ${colors.primary};
    }

    /* Total box with color accent */
    .total-box {
      border: 3px solid ${colors.primary};
      background: ${colors.background};
    }

    .total-box .amount {
      color: ${colors.primary};
    }

    /* Colorful table header */
    .items-table th {
      background: ${colors.primary};
      color: #fff;
    }

    /* Bank section with color */
    .bank-section {
      border: 2px solid ${colors.secondary};
      background: ${colors.background};
    }

    .bank-section h3 {
      color: ${colors.primary};
    }

    /* Due date with warning color */
    .due-date-section {
      background: #fff9e6;
      border: 1px solid #ffd54f;
    }

    .due-date-section .label {
      color: #f57c00;
    }

    .total-final {
      color: ${colors.primary};
      border-top: 2px solid ${colors.primary};
    }
  `;
}

/**
 * Formal Theme CSS - Monochrome styling for PDF output
 *
 * Design principles:
 * - No background fills on headers (transparent)
 * - Emphasis via typography (bold, size) and borders only
 * - Light gray zebra striping on tables
 * - Works well on black & white printers
 * - Professional business document appearance
 */
export function getFormalThemeCss(colors: ColorScheme): string {
  return `
    /* Header - No background fill, clean border only */
    .header {
      background: transparent;
      border-bottom: 2px solid ${colors.primary};
      padding: 24px 0;
    }

    .document-title {
      font-size: 24px;
      font-weight: bold;
      color: ${colors.primary};
      text-align: center;
      letter-spacing: 0.1em;
    }

    .document-meta {
      margin-top: 12px;
    }

    /* Total Amount Box - Border emphasis only, no background */
    .total-box {
      border: 2px solid ${colors.primary};
      background: transparent;
      padding: 16px 20px;
      border-radius: 0;
    }

    .total-box .label {
      font-size: 13px;
      color: ${colors.secondary};
    }

    .total-box .amount {
      font-size: 28px;
      font-weight: bold;
      color: ${colors.primary};
    }

    /* Table - Thin borders, zebra striping */
    .items-table th {
      background: transparent;
      color: ${colors.primary};
      border: 1px solid ${colors.secondary};
      border-bottom: 2px solid ${colors.primary};
      font-weight: bold;
    }

    .items-table td {
      border: 1px solid #ddd;
      border-left: none;
      border-right: none;
    }

    .items-table tr:nth-child(even) {
      background: #f8f8f8;
    }

    .items-table tr:last-child td {
      border-bottom: 1px solid ${colors.secondary};
    }

    /* Bank section - Simple border, no background */
    .bank-section {
      border: 1px solid ${colors.secondary};
      background: transparent;
      border-radius: 0;
    }

    .bank-section h3 {
      color: ${colors.primary};
      font-weight: bold;
      border-bottom: 1px solid #ddd;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }

    /* Due date - No background, simple border */
    .due-date-section {
      background: transparent;
      border: 1px solid ${colors.secondary};
      border-radius: 0;
    }

    .due-date-section .label {
      color: ${colors.primary};
      font-weight: bold;
    }

    /* Subject section - Light gray background */
    .subject-section {
      background: #f8f8f8;
      border-radius: 0;
    }

    /* Notes section - Light gray background */
    .notes-section {
      background: #f8f8f8;
      border-radius: 0;
    }

    .notes-section h3 {
      color: ${colors.primary};
    }

    /* Client section - Clean border */
    .client-section {
      border: 1px solid ${colors.secondary};
      border-radius: 0;
    }

    /* Totals section */
    .totals-section {
      border: 1px solid ${colors.secondary};
      border-radius: 0;
    }

    .total-final {
      font-size: 18px;
      color: ${colors.primary};
      border-top: 2px solid ${colors.primary};
      font-weight: bold;
    }

    /* Issuer section */
    .issuer-section {
      border-top: 1px solid ${colors.secondary};
    }
  `;
}
