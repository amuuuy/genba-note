/**
 * Filename Sanitization Utility (M19)
 *
 * Pure function for sanitizing user-provided PDF filenames.
 * Removes OS-forbidden characters, enforces length limits,
 * and auto-appends .pdf extension.
 */

/** Characters forbidden in filenames across OS platforms */
const FORBIDDEN_CHARS = /[/\\?*<>|":#%]/g;

/** Maximum total filename length (including .pdf extension) */
const MAX_FILENAME_LENGTH = 100;

/** Length of the ".pdf" extension string */
const PDF_EXTENSION_LENGTH = 4;

/** Pattern to detect .pdf extension (case-insensitive) at end of string */
const PDF_EXTENSION_PATTERN = /\.pdf$/i;

/**
 * Sanitize a filename for PDF output.
 *
 * 1. Remove forbidden characters: / \ ? * < > | " : # %
 * 2. Trim leading/trailing whitespace
 * 3. If result is empty after sanitization, use defaultName
 * 4. If filename does not end with .pdf (case-insensitive), append .pdf
 * 5. Enforce 100-character total limit (truncate base name, keep .pdf)
 *
 * @param input - User-provided filename string
 * @param defaultName - Fallback name if input is empty after sanitization (default: 'document')
 * @returns Sanitized filename guaranteed to end with .pdf and be <= 100 chars
 */
export function sanitizeFilename(
  input: string,
  defaultName: string = 'document'
): string {
  // 1. Remove forbidden characters
  let name = input.replace(FORBIDDEN_CHARS, '');

  // 2. Trim whitespace
  name = name.trim();

  // 3. Fallback to default if empty (sanitize defaultName too for safety)
  if (name.length === 0) {
    name = defaultName.replace(FORBIDDEN_CHARS, '').trim() || 'document';
  }

  // 4. Check if name already has .pdf extension (case-insensitive)
  const hasPdfExtension = PDF_EXTENSION_PATTERN.test(name);

  const maxBaseLength = MAX_FILENAME_LENGTH - PDF_EXTENSION_LENGTH;

  if (hasPdfExtension) {
    const base = name.slice(0, name.length - PDF_EXTENSION_LENGTH);
    const ext = name.slice(name.length - PDF_EXTENSION_LENGTH);
    return base.slice(0, maxBaseLength) + ext;
  }

  // 5. Truncate base and append .pdf
  return name.slice(0, maxBaseLength) + '.pdf';
}
