/**
 * Migration Index
 *
 * Import all migrations to trigger auto-registration.
 * Import order determines registration order.
 */

import { registerMigration } from '../migrationRunner';
import { v1InitialMigration } from './v1-initial';

// Register all migrations
registerMigration(v1InitialMigration);

// Re-export for direct access if needed
export { v1InitialMigration };
