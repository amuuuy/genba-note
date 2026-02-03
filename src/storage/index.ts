/**
 * Storage Module Index
 *
 * Re-exports all storage services for convenient imports.
 */

// AsyncStorage service
export {
  // Types
  type StorageResult,
  type StorageError,
  type StorageErrorCode,
  // Read-only mode
  setReadOnlyMode,
  getReadOnlyMode,
  // Document operations
  getAllDocuments,
  getDocumentById,
  saveDocument,
  deleteDocument,
  filterDocuments,
  // Unit price operations
  getAllUnitPrices,
  getUnitPriceById,
  saveUnitPrice,
  deleteUnitPrice,
  searchUnitPrices,
  // Settings operations
  getSettings,
  saveSettings,
  updateSettings,
  // Schema version operations
  getSchemaVersion,
  setSchemaVersion,
} from './asyncStorageService';

// Secure storage service
export {
  // Types
  type SecureStorageResult,
  type SecureStorageError,
  type SecureStorageErrorCode,
  // Sensitive issuer info
  getSensitiveIssuerInfo,
  saveSensitiveIssuerInfo,
  deleteSensitiveIssuerInfo,
  // Document-specific snapshots
  getIssuerSnapshot,
  saveIssuerSnapshot,
  deleteIssuerSnapshot,
  // Subscription cache
  getSubscriptionCache,
  saveSubscriptionCache,
  clearSubscriptionCache,
  // Individual subscription values
  getEntitlementActive,
  setEntitlementActive,
  getEntitlementExpiration,
  setEntitlementExpiration,
  getLastVerifiedAt,
  setLastVerifiedAt,
  getLastVerifiedUptime,
  setLastVerifiedUptime,
} from './secureStorageService';

// Migration runner
export {
  // Types
  type Migration,
  type MigrationStepResult,
  type MigrationError,
  type MigrationRunResult,
  // Constants
  CURRENT_SCHEMA_VERSION,
  // Functions
  registerMigration,
  getMigrations,
  getMigrationPath,
  runMigrations,
  retryMigrations,
  checkMigrationNeeded,
  clearMigrations,
  ensureMigrationsRegistered,
  resetMigrationsInitialized,
} from './migrationRunner';

// Migrations (importing triggers registration)
import './migrations';
