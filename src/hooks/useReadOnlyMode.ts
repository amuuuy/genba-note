/**
 * useReadOnlyMode Hook
 *
 * Simplified hook for checking read-only mode status and handling retries.
 * Wraps the ReadOnlyModeContext with additional UI state management.
 */

import { useState, useCallback } from 'react';
import { useReadOnlyModeContext } from '@/contexts/ReadOnlyModeContext';
import type { MigrationError } from '@/storage/migrationRunner';

export interface UseReadOnlyModeReturn {
  /** Whether the app is in read-only mode */
  isReadOnlyMode: boolean;
  /** Whether initialization (migrations) is complete */
  isInitialized: boolean;
  /** Migration error details if in read-only mode */
  migrationError: MigrationError | null;
  /** Retry migrations - returns true on success, false on failure */
  retryMigrations: () => Promise<boolean>;
  /** Whether to show the retry dialog */
  showRetryDialog: boolean;
  /** Set whether to show the retry dialog */
  setShowRetryDialog: (show: boolean) => void;
}

/**
 * Hook for managing read-only mode state in UI components.
 * Provides a simplified API for checking status and retrying migrations.
 */
export function useReadOnlyMode(): UseReadOnlyModeReturn {
  const {
    isReadOnlyMode,
    isInitialized,
    migrationError,
    retryMigrations: retryMigrationsContext,
  } = useReadOnlyModeContext();

  // UI state for showing retry dialog
  const [showRetryDialog, setShowRetryDialog] = useState(false);

  // Simplified retry function that returns boolean
  const retryMigrations = useCallback(async (): Promise<boolean> => {
    const result = await retryMigrationsContext();
    return result.success;
  }, [retryMigrationsContext]);

  return {
    isReadOnlyMode,
    isInitialized,
    migrationError,
    retryMigrations,
    showRetryDialog,
    setShowRetryDialog,
  };
}
