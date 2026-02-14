/**
 * Document Creation Counter Tests
 *
 * Tests for the cumulative document creation counter.
 * "Cumulative" means the count only goes up - deleting docs does NOT reduce the count.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getDocumentCreationCount,
  incrementDocumentCreationCount,
  DOCUMENT_CREATION_COUNT_KEY,
} from '@/subscription/documentCreationCounter';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DOCUMENT_CREATION_COUNT_KEY', () => {
  it('should be a namespaced storage key', () => {
    expect(DOCUMENT_CREATION_COUNT_KEY).toBe('@genba_document_creation_count');
  });
});

describe('getDocumentCreationCount', () => {
  it('should return 0 when no value stored', async () => {
    mockGetItem.mockResolvedValue(null);
    const count = await getDocumentCreationCount();
    expect(count).toBe(0);
  });

  it('should return stored count', async () => {
    mockGetItem.mockResolvedValue('5');
    const count = await getDocumentCreationCount();
    expect(count).toBe(5);
  });

  it('should return 0 when stored value is not a number', async () => {
    mockGetItem.mockResolvedValue('invalid');
    const count = await getDocumentCreationCount();
    expect(count).toBe(0);
  });

  it('should return 0 when stored value is negative', async () => {
    mockGetItem.mockResolvedValue('-3');
    const count = await getDocumentCreationCount();
    expect(count).toBe(0);
  });

  it('should return 0 on read error', async () => {
    mockGetItem.mockRejectedValue(new Error('storage error'));
    const count = await getDocumentCreationCount();
    expect(count).toBe(0);
  });
});

describe('incrementDocumentCreationCount', () => {
  it('should increment from 0 when no value stored', async () => {
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);

    const newCount = await incrementDocumentCreationCount();

    expect(newCount).toBe(1);
    expect(mockSetItem).toHaveBeenCalledWith(DOCUMENT_CREATION_COUNT_KEY, '1');
  });

  it('should increment existing count', async () => {
    mockGetItem.mockResolvedValue('3');
    mockSetItem.mockResolvedValue(undefined);

    const newCount = await incrementDocumentCreationCount();

    expect(newCount).toBe(4);
    expect(mockSetItem).toHaveBeenCalledWith(DOCUMENT_CREATION_COUNT_KEY, '4');
  });

  it('should handle corrupted storage gracefully (start from 0)', async () => {
    mockGetItem.mockResolvedValue('corrupt');
    mockSetItem.mockResolvedValue(undefined);

    const newCount = await incrementDocumentCreationCount();

    expect(newCount).toBe(1);
    expect(mockSetItem).toHaveBeenCalledWith(DOCUMENT_CREATION_COUNT_KEY, '1');
  });

  it('should throw on write error', async () => {
    mockGetItem.mockResolvedValue('0');
    mockSetItem.mockRejectedValue(new Error('write error'));

    await expect(incrementDocumentCreationCount()).rejects.toThrow('write error');
  });
});
