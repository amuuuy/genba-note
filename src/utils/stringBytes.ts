/**
 * String Byte Length Utilities
 *
 * Calculate UTF-8 byte length of strings in pure JavaScript.
 * Works in React Native environments where Node.js Buffer is unavailable.
 *
 * UTF-8 encoding rules:
 * - U+0000 to U+007F: 1 byte  (ASCII)
 * - U+0080 to U+07FF: 2 bytes (Latin extensions, Greek, etc.)
 * - U+0800 to U+FFFF: 3 bytes (CJK, most symbols)
 * - U+10000 to U+10FFFF: 4 bytes (emoji, rare CJK, surrogate pairs in JS)
 */

/**
 * Check if TextEncoder is available in the current environment
 */
const hasTextEncoder = typeof TextEncoder !== 'undefined';

/**
 * Cached TextEncoder instance for performance
 */
let textEncoderInstance: TextEncoder | null = null;

/**
 * Get or create TextEncoder instance (lazy initialization)
 */
function getTextEncoder(): TextEncoder {
  if (textEncoderInstance === null) {
    textEncoderInstance = new TextEncoder();
  }
  return textEncoderInstance;
}

/**
 * Calculate UTF-8 byte length using TextEncoder
 *
 * @param str - String to measure
 * @returns Byte length
 */
function getByteLength_TextEncoder(str: string): number {
  return getTextEncoder().encode(str).length;
}

/**
 * Calculate UTF-8 byte length using manual calculation
 * Handles all Unicode code points including surrogate pairs (emoji, etc.)
 *
 * @param str - String to measure
 * @returns Byte length
 */
function getByteLength_Manual(str: string): number {
  let bytes = 0;
  const len = str.length;

  for (let i = 0; i < len; i++) {
    const code = str.charCodeAt(i);

    if (code < 0x80) {
      // U+0000 to U+007F: 1 byte
      bytes += 1;
    } else if (code < 0x800) {
      // U+0080 to U+07FF: 2 bytes
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      // High surrogate (start of surrogate pair)
      // Check if next char is low surrogate
      const nextCode = i + 1 < len ? str.charCodeAt(i + 1) : 0;
      if (nextCode >= 0xdc00 && nextCode <= 0xdfff) {
        // Valid surrogate pair: U+10000 to U+10FFFF = 4 bytes
        bytes += 4;
        i++; // Skip low surrogate
      } else {
        // Orphan high surrogate (invalid, but count as replacement char = 3 bytes)
        bytes += 3;
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      // Orphan low surrogate (invalid, but count as replacement char = 3 bytes)
      bytes += 3;
    } else {
      // U+0800 to U+FFFF: 3 bytes (excluding surrogates)
      bytes += 3;
    }
  }

  return bytes;
}

/**
 * Get the UTF-8 byte length of a string
 *
 * Uses TextEncoder when available (most modern environments),
 * falls back to manual calculation otherwise.
 *
 * @param str - String to measure (null/undefined returns 0)
 * @returns UTF-8 byte length
 *
 * @example
 * // ASCII: 1 byte per character
 * getByteLength('Hello') // 5
 *
 * // Japanese: 3 bytes per character (UTF-8)
 * getByteLength('日本語') // 9
 *
 * // Emoji: 4 bytes (surrogate pair in JavaScript)
 * getByteLength('😀') // 4
 *
 * // Mixed content
 * getByteLength('Hello 世界 🌍') // 5 + 1 + 6 + 1 + 4 = 17
 */
export function getByteLength(str: string | null | undefined): number {
  if (str == null || str === '') {
    return 0;
  }

  if (hasTextEncoder) {
    return getByteLength_TextEncoder(str);
  }

  return getByteLength_Manual(str);
}

/**
 * Get the character length of a string (Unicode-aware)
 *
 * Unlike `str.length` which counts UTF-16 code units,
 * this counts actual Unicode code points.
 *
 * @param str - String to measure (null/undefined returns 0)
 * @returns Number of Unicode code points
 *
 * @example
 * // ASCII: same as .length
 * getCharLength('Hello') // 5
 * 'Hello'.length // 5
 *
 * // Emoji: 1 code point, but 2 in .length (surrogate pair)
 * getCharLength('😀') // 1
 * '😀'.length // 2
 *
 * // Combined emoji: multiple code points
 * getCharLength('👨‍👩‍👧‍👦') // 7 (4 people + 3 ZWJ)
 * '👨‍👩‍👧‍👦'.length // 11
 */
export function getCharLength(str: string | null | undefined): number {
  if (str == null || str === '') {
    return 0;
  }

  // Use spread operator for Unicode-aware iteration (ES6+)
  return [...str].length;
}

/**
 * Truncate a string to fit within a maximum byte length
 *
 * Ensures the result is valid UTF-8 (no broken surrogate pairs).
 * Iterates over code points to find the optimal cut point.
 *
 * @param str - String to truncate
 * @param maxBytes - Maximum byte length allowed
 * @returns Truncated string that fits within maxBytes
 *
 * @example
 * truncateToBytes('Hello World', 5) // 'Hello'
 * truncateToBytes('日本語', 6) // '日本' (each char is 3 bytes)
 * truncateToBytes('A😀B', 5) // 'A' (emoji needs 4 bytes, doesn't fit)
 */
export function truncateToBytes(
  str: string | null | undefined,
  maxBytes: number
): string {
  if (str == null || str === '') {
    return '';
  }

  if (maxBytes <= 0) {
    return '';
  }

  const currentBytes = getByteLength(str);
  if (currentBytes <= maxBytes) {
    return str;
  }

  // Use spread for safe iteration over code points
  const codePoints = [...str];
  let result = '';
  let bytes = 0;

  for (const char of codePoints) {
    const charBytes = getByteLength(char);
    if (bytes + charBytes > maxBytes) {
      break;
    }
    result += char;
    bytes += charBytes;
  }

  return result;
}

/**
 * Check if a string fits within a maximum byte length
 *
 * @param str - String to check
 * @param maxBytes - Maximum allowed bytes
 * @returns true if string byte length <= maxBytes
 *
 * @example
 * fitsInBytes('Hello', 10) // true
 * fitsInBytes('日本語', 9) // true (exactly 9 bytes)
 * fitsInBytes('日本語', 8) // false (needs 9 bytes)
 */
export function fitsInBytes(
  str: string | null | undefined,
  maxBytes: number
): boolean {
  return getByteLength(str) <= maxBytes;
}
