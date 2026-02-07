/**
 * Background Designs — Pure CSS background patterns for PDF output (M20)
 *
 * Generates CSS for body::before pseudo-element overlay.
 * All patterns use WebKit-safe CSS (no conic-gradient, backdrop-filter, or CSS Houdini).
 */

import type { BackgroundDesign } from './types';

/** Default opacity for background patterns — subtle enough to not impair readability */
const BACKGROUND_OPACITY = 0.06;

/** CSS wrapper for body::before overlay with a given background property */
function wrapBeforePseudo(backgroundProperty: string, opacity = BACKGROUND_OPACITY): string {
  return `
    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      opacity: ${opacity};
      ${backgroundProperty}
      pointer-events: none;
    }`;
}

/** Pattern definitions: BackgroundDesign → CSS background property string */
const PATTERN_MAP: Record<Exclude<BackgroundDesign, 'NONE'>, string> = {
  STRIPE: 'background: repeating-linear-gradient(45deg, #000 0px, #000 1px, transparent 1px, transparent 10px);',
  WAVE: 'background: radial-gradient(ellipse 60px 30px at 30px 15px, transparent 24px, #000 25px, #000 26px, transparent 27px), radial-gradient(ellipse 60px 30px at 90px 45px, transparent 24px, #000 25px, #000 26px, transparent 27px); background-size: 60px 60px;',
  GRID: 'background: linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px); background-size: 20px 20px;',
  DOTS: 'background: radial-gradient(circle 1.5px at 10px 10px, #000 1.5px, transparent 1.5px); background-size: 20px 20px;',
};

/**
 * Generate CSS for a background design pattern.
 *
 * @param design - The background design to apply
 * @returns CSS string to inject into a <style> tag, or empty string for NONE / unknown
 */
export function getBackgroundCss(design: BackgroundDesign): string {
  if (design === 'NONE') return '';

  const pattern = PATTERN_MAP[design as Exclude<BackgroundDesign, 'NONE'>];
  if (!pattern) return '';

  return wrapBeforePseudo(pattern);
}
