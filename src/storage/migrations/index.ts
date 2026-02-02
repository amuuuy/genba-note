/**
 * Migration Index
 *
 * Import all migrations to trigger auto-registration.
 * Import order determines registration order.
 */

import { registerMigration } from '../migrationRunner';
import { v1InitialMigration } from './v1-initial';
import { v2AddCarriedForwardAndContactPersonMigration } from './v2-add-carried-forward-and-contact-person';
import { v3AddFaxFieldMigration } from './v3-add-fax-field';

// Register all migrations
registerMigration(v1InitialMigration);
registerMigration(v2AddCarriedForwardAndContactPersonMigration);
registerMigration(v3AddFaxFieldMigration);

// Re-export for direct access if needed
export { v1InitialMigration, v2AddCarriedForwardAndContactPersonMigration, v3AddFaxFieldMigration };
