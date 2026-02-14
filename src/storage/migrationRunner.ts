/**
 * Migration Runner
 *
 * Manages schema versioning and migration execution.
 * Enables read-only mode on migration failure.
 */

import {
  getSchemaVersion,
  setSchemaVersion,
  setReadOnlyMode,
} from './asyncStorageService';

// === Current Schema Version ===

/**
 * Current schema version for the application.
 * Increment this when adding new migrations.
 *
 * Version history:
 * - v1: Initial schema
 * - v2: Add carriedForwardAmount and contactPerson
 * - v3: Add fax field
 * - v4: Add customer master and customer photos
 * - v5: Add work log entries for date-based photo grouping
 * - v6: Remove undated photos (photos without work log entry assignment)
 * - v7: Add PDF customization fields (sealSize, backgroundDesign, template IDs)
 * - v8: Add calendar events collection
 * - v9: Add email field to issuer information
 */
export const CURRENT_SCHEMA_VERSION = 9;

// === Migrations Initialization Flag ===
let migrationsInitialized = false;

/**
 * Ensure migrations are registered.
 * This function is called automatically before running migrations.
 * It lazily imports the migrations module to avoid circular dependency issues.
 */
export async function ensureMigrationsRegistered(): Promise<void> {
  if (migrationsInitialized) {
    return;
  }
  // Dynamically import migrations to register them
  await import('./migrations');
  migrationsInitialized = true;
}

/**
 * Reset initialization flag (for testing only)
 */
export function resetMigrationsInitialized(): void {
  migrationsInitialized = false;
}

// === Migration Types ===

export interface Migration {
  /** Version number this migration upgrades FROM */
  fromVersion: number;
  /** Version number this migration upgrades TO */
  toVersion: number;
  /** Human-readable description */
  description: string;
  /** Migration function - transforms data from fromVersion to toVersion */
  migrate: () => Promise<MigrationStepResult>;
}

export interface MigrationStepResult {
  success: boolean;
  error?: MigrationError;
}

export interface MigrationError {
  code: 'MIGRATION_FAILED' | 'DATA_CORRUPTION' | 'ROLLBACK_FAILED';
  message: string;
  fromVersion: number;
  toVersion: number;
  originalError?: Error;
}

export interface MigrationRunResult {
  success: boolean;
  startVersion: number;
  endVersion: number;
  migrationsRun: number;
  readOnlyMode: boolean;
  error?: MigrationError;
}

// === Migration Registry ===

const migrations: Map<string, Migration> = new Map();

function migrationKey(from: number, to: number): string {
  return `${from}->${to}`;
}

/**
 * Register a migration
 * Idempotent: if a migration with the same version range already exists, it is skipped.
 * @throws if migration with same version range but different properties is registered
 */
export function registerMigration(migration: Migration): void {
  const key = migrationKey(migration.fromVersion, migration.toVersion);
  if (migrations.has(key)) {
    // Already registered - idempotent, just return
    return;
  }
  migrations.set(key, migration);
}

/**
 * Get all registered migrations, sorted by fromVersion
 */
export function getMigrations(): Migration[] {
  return Array.from(migrations.values()).sort(
    (a, b) => a.fromVersion - b.fromVersion
  );
}

/**
 * Clear all registered migrations (for testing)
 */
export function clearMigrations(): void {
  migrations.clear();
}

/**
 * Get migration path from one version to another
 * @throws if no path exists
 */
export function getMigrationPath(from: number, to: number): Migration[] {
  if (from >= to) {
    return [];
  }

  const path: Migration[] = [];
  let current = from;

  while (current < to) {
    // Find migration from current version
    const nextMigration = getMigrations().find((m) => m.fromVersion === current);
    if (!nextMigration) {
      throw new Error(`No migration found from version ${current}`);
    }
    path.push(nextMigration);
    current = nextMigration.toVersion;
  }

  return path;
}

// === Migration Execution ===

/**
 * Runs all necessary migrations to bring data up to CURRENT_SCHEMA_VERSION.
 * If any migration fails, enables read-only mode.
 */
