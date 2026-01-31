/**
 * UUID v4 generation for entity IDs
 *
 * Uses crypto.getRandomValues when available (React Native),
 * falls back to Math.random for testing environments.
 */

/**
 * Generate a UUID v4 string
 * @returns UUID in format 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
 */
export function generateUUID(): string {
  // Try to use crypto API if available
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    return generateCryptoUUID();
  }
  // Fallback for environments without crypto
  return generateFallbackUUID();
}

/**
 * Generate UUID using crypto.getRandomValues
 */
function generateCryptoUUID(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set version (4) and variant (RFC 4122)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return bytesToUUID(bytes);
}

/**
 * Fallback UUID generation using Math.random
 * Less secure but works in all environments
 */
function generateFallbackUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Convert bytes to UUID string
 */
function bytesToUUID(bytes: Uint8Array): string {
  const hex: string[] = [];
  for (let i = 0; i < 16; i++) {
    hex.push(bytes[i].toString(16).padStart(2, '0'));
  }
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

/**
 * Validate UUID format
 * @param uuid String to validate
 * @returns true if valid UUID v4 format
 */
export function isValidUUID(uuid: string): boolean {
  const pattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return pattern.test(uuid);
}
