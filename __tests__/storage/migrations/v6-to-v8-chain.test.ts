/**
 * Tests for v6→v9 chain migration
 *
 * Integration test that verifies the full migration chain from v6 to v9:
 * - v7: Adds PDF customization fields (sealSize, backgroundDesign, template IDs)
 * - v8: Adds CALENDAR_EVENTS storage key (empty array)
 * - v9: Adds email field to issuer snapshot and settings
 *
 * Uses a map-based AsyncStorage mock so setItem updates what getItem returns.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/utils/constants';
import {
  runMigrations,
  clearMigrations,
  resetMigrationsInitialized,
  CURRENT_SCHEMA_VERSION,
  registerMigration,
} from '@/storage/migrationRunner';
import { v7AddPdfCustomizationMigration } from '@/storage/migrations/v7-add-pdf-customization';
import { v8AddCalendarEventsMigration } from '@/storage/migrations/v8-add-calendar-events';
import { v9AddEmailFieldMigration } from '@/storage/migrations/v9-add-email-field';

// Map-based AsyncStorage mock
const store: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => store[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    store[key] = value;
  }),
}));

// Mock asyncStorageService — migrationRunner imports getSchemaVersion/setSchemaVersion from here.
// We wire them through the same map-based store for realistic chain testing.
jest.mock('@/storage/asyncStorageService', () => ({
  getSchemaVersion: jest.fn(async () => {
    const raw = store['@genba_schemaVersion'];
    if (raw === undefined || raw === null) {
      return { success: true, data: 0 };
    }
    return { success: true, data: parseInt(raw, 10) };
  }),
  setSchemaVersion: jest.fn(async (version: number) => {
    store['@genba_schemaVersion'] = String(version);
    return { success: true };
  }),
  setReadOnlyMode: jest.fn(),
  getReadOnlyMode: jest.fn(() => false),
}));

/** Create a minimal v6 settings object (no email field — v9 adds it) */
function createV6Settings(overrides: Record<string, unknown> = {}) {
  return {
    issuer: {
      companyName: '株式会社テスト建設',
      representativeName: '山田太郎',
      address: '東京都渋谷区1-2-3',
      phone: '03-1234-5678',
      fax: null,
      sealImageUri: null,
      contactPerson: null,
      showContactPerson: true,
      // NOTE: no email field — v9 migration should add it
    },
    numbering: {
      estimatePrefix: 'EST-',
      invoicePrefix: 'INV-',
      nextEstimateNumber: 5,
      nextInvoiceNumber: 3,
    },
    invoiceTemplateType: 'SIMPLE',
    schemaVersion: 6,
    ...overrides,
  };
}

describe('v6→v9 chain migration', () => {
  beforeEach(() => {
    // Clear store
    Object.keys(store).forEach((key) => delete store[key]);

    // Reset migration runner state
    clearMigrations();
    resetMigrationsInitialized();

    // Register v7, v8, and v9 migrations
    registerMigration(v7AddPdfCustomizationMigration);
    registerMigration(v8AddCalendarEventsMigration);
    registerMigration(v9AddEmailFieldMigration);

    jest.clearAllMocks();
  });

  it('should have CURRENT_SCHEMA_VERSION = 9', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(9);
  });

  it('should migrate from v6 to v9 successfully', async () => {
    // Set up v6 state
    store[STORAGE_KEYS.SCHEMA_VERSION] = '6';
    store[STORAGE_KEYS.SETTINGS] = JSON.stringify(createV6Settings());

    const result = await runMigrations();

    expect(result.success).toBe(true);
    expect(result.startVersion).toBe(6);
    expect(result.endVersion).toBe(9);
    expect(result.migrationsRun).toBe(3);
    expect(result.readOnlyMode).toBe(false);
  });

  it('should preserve v7 migration results after v8 and v9', async () => {
    store[STORAGE_KEYS.SCHEMA_VERSION] = '6';
    store[STORAGE_KEYS.SETTINGS] = JSON.stringify(
      createV6Settings({ invoiceTemplateType: 'SIMPLE' })
    );

    await runMigrations();

    // Verify v7 fields
    const settings = JSON.parse(store[STORAGE_KEYS.SETTINGS]);
    expect(settings.sealSize).toBe('MEDIUM');
    expect(settings.backgroundDesign).toBe('NONE');
    expect(settings.defaultEstimateTemplateId).toBe('FORMAL_STANDARD');
    expect(settings.defaultInvoiceTemplateId).toBe('SIMPLE'); // mapped from invoiceTemplateType
  });

  it('should initialize CALENDAR_EVENTS to empty array', async () => {
    store[STORAGE_KEYS.SCHEMA_VERSION] = '6';
    store[STORAGE_KEYS.SETTINGS] = JSON.stringify(createV6Settings());

    await runMigrations();

    const calendarEvents = JSON.parse(store[STORAGE_KEYS.CALENDAR_EVENTS]);
    expect(calendarEvents).toEqual([]);
  });

  it('should add email field to settings via v9', async () => {
    store[STORAGE_KEYS.SCHEMA_VERSION] = '6';
    store[STORAGE_KEYS.SETTINGS] = JSON.stringify(createV6Settings());

    await runMigrations();

    const settings = JSON.parse(store[STORAGE_KEYS.SETTINGS]);
    expect(settings.issuer.email).toBeNull();
  });

  it('should update schema version to 9', async () => {
    store[STORAGE_KEYS.SCHEMA_VERSION] = '6';
    store[STORAGE_KEYS.SETTINGS] = JSON.stringify(createV6Settings());

    await runMigrations();

    const version = parseInt(store[STORAGE_KEYS.SCHEMA_VERSION], 10);
    expect(version).toBe(9);
  });

  it('should map ACCOUNTING invoiceTemplateType correctly through chain', async () => {
    store[STORAGE_KEYS.SCHEMA_VERSION] = '6';
    store[STORAGE_KEYS.SETTINGS] = JSON.stringify(
      createV6Settings({ invoiceTemplateType: 'ACCOUNTING' })
    );

    await runMigrations();

    const settings = JSON.parse(store[STORAGE_KEYS.SETTINGS]);
    expect(settings.defaultInvoiceTemplateId).toBe('ACCOUNTING');
  });
});
