/**
 * Read-Only Mode State
 *
 * Shared state module for read-only mode flag.
 * Extracted to prevent circular dependencies between storage services.
 */

/** Read-only mode flag */
let isReadOnlyMode = false;

/**
 * Enable or disable read-only mode
 * @param enabled - Whether to enable read-only mode
 */
export function setReadOnlyMode(enabled: boolean): void {
  isReadOnlyMode = enabled;
}

/**
 * Get current read-only mode status
 * @returns Whether read-only mode is enabled
 */
export function getReadOnlyMode(): boolean {
  return isReadOnlyMode;
}
