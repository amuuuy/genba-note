/**
 * Tests for cleanupOrphanedPdfCache
 *
 * Uses the global expo-file-system mock (not the manual mock in pdfGenerationService.test.ts)
 * because cleanupOrphanedPdfCache uses `instanceof File` which requires real class instances.
 */

// Mock expo-print (required by pdfGenerationService imports)
jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(),
}));

// Mock expo-sharing (required by pdfGenerationService imports)
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

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

import { File, Directory } from 'expo-file-system';
import { cleanupOrphanedPdfCache } from '@/pdf/pdfGenerationService';

describe('cleanupOrphanedPdfCache', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    (Directory as any)._mockListEntries = [];
  });

  it('deletes PDF files in cache directory', () => {
    const deleteSpy = jest.spyOn(File.prototype, 'delete');
    const pdfFile = new File('file:///mock/cache/document.pdf');
    (Directory as any)._mockListEntries = [pdfFile];

    cleanupOrphanedPdfCache();

    expect(deleteSpy).toHaveBeenCalled();
    deleteSpy.mockRestore();
  });

  it('skips non-PDF files in cache directory', () => {
    const deleteSpy = jest.spyOn(File.prototype, 'delete');
    const txtFile = new File('file:///mock/cache/data.txt');
    (Directory as any)._mockListEntries = [txtFile];

    cleanupOrphanedPdfCache();

    expect(deleteSpy).not.toHaveBeenCalled();
    deleteSpy.mockRestore();
  });

  it('skips directories in cache', () => {
    const deleteSpy = jest.spyOn(File.prototype, 'delete');
    const subDir = new Directory('file:///mock/cache/subdir');
    (Directory as any)._mockListEntries = [subDir];

    cleanupOrphanedPdfCache();

    expect(deleteSpy).not.toHaveBeenCalled();
    deleteSpy.mockRestore();
  });

  it('deletes only PDF files among mixed entries', () => {
    const deleteSpy = jest.spyOn(File.prototype, 'delete');
    const pdfFile = new File('file:///mock/cache/output.pdf');
    const txtFile = new File('file:///mock/cache/log.txt');
    const subDir = new Directory('file:///mock/cache/subdir');
    (Directory as any)._mockListEntries = [pdfFile, txtFile, subDir];

    cleanupOrphanedPdfCache();

    // delete is called once for the PDF file
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    deleteSpy.mockRestore();
  });

  it('does not throw when cache directory is empty', () => {
    (Directory as any)._mockListEntries = [];
    expect(() => cleanupOrphanedPdfCache()).not.toThrow();
  });

  it('does not throw when individual file deletion fails', () => {
    const deleteSpy = jest.spyOn(File.prototype, 'delete').mockImplementation(() => {
      throw new Error('Permission denied');
    });
    const pdfFile = new File('file:///mock/cache/locked.pdf');
    (Directory as any)._mockListEntries = [pdfFile];

    expect(() => cleanupOrphanedPdfCache()).not.toThrow();
    deleteSpy.mockRestore();
  });
});