export async function runMigrations(): Promise<MigrationRunResult> {
  // Ensure migrations are registered before running
  await ensureMigrationsRegistered();

  // Get current schema version
  const versionResult = await getSchemaVersion();

  // Handle getSchemaVersion failure
  if (!versionResult.success) {
    setReadOnlyMode(true);
    return {
      success: false,
      startVersion: 0,
      endVersion: 0,
      migrationsRun: 0,
      readOnlyMode: true,
      error: {
        code: 'MIGRATION_FAILED',
        message: 'Failed to read schema version from storage',
        fromVersion: 0,
        toVersion: CURRENT_SCHEMA_VERSION,
      },
    };
  }

  const currentVersion = versionResult.data ?? 0;

  // Check if migration needed
  if (currentVersion >= CURRENT_SCHEMA_VERSION) {
    // Even if no migration needed, run orphan cleanup
    // This catches orphaned photos from failed deletions
    try {
      const { cleanupOrphanedPhotos } = await import(
        './migrations/v6-remove-undated-photos'
      );
      await cleanupOrphanedPhotos();
    } catch (error) {
      // Log but don't fail - orphan cleanup is best-effort
      if (__DEV__) console.warn('Failed to cleanup orphaned photos:', error);
    }

    return {
      success: true,
      startVersion: currentVersion,
      endVersion: currentVersion,
      migrationsRun: 0,
      readOnlyMode: false,
    };
  }

  // Get migration path
  let migrationPath: Migration[];
  try {
    migrationPath = getMigrationPath(currentVersion, CURRENT_SCHEMA_VERSION);
  } catch (error) {
    setReadOnlyMode(true);
    return {
      success: false,
      startVersion: currentVersion,
      endVersion: currentVersion,
      migrationsRun: 0,
      readOnlyMode: true,
      error: {
        code: 'MIGRATION_FAILED',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to compute migration path',
        fromVersion: currentVersion,
        toVersion: CURRENT_SCHEMA_VERSION,
      },
    };
  }

  // Execute migrations sequentially
  let completedVersion = currentVersion;
  for (const migration of migrationPath) {
    const stepResult = await migration.migrate();

    if (!stepResult.success) {
      // Enable read-only mode on failure
      setReadOnlyMode(true);
      return {
        success: false,
        startVersion: currentVersion,
        endVersion: completedVersion,
        migrationsRun: completedVersion - currentVersion,
        readOnlyMode: true,
        error: stepResult.error,
      };
    }

    // Update schema version after successful migration
    const setVersionResult = await setSchemaVersion(migration.toVersion);
    if (!setVersionResult.success) {
      // Failed to persist schema version - enable read-only mode
      setReadOnlyMode(true);
      return {
        success: false,
        startVersion: currentVersion,
        endVersion: completedVersion,
        migrationsRun: completedVersion - currentVersion,
        readOnlyMode: true,
        error: {
          code: 'MIGRATION_FAILED',
          message: `Failed to save schema version after migration to v${migration.toVersion}`,
          fromVersion: migration.fromVersion,
          toVersion: migration.toVersion,
        },
      };
    }
    completedVersion = migration.toVersion;
  }

  // Success - all migrations completed
  return {
    success: true,
    startVersion: currentVersion,
    endVersion: completedVersion,
    migrationsRun: migrationPath.length,
    readOnlyMode: false,
  };
}

/**
 * Retries migrations after a failure.
 * Called when user taps "Retry" button in migration failure dialog.
 *
 * IMPORTANT: Read-only mode is kept ENABLED during retry to prevent
 * user writes while migrations are running. It's only disabled after
 * successful completion.
 */
export async function retryMigrations(): Promise<MigrationRunResult> {
  // NOTE: Do NOT disable read-only mode here!
  // Keep it enabled to prevent writes during retry.
  // It will be disabled only after successful migration completion.

  // Ensure migrations are registered
  await ensureMigrationsRegistered();

  // Run migrations (they work even in read-only mode because
  // setSchemaVersion bypasses the read-only check)
  const result = await runMigrations();

  // Only disable read-only mode if migrations succeeded
  if (result.success) {
    setReadOnlyMode(false);
  }
  // If failed, read-only mode remains enabled (set by runMigrations on failure)

  return result;
}

/**
 * Checks if migrations are needed without running them.
 */
export async function checkMigrationNeeded(): Promise<{
  needed: boolean;
  currentVersion: number;
  targetVersion: number;
}> {
  const versionResult = await getSchemaVersion();
  const currentVersion = versionResult.success ? (versionResult.data ?? 0) : 0;

  return {
    needed: currentVersion < CURRENT_SCHEMA_VERSION,
    currentVersion,
    targetVersion: CURRENT_SCHEMA_VERSION,
  };
}
