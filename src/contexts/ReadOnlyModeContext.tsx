/**
 * ReadOnlyModeContext
 *
 * React Context for managing read-only mode state throughout the app.
 * Read-only mode is enabled when migrations fail, preventing data modification.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  runMigrations,
  retryMigrations as retryMigrationsService,
  type MigrationRunResult,
  type MigrationError,
} from '@/storage/migrationRunner';
import { getReadOnlyMode, setReadOnlyMode } from '@/storage/asyncStorageService';

// === Context Types ===

export interface ReadOnlyModeContextValue {
  /** Whether the app is in read-only mode */
  isReadOnlyMode: boolean;
  /** Whether initialization (migrations) is complete */
  isInitialized: boolean;
  /** Migration error details if in read-only mode */
  migrationError: MigrationError | null;
  /** Retry migrations and return result */
  retryMigrations: () => Promise<MigrationRunResult>;
}

// === Context ===

const ReadOnlyModeContext = createContext<ReadOnlyModeContextValue | null>(null);

// === Provider ===

export interface ReadOnlyModeProviderProps {
  children: ReactNode;
}

export function ReadOnlyModeProvider({
  children,
}: ReadOnlyModeProviderProps): React.JSX.Element {
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [migrationError, setMigrationError] = useState<MigrationError | null>(null);

  // Run migrations on mount
  useEffect(() => {
    async function initializeMigrations() {
      try {
        const result = await runMigrations();

        // Update state based on migration result
        setIsReadOnlyMode(getReadOnlyMode());
        setMigrationError(result.error ?? null);
      } catch (error) {
        // If runMigrations throws, enter read-only mode in both storage and state
        setReadOnlyMode(true);
        setIsReadOnlyMode(true);
        setMigrationError({
          code: 'MIGRATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown migration error',
          fromVersion: 0,
          toVersion: 0,
          originalError: error instanceof Error ? error : undefined,
        });
      } finally {
        // Always mark as initialized
        setIsInitialized(true);
      }
    }

    initializeMigrations();
  }, []);

  // Retry migrations handler
  const retryMigrations = useCallback(async (): Promise<MigrationRunResult> => {
    try {
      const result = await retryMigrationsService();

      // Update state based on retry result
      setIsReadOnlyMode(getReadOnlyMode());
      setMigrationError(result.error ?? null);

      return result;
    } catch (error) {
      // If retry throws, remain in read-only mode in both storage and state
      setReadOnlyMode(true);
      setIsReadOnlyMode(true);
      const migrationError: MigrationError = {
        code: 'MIGRATION_FAILED',
        message: error instanceof Error ? error.message : 'Migration retry failed',
        fromVersion: 0,
        toVersion: 0,
        originalError: error instanceof Error ? error : undefined,
      };
      setMigrationError(migrationError);

      return {
        success: false,
        startVersion: 0,
        endVersion: 0,
        migrationsRun: 0,
        readOnlyMode: true,
        error: migrationError,
      };
    }
  }, []);

  // Memoize context value
  const value = useMemo<ReadOnlyModeContextValue>(
    () => ({
      isReadOnlyMode,
      isInitialized,
      migrationError,
      retryMigrations,
    }),
    [isReadOnlyMode, isInitialized, migrationError, retryMigrations]
  );

  return (
    <ReadOnlyModeContext.Provider value={value}>
      {children}
    </ReadOnlyModeContext.Provider>
  );
}

// === Hook ===

/**
 * Access the ReadOnlyModeContext.
 * @throws Error if used outside of ReadOnlyModeProvider
 */
export function useReadOnlyModeContext(): ReadOnlyModeContextValue {
  const context = useContext(ReadOnlyModeContext);

  if (context === null) {
    throw new Error(
      'useReadOnlyModeContext must be used within ReadOnlyModeProvider'
    );
  }

  return context;
}
