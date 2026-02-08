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
import { v4AddCustomerMasterMigration } from './v4-add-customer-master';
import { v5AddWorkLogEntriesMigration } from './v5-add-work-log-entries';
import { v6RemoveUndatedPhotosMigration } from './v6-remove-undated-photos';
import { v7AddPdfCustomizationMigration } from './v7-add-pdf-customization';
import { v8AddCalendarEventsMigration } from './v8-add-calendar-events';
import { v9AddEmailFieldMigration } from './v9-add-email-field';

// Register all migrations
registerMigration(v1InitialMigration);
registerMigration(v2AddCarriedForwardAndContactPersonMigration);
registerMigration(v3AddFaxFieldMigration);
registerMigration(v4AddCustomerMasterMigration);
registerMigration(v5AddWorkLogEntriesMigration);
registerMigration(v6RemoveUndatedPhotosMigration);
registerMigration(v7AddPdfCustomizationMigration);
registerMigration(v8AddCalendarEventsMigration);
registerMigration(v9AddEmailFieldMigration);

// Re-export for direct access if needed
export {
  v1InitialMigration,
  v2AddCarriedForwardAndContactPersonMigration,
  v3AddFaxFieldMigration,
  v4AddCustomerMasterMigration,
  v5AddWorkLogEntriesMigration,
  v6RemoveUndatedPhotosMigration,
  v7AddPdfCustomizationMigration,
  v8AddCalendarEventsMigration,
  v9AddEmailFieldMigration,
};
