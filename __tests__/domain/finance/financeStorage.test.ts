/**
 * Tests for financeStorage - deleteFinanceEntry cascade delete
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteFinanceEntry } from '@/domain/finance/financeStorage';
import { deletePhotosByFinanceEntry } from '@/domain/finance/financePhotoStorage';
import type { FinanceEntry } from '@/domain/finance/types';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('@/storage/readOnlyModeState', () => ({
  getReadOnlyMode: jest.fn(() => false),
}));

jest.mock('@/domain/finance/financePhotoStorage', () => ({
  deletePhotosByFinanceEntry: jest.fn(),
}));

const mockedAsyncStorage = jest.mocked(AsyncStorage);
const mockedDeletePhotos = jest.mocked(deletePhotosByFinanceEntry);

function createTestFinanceEntry(
  overrides: Partial<FinanceEntry> = {}
): FinanceEntry {
  return {
    id: 'fin-001',
    type: 'income',
    amount: 1000,
    date: '2026-01-15',
    description: 'Test entry',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('deleteFinanceEntry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return success when entry and photos are both deleted', async () => {
    const entries = [createTestFinanceEntry()];
    mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(entries));
    mockedAsyncStorage.setItem.mockResolvedValue();
    mockedDeletePhotos.mockResolvedValue({ success: true, data: undefined });

    const result = await deleteFinanceEntry('fin-001');

    expect(result.success).toBe(true);
    expect(mockedDeletePhotos).toHaveBeenCalledWith('fin-001');
  });

  it('should return error when cascade photo deletion fails', async () => {
    const entries = [createTestFinanceEntry()];
    mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(entries));
    mockedAsyncStorage.setItem.mockResolvedValue();
    mockedDeletePhotos.mockResolvedValue({
      success: false,
      error: {
        code: 'WRITE_ERROR',
        message: 'Failed to delete finance entry photos',
      },
    });

    const result = await deleteFinanceEntry('fin-001');

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('WRITE_ERROR');
    expect(result.error?.message).toContain('photo');
  });

  it('should still clean up photos when entry already deleted (idempotent)', async () => {
    mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));
    mockedDeletePhotos.mockResolvedValue({ success: true, data: undefined });

    const result = await deleteFinanceEntry('nonexistent');

    expect(result.success).toBe(true);
    expect(mockedDeletePhotos).toHaveBeenCalledWith('nonexistent');
  });
});
