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
  let deleteSpy: jest.SpyInstance;
  let listSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.restoreAllMocks();
    deleteSpy = jest.spyOn(File.prototype, 'delete');
    listSpy = jest.spyOn(Directory.prototype, 'list');
  });

  afterEach(() => {
    deleteSpy.mockRestore();
    listSpy.mockRestore();
  });

  it('deletes PDF files in cache directory', () => {
    const pdfFile = new File('file:///mock/cache/document.pdf');
    listSpy.mockReturnValueOnce([pdfFile]);

    cleanupOrphanedPdfCache();

    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it('skips non-PDF files in cache directory', () => {
    const txtFile = new File('file:///mock/cache/data.txt');
    listSpy.mockReturnValueOnce([txtFile]);

    cleanupOrphanedPdfCache();

    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('does not delete directories themselves', () => {
    const subDir = new Directory('file:///mock/cache/subdir');
    listSpy
      .mockReturnValueOnce([subDir])   // cache root → contains subdir
      .mockReturnValueOnce([]);         // subdir → empty

    cleanupOrphanedPdfCache();

    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('deletes only PDF files among mixed entries', () => {
    const pdfFile = new File('file:///mock/cache/output.pdf');
    const txtFile = new File('file:///mock/cache/log.txt');
    const subDir = new Directory('file:///mock/cache/subdir');
    listSpy
      .mockReturnValueOnce([pdfFile, txtFile, subDir])
      .mockReturnValueOnce([]);  // subdir → empty

    cleanupOrphanedPdfCache();

    // delete is called once for the PDF file
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it('does not throw when cache directory is empty', () => {
    listSpy.mockReturnValueOnce([]);
    expect(() => cleanupOrphanedPdfCache()).not.toThrow();
  });

  it('does not throw when individual file deletion fails', () => {
    deleteSpy.mockImplementation(() => {
      throw new Error('Permission denied');
    });
    const pdfFile = new File('file:///mock/cache/locked.pdf');
    listSpy.mockReturnValueOnce([pdfFile]);

    expect(() => cleanupOrphanedPdfCache()).not.toThrow();
  });

  it('deletes PDFs in subdirectories (e.g. cache/Print/)', () => {
    const printDir = new Directory('file:///mock/cache/Print');
    const nestedPdf = new File('file:///mock/cache/Print/UUID.pdf');
    listSpy
      .mockReturnValueOnce([printDir])    // cache root → Print dir
      .mockReturnValueOnce([nestedPdf]);  // Print dir → nested PDF

    cleanupOrphanedPdfCache();

    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it('deletes PDF files with uppercase extension (.PDF)', () => {
    const upperPdf = new File('file:///mock/cache/DOCUMENT.PDF');
    listSpy.mockReturnValueOnce([upperPdf]);

    cleanupOrphanedPdfCache();

    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it('does not throw when subdirectory list fails', () => {
    const subDir = new Directory('file:///mock/cache/broken');
    listSpy
      .mockReturnValueOnce([subDir])
      .mockImplementationOnce(() => { throw new Error('Access denied'); });

    expect(() => cleanupOrphanedPdfCache()).not.toThrow();
  });
});
