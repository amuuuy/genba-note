/**
 * Tests for v1→v9 full chain migration
 *
 * Integration test that verifies the complete migration chain from v0/v1 to v9.
 * Uses a map-based AsyncStorage mock so setItem updates what getItem returns.
 *
 * Two scenarios:
 * 1. Fresh install (v0→v9): empty store, v1 initializes defaults
 * 2. Existing data (v1→v9): pre-existing documents/settings/photos
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
import { v1InitialMigration } from '@/storage/migrations/v1-initial';
import { v2AddCarriedForwardAndContactPersonMigration } from '@/storage/migrations/v2-add-carried-forward-and-contact-person';
import { v3AddFaxFieldMigration } from '@/storage/migrations/v3-add-fax-field';
import { v4AddCustomerMasterMigration } from '@/storage/migrations/v4-add-customer-master';
import { v5AddWorkLogEntriesMigration } from '@/storage/migrations/v5-add-work-log-entries';
import { v6RemoveUndatedPhotosMigration } from '@/storage/migrations/v6-remove-undated-photos';
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

// Mock asyncStorageService — migrationRunner uses getSchemaVersion/setSchemaVersion
jest.mock('@/storage/asyncStorageService', () => {
  // Use require() inside factory (jest.mock is hoisted above imports)
  const { STORAGE_KEYS } = require('@/utils/constants');
  return {
    getSchemaVersion: jest.fn(async () => {
      const raw = store[STORAGE_KEYS.SCHEMA_VERSION];
      if (raw === undefined || raw === null) {
        return { success: true, data: 0 };
      }
      return { success: true, data: parseInt(raw, 10) };
    }),
    setSchemaVersion: jest.fn(async (version: number) => {
      store[STORAGE_KEYS.SCHEMA_VERSION] = String(version);
      return { success: true };
    }),
    setReadOnlyMode: jest.fn(),
    getReadOnlyMode: jest.fn(() => false),
  };
});

// Mock generateUUID for deterministic customer IDs in v4
let uuidCounter = 0;
jest.mock('@/utils/uuid', () => ({
  generateUUID: jest.fn(() => `chain-uuid-${++uuidCounter}`),
}));

// Mock expo-file-system for v6 (orphaned photo cleanup)
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  deleteAsync: jest.fn(async () => {}),
}));

// Mock writeQueue for v6 — photosQueue.enqueue should just execute the callback
jest.mock('@/utils/writeQueue', () => ({
  photosQueue: {
    enqueue: jest.fn(async <T>(fn: () => Promise<T>): Promise<T> => fn()),
  },
}));

function registerAllMigrations() {
  registerMigration(v1InitialMigration);
  registerMigration(v2AddCarriedForwardAndContactPersonMigration);
  registerMigration(v3AddFaxFieldMigration);
  registerMigration(v4AddCustomerMasterMigration);
  registerMigration(v5AddWorkLogEntriesMigration);
  registerMigration(v6RemoveUndatedPhotosMigration);
  registerMigration(v7AddPdfCustomizationMigration);
  registerMigration(v8AddCalendarEventsMigration);
  registerMigration(v9AddEmailFieldMigration);
}

describe('v1→v9 chain migration', () => {
  beforeEach(() => {
    // Clear store
    Object.keys(store).forEach((key) => delete store[key]);

    // Reset migration runner state
    clearMigrations();
    resetMigrationsInitialized();
    registerAllMigrations();

    uuidCounter = 0;
    jest.clearAllMocks();
  });

  it('should have CURRENT_SCHEMA_VERSION = 9', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(9);
  });

  describe('fresh install (v0→v9)', () => {
    it('should migrate from v0 to v9 successfully', async () => {
      // Empty store — v0 state
      const result = await runMigrations();

      expect(result.success).toBe(true);
      expect(result.startVersion).toBe(0);
      expect(result.endVersion).toBe(9);
      expect(result.migrationsRun).toBe(9);
      expect(result.readOnlyMode).toBe(false);
    });

    it('should update schema version to 9', async () => {
      await runMigrations();

      const version = parseInt(store[STORAGE_KEYS.SCHEMA_VERSION], 10);
      expect(version).toBe(9);
    });

    it('should initialize settings with all fields from v1 through v9', async () => {
      await runMigrations();

      const settings = JSON.parse(store[STORAGE_KEYS.SETTINGS]);
      // v1 initializes with DEFAULT_APP_SETTINGS which already has all fields
      expect(settings.issuer.companyName).toBeNull();
      expect(settings.issuer.contactPerson).toBeNull();
      expect(settings.issuer.showContactPerson).toBe(true);
      expect(settings.issuer.fax).toBeNull();
      expect(settings.issuer.email).toBeNull();
      // v7 fields
      expect(settings.sealSize).toBe('MEDIUM');
      expect(settings.backgroundDesign).toBe('NONE');
      expect(settings.defaultEstimateTemplateId).toBe('FORMAL_STANDARD');
    });

    it('should initialize empty collections', async () => {
      await runMigrations();

      expect(JSON.parse(store[STORAGE_KEYS.DOCUMENTS])).toEqual([]);
      expect(JSON.parse(store[STORAGE_KEYS.UNIT_PRICES])).toEqual([]);
      expect(JSON.parse(store[STORAGE_KEYS.CUSTOMERS])).toEqual([]);
      expect(JSON.parse(store[STORAGE_KEYS.CUSTOMER_PHOTOS])).toEqual([]);
      expect(JSON.parse(store[STORAGE_KEYS.WORK_LOG_ENTRIES])).toEqual([]);
      expect(JSON.parse(store[STORAGE_KEYS.CALENDAR_EVENTS])).toEqual([]);
    });
  });

  describe('existing data (v1→v9)', () => {
    /**
     * Create a v1-era settings object (only fields that existed at v1).
     * Does NOT include contactPerson, showContactPerson, fax, email,
     * sealSize, backgroundDesign, templateIds — those are added by later migrations.
     */
    function createV1Settings() {
      return {
        issuer: {
          companyName: '株式会社テスト建設',
          representativeName: '山田太郎',
          address: '東京都渋谷区1-2-3',
          phone: '03-1234-5678',
          sealImageUri: null,
        },
        numbering: {
          estimatePrefix: 'EST-',
          invoicePrefix: 'INV-',
          nextEstimateNumber: 5,
          nextInvoiceNumber: 3,
        },
        invoiceTemplateType: 'ACCOUNTING',
        schemaVersion: 1,
      };
    }

    /**
     * Create v1-era documents (no carriedForwardAmount, contactPerson, fax, email, customerId).
     */
    function createV1Documents() {
      return [
        {
          id: 'doc-1',
          type: 'estimate',
          clientName: '顧客A株式会社',
          clientAddress: '東京都新宿区1-1-1',
          createdAt: 1000,
          updatedAt: 1000,
          issuerSnapshot: {
            companyName: '株式会社テスト建設',
            representativeName: '山田太郎',
            address: '東京都渋谷区1-2-3',
            phone: '03-1234-5678',
            sealImageBase64: null,
          },
        },
        {
          id: 'doc-2',
          type: 'invoice',
          clientName: '顧客A株式会社',
          clientAddress: '東京都新宿区1-1-1',
          createdAt: 2000,
          updatedAt: 2000,
          issuerSnapshot: {
            companyName: '株式会社テスト建設',
            representativeName: '山田太郎',
            address: '東京都渋谷区1-2-3',
            phone: '03-1234-5678',
            sealImageBase64: null,
          },
        },
        {
          id: 'doc-3',
          type: 'estimate',
          clientName: '顧客B商事',
          clientAddress: null,
          createdAt: 3000,
          updatedAt: 3000,
          issuerSnapshot: {
            companyName: '株式会社テスト建設',
            representativeName: '山田太郎',
            address: '東京都渋谷区1-2-3',
            phone: '03-1234-5678',
            sealImageBase64: null,
          },
        },
      ];
    }

    beforeEach(() => {
      store[STORAGE_KEYS.SCHEMA_VERSION] = '1';
      store[STORAGE_KEYS.SETTINGS] = JSON.stringify(createV1Settings());
      store[STORAGE_KEYS.DOCUMENTS] = JSON.stringify(createV1Documents());
      store[STORAGE_KEYS.UNIT_PRICES] = JSON.stringify([]);
    });

    it('should migrate from v1 to v9 successfully', async () => {
      const result = await runMigrations();

      expect(result.success).toBe(true);
      expect(result.startVersion).toBe(1);
      expect(result.endVersion).toBe(9);
      expect(result.migrationsRun).toBe(8); // v2 through v9
      expect(result.readOnlyMode).toBe(false);
    });

    it('should add v2 fields: carriedForwardAmount and contactPerson', async () => {
      await runMigrations();

      const documents = JSON.parse(store[STORAGE_KEYS.DOCUMENTS]);
      for (const doc of documents) {
        expect(doc.carriedForwardAmount).toBeNull();
        expect(doc.issuerSnapshot.contactPerson).toBeNull();
      }

      const settings = JSON.parse(store[STORAGE_KEYS.SETTINGS]);
      expect(settings.issuer.contactPerson).toBeNull();
      expect(settings.issuer.showContactPerson).toBe(true);
    });

    it('should add v3 fields: fax', async () => {
      await runMigrations();

      const documents = JSON.parse(store[STORAGE_KEYS.DOCUMENTS]);
      for (const doc of documents) {
        expect(doc.issuerSnapshot.fax).toBeNull();
      }

      const settings = JSON.parse(store[STORAGE_KEYS.SETTINGS]);
      expect(settings.issuer.fax).toBeNull();
    });

    it('should add v4 fields: customers and customerId', async () => {
      await runMigrations();

      // Two unique customers: 顧客A株式会社 (2 docs) + 顧客B商事 (1 doc)
      const customers = JSON.parse(store[STORAGE_KEYS.CUSTOMERS]);
      expect(customers).toHaveLength(2);

      const customerA = customers.find((c: { name: string }) => c.name === '顧客A株式会社');
      const customerB = customers.find((c: { name: string }) => c.name === '顧客B商事');
      expect(customerA).toBeDefined();
      expect(customerB).toBeDefined();

      // 顧客A should use earliest createdAt (1000)
      expect(customerA.createdAt).toBe(1000);

      // Documents should have customerId
      const documents = JSON.parse(store[STORAGE_KEYS.DOCUMENTS]);
      expect(documents[0].customerId).toBe(customerA.id);
      expect(documents[1].customerId).toBe(customerA.id); // same customer
      expect(documents[2].customerId).toBe(customerB.id);
    });

    it('should initialize v4 customer_photos and v5 work_log_entries', async () => {
      await runMigrations();

      const photos = JSON.parse(store[STORAGE_KEYS.CUSTOMER_PHOTOS]);
      expect(photos).toEqual([]);

      const entries = JSON.parse(store[STORAGE_KEYS.WORK_LOG_ENTRIES]);
      expect(entries).toEqual([]);
    });

    it('should add v7 PDF customization fields', async () => {
      await runMigrations();

      const settings = JSON.parse(store[STORAGE_KEYS.SETTINGS]);
      expect(settings.sealSize).toBe('MEDIUM');
      expect(settings.backgroundDesign).toBe('NONE');
      expect(settings.defaultEstimateTemplateId).toBe('FORMAL_STANDARD');
      expect(settings.defaultInvoiceTemplateId).toBe('ACCOUNTING'); // mapped from invoiceTemplateType
    });

    it('should initialize v8 calendar_events', async () => {
      await runMigrations();

      const calendarEvents = JSON.parse(store[STORAGE_KEYS.CALENDAR_EVENTS]);
      expect(calendarEvents).toEqual([]);
    });

    it('should add v9 email field', async () => {
      await runMigrations();

      const settings = JSON.parse(store[STORAGE_KEYS.SETTINGS]);
      expect(settings.issuer.email).toBeNull();

      const documents = JSON.parse(store[STORAGE_KEYS.DOCUMENTS]);
      for (const doc of documents) {
        expect(doc.issuerSnapshot.email).toBeNull();
      }
    });

    it('should set final schema version to 9', async () => {
      await runMigrations();

      const version = parseInt(store[STORAGE_KEYS.SCHEMA_VERSION], 10);
      expect(version).toBe(9);
    });

    it('should map SIMPLE invoiceTemplateType correctly through chain', async () => {
      // Override to use SIMPLE template
      store[STORAGE_KEYS.SETTINGS] = JSON.stringify({
        ...createV1Settings(),
        invoiceTemplateType: 'SIMPLE',
      });

      await runMigrations();

      const settings = JSON.parse(store[STORAGE_KEYS.SETTINGS]);
      expect(settings.defaultInvoiceTemplateId).toBe('SIMPLE');
    });
  });
});
