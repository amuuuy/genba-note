/**
 * Background Designs — Background patterns for PDF output (M20)
 *
 * Uses real HTML <div> elements instead of CSS ::before pseudo-elements
 * for reliable rendering in expo-print PDF generation.
 * All patterns use WebKit-safe CSS (no conic-gradient, backdrop-filter, or CSS Houdini).
 */

import type { BackgroundDesign } from './types';
import { isValidImageDataUri } from './templateUtils';

/** Default opacity for background patterns — visible but doesn't impair readability */
const BACKGROUND_OPACITY = 0.12;

/** Pattern definitions: BackgroundDesign → CSS background property string */
const PATTERN_MAP: Record<Exclude<BackgroundDesign, 'NONE' | 'IMAGE'>, string> = {
  STRIPE: 'background: repeating-linear-gradient(45deg, #000 0px, #000 1px, transparent 1px, transparent 10px);',
  WAVE: 'background: radial-gradient(ellipse 60px 30px at 30px 15px, transparent 24px, #000 25px, #000 26px, transparent 27px), radial-gradient(ellipse 60px 30px at 90px 45px, transparent 24px, #000 25px, #000 26px, transparent 27px); background-size: 60px 60px;',
  GRID: 'background: linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px); background-size: 20px 20px;',
  DOTS: 'background: radial-gradient(circle 1.5px at 10px 10px, #000 1.5px, transparent 1.5px); background-size: 20px 20px;',
};

/**
 * Generate CSS class for the background overlay element.
 *
 * @returns CSS string defining the .bg-overlay class
 */
export function getBackgroundOverlayCss(): string {
  return `
    .bg-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .document-container {
      position: relative;
      overflow: hidden;
    }`;
}

/**
 * Generate CSS for a background design pattern.
 *
 * @deprecated Use getBackgroundOverlayCss() + getBackgroundHtml() instead.
 * Kept for backward compatibility; returns empty string.
 */
export function getBackgroundCss(design: BackgroundDesign, imageDataUrl?: string | null): string {
  if (design === 'NONE') return '';

  // Return overlay CSS class definition (not ::before pseudo-element)
  return getBackgroundOverlayCss();
}

/**
 * Generate HTML for a background design overlay element.
 * Uses a real <div> element for reliable rendering in expo-print PDF generation.
 *
 * @param design - The background design to apply
 * @param imageDataUrl - Pre-loaded data URL for IMAGE design (optional)
 * @returns HTML string for the background overlay element, or empty string for NONE / unknown
 */
export function getBackgroundHtml(design: BackgroundDesign, imageDataUrl?: string | null): string {
  if (design === 'NONE') return '';

  if (design === 'IMAGE') {
    if (!imageDataUrl || !isValidImageDataUri(imageDataUrl)) return '';
    return `<div class="bg-overlay" style="opacity: ${BACKGROUND_OPACITY}; background-image: url('${imageDataUrl}'); background-size: cover; background-position: center; background-repeat: no-repeat;"></div>`;
  }

  const pattern = PATTERN_MAP[design as Exclude<BackgroundDesign, 'NONE' | 'IMAGE'>];
  if (!pattern) return '';

  return `<div class="bg-overlay" style="opacity: ${BACKGROUND_OPACITY}; ${pattern}"></div>`;
}
