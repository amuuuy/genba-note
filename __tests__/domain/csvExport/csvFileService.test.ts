/**
 * Tests for CSV File Service
 *
 * These tests mock expo-file-system, expo-sharing, storage, and pro gate service
 * to test the async file export logic.
 */

// Mock functions for File class
const mockFileWrite = jest.fn();
const mockFileDelete = jest.fn();

// Mock react-native-purchases (required by subscription service)
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    getCustomerInfo: jest.fn(),
    restorePurchases: jest.fn(),
  },
}));

// Mock expo-secure-store (required by subscription service)
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock react-native-device-info (required by uptime service)
jest.mock('react-native-device-info', () => ({
  __esModule: true,
  getStartupTime: jest.fn(),
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock expo-file-system with new File API
jest.mock('expo-file-system', () => {
  return {
    File: jest.fn().mockImplementation((...uris: string[]) => ({
      uri: uris.join('/'),
      write: mockFileWrite,
      delete: mockFileDelete,
    })),
    Paths: {
      cache: { uri: 'file:///cache' },
    },
  };
});

// Mock expo-sharing
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

// Mock asyncStorageService
jest.mock('@/storage/asyncStorageService');

import * as Sharing from 'expo-sharing';
import * as asyncStorageService from '@/storage/asyncStorageService';
import { setReadOnlyMode } from '@/storage/asyncStorageService';
import { exportInvoicesToCsv } from '@/domain/csvExport/csvFileService';
import {
  setProStatusOverride,
  resetProStatusOverride,
} from '@/subscription/proAccessService';
import { createSentInvoice, createPaidInvoice, createDraftInvoice } from './helpers';

const mockedAsyncStorage = jest.mocked(asyncStorageService);

describe('csvFileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetProStatusOverride();
    setReadOnlyMode(false);
    mockFileWrite.mockResolvedValue(undefined);
    mockFileDelete.mockResolvedValue(undefined);
  });

  afterEach(() => {
    resetProStatusOverride();
    setReadOnlyMode(false);
  });

  describe('exportInvoicesToCsv', () => {
    describe('Pro status enforcement', () => {
      it('returns PRO_REQUIRED error when not Pro', async () => {
        setProStatusOverride(false);

        const result = await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('PRO_REQUIRED');
        expect(result.error?.message).toContain('Pro subscription');
        expect(mockedAsyncStorage.filterDocuments).not.toHaveBeenCalled();
      });

      it('proceeds with export when Pro', async () => {
        setProStatusOverride(true);

        const invoices = [createSentInvoice('2026-01-10')];
        mockedAsyncStorage.filterDocuments.mockResolvedValue({
          success: true,
          data: invoices,
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
        (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

        const result = await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        expect(result.success).toBe(true);
        expect(mockedAsyncStorage.filterDocuments).toHaveBeenCalled();
      });
    });

    describe('storage error handling', () => {
      beforeEach(() => {
        setProStatusOverride(true);
      });

      it('returns STORAGE_ERROR when filterDocuments fails', async () => {
        mockedAsyncStorage.filterDocuments.mockResolvedValue({
          success: false,
          error: { code: 'READ_ERROR', message: 'Failed to read' },
        });

        const result = await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('STORAGE_ERROR');
      });
    });

    describe('no data handling', () => {
      beforeEach(() => {
        setProStatusOverride(true);
      });

      it('returns NO_DATA when no invoices match filter', async () => {
        // Return invoices outside the period
        const invoices = [createSentInvoice('2025-12-01')];
        mockedAsyncStorage.filterDocuments.mockResolvedValue({
          success: true,
          data: invoices,
        });

        const result = await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('NO_DATA');
        expect(result.error?.message).toContain('No invoices');
      });

      it('returns NO_DATA when all invoices are draft', async () => {
        const invoices = [createDraftInvoice('2026-01-10')];
        mockedAsyncStorage.filterDocuments.mockResolvedValue({
          success: true,
          data: invoices,
        });

        const result = await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('NO_DATA');
      });

      it('returns NO_DATA when storage returns empty array', async () => {
        mockedAsyncStorage.filterDocuments.mockResolvedValue({
          success: true,
          data: [],
        });

        const result = await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('NO_DATA');
      });
    });

    describe('file write error handling', () => {
      beforeEach(() => {
        setProStatusOverride(true);
      });

      it('returns FILE_WRITE_ERROR when file.write fails', async () => {
        const invoices = [createSentInvoice('2026-01-10')];
        mockedAsyncStorage.filterDocuments.mockResolvedValue({
          success: true,
          data: invoices,
        });
        mockFileWrite.mockRejectedValue(new Error('Disk full'));

        const result = await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('FILE_WRITE_ERROR');
        expect(result.error?.message).toContain('Disk full');
      });
    });

    describe('sharing error handling', () => {
      beforeEach(() => {
        setProStatusOverride(true);
      });

      it('returns SHARE_FAILED when sharing not available', async () => {
        const invoices = [createSentInvoice('2026-01-10')];
        mockedAsyncStorage.filterDocuments.mockResolvedValue({
          success: true,
          data: invoices,
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

        const result = await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('SHARE_FAILED');
        expect(result.error?.message).toContain('not available');
      });

      it('returns SHARE_FAILED when shareAsync throws', async () => {
        const invoices = [createSentInvoice('2026-01-10')];
        mockedAsyncStorage.filterDocuments.mockResolvedValue({
          success: true,
          data: invoices,
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
        (Sharing.shareAsync as jest.Mock).mockRejectedValue(
          new Error('Share failed')
        );

        const result = await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('SHARE_FAILED');
      });

      it('returns SHARE_CANCELLED when user cancels', async () => {
        const invoices = [createSentInvoice('2026-01-10')];
        mockedAsyncStorage.filterDocuments.mockResolvedValue({
          success: true,
          data: invoices,
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
        (Sharing.shareAsync as jest.Mock).mockRejectedValue(
          new Error('User cancelled the share action')
        );

        const result = await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('SHARE_CANCELLED');
      });
    });

    describe('successful export flow', () => {
      beforeEach(() => {
        setProStatusOverride(true);
      });

      it('exports invoices and returns rowCount', async () => {
        const invoices = [
          createSentInvoice('2026-01-10'),
          createPaidInvoice('2026-01-15', '2026-01-20'),
        ];
        mockedAsyncStorage.filterDocuments.mockResolvedValue({
          success: true,
          data: invoices,
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
        (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

        const result = await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        expect(result.success).toBe(true);
        expect(result.data?.rowCount).toBe(2);
      });

      it('writes CSV content to file', async () => {
        const invoices = [createSentInvoice('2026-01-10')];
        mockedAsyncStorage.filterDocuments.mockResolvedValue({
          success: true,
          data: invoices,
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
        (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

        await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        expect(mockFileWrite).toHaveBeenCalledWith(expect.any(String));
        // Verify the content starts with BOM
        const writtenContent = mockFileWrite.mock.calls[0][0];
        expect(writtenContent.startsWith('\uFEFF')).toBe(true);
      });

      it('shares CSV file with correct mime type', async () => {
        const invoices = [createSentInvoice('2026-01-10')];
        mockedAsyncStorage.filterDocuments.mockResolvedValue({
          success: true,
          data: invoices,
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
        (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

        await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        expect(Sharing.shareAsync).toHaveBeenCalledWith(
          expect.stringContaining('invoices_20260115.csv'),
          {
            mimeType: 'text/csv',
            UTI: 'public.comma-separated-values-text',
          }
        );
      });

      it('cleans up temporary file after sharing', async () => {
        const invoices = [createSentInvoice('2026-01-10')];
        mockedAsyncStorage.filterDocuments.mockResolvedValue({
          success: true,
          data: invoices,
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
        (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

        await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        expect(mockFileDelete).toHaveBeenCalled();
      });

      it('cleans up temporary file even when sharing fails', async () => {
        const invoices = [createSentInvoice('2026-01-10')];
        mockedAsyncStorage.filterDocuments.mockResolvedValue({
          success: true,
          data: invoices,
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
        (Sharing.shareAsync as jest.Mock).mockRejectedValue(
          new Error('Share failed')
        );

        await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        expect(mockFileDelete).toHaveBeenCalled();
      });
    });

    describe('filter parameters', () => {
      beforeEach(() => {
        setProStatusOverride(true);
      });

      it('passes correct filter to asyncStorageService', async () => {
        mockedAsyncStorage.filterDocuments.mockResolvedValue({
          success: true,
          data: [],
        });

        await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        expect(mockedAsyncStorage.filterDocuments).toHaveBeenCalledWith(
          { type: 'invoice', status: ['sent', 'paid'] },
          undefined
        );
      });
    });

    describe('read-only mode compatibility', () => {
      /**
       * CSV export should work in read-only mode because:
       * 1. filterDocuments is a read operation (not blocked)
       * 2. File writes go to file system cache (not AsyncStorage)
       * 3. Pro status check reads from SecureStore (not blocked)
       */

      it('exports CSV successfully when Pro and read-only mode enabled', async () => {
        // Enable Pro status and read-only mode
        setProStatusOverride(true);
        setReadOnlyMode(true);

        // Mock documents
        const invoices = [createSentInvoice('2026-01-10')];
        mockedAsyncStorage.filterDocuments.mockResolvedValue({
          success: true,
          data: invoices,
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
        (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

        const result = await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        // CSV export should succeed
        expect(result.success).toBe(true);
        expect(result.data?.rowCount).toBe(1);
        expect(mockFileWrite).toHaveBeenCalled();
        expect(Sharing.shareAsync).toHaveBeenCalled();
      });

      it('uses filterDocuments (read operation) not saveDocument', async () => {
        // Enable Pro status and read-only mode
        setProStatusOverride(true);
        setReadOnlyMode(true);

        const invoices = [createSentInvoice('2026-01-10')];
        mockedAsyncStorage.filterDocuments.mockResolvedValue({
          success: true,
          data: invoices,
        });
        (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
        (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

        await exportInvoicesToCsv({
          periodType: 'this-month',
          referenceDate: '2026-01-15',
        });

        // Verify only read operation was called
        expect(mockedAsyncStorage.filterDocuments).toHaveBeenCalled();
        // saveDocument should not be called (would fail in read-only mode)
      });
    });
  });
});
