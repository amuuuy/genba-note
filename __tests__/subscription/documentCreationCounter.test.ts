/**
 * Document Creation Counter Tests
 *
 * Tests for the cumulative document creation counter.
 * "Cumulative" means the count only goes up - deleting docs does NOT reduce the count.
 * Fail-closed: corrupt data blocks creation rather than resetting to 0.
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

// Mock writeQueue to execute immediately (no actual queuing in tests)
jest.mock('@/utils/writeQueue', () => ({
  createWriteQueue: () => ({
    enqueue: <T>(fn: () => Promise<T>) => fn(),
  }),
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
  it('should return success with 0 when no value stored', async () => {
    mockGetItem.mockResolvedValue(null);
    const result = await getDocumentCreationCount();
    expect(result.success).toBe(true);
    expect(result.count).toBe(0);
  });

  it('should return success with stored count', async () => {
    mockGetItem.mockResolvedValue('5');
    const result = await getDocumentCreationCount();
    expect(result.success).toBe(true);
    expect(result.count).toBe(5);
  });

  it('should return error when stored value is not a number (fail-closed)', async () => {
    mockGetItem.mockResolvedValue('invalid');
    const result = await getDocumentCreationCount();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Corrupt counter value');
  });

  it('should return error when stored value is negative (fail-closed)', async () => {
    mockGetItem.mockResolvedValue('-3');
    const result = await getDocumentCreationCount();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Corrupt counter value');
  });

  it('should return error for partial numeric like "123abc" (fail-closed)', async () => {
    mockGetItem.mockResolvedValue('123abc');
    const result = await getDocumentCreationCount();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Corrupt counter value');
  });

  it('should return error for scientific notation "1e3" (fail-closed)', async () => {
    mockGetItem.mockResolvedValue('1e3');
    const result = await getDocumentCreationCount();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Corrupt counter value');
  });

  it('should return error for hex "0x10" (fail-closed)', async () => {
    mockGetItem.mockResolvedValue('0x10');
    const result = await getDocumentCreationCount();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Corrupt counter value');
  });

  it('should return error on read error (fail-closed)', async () => {
    mockGetItem.mockRejectedValue(new Error('storage error'));
    const result = await getDocumentCreationCount();
    expect(result.success).toBe(false);
    expect(result.error).toBe('storage error');
  });
});

describe('incrementDocumentCreationCount', () => {
  it('should increment from 0 when no value stored', async () => {
    mockGetItem.mockResolvedValue(null);
    mockSetItem.mockResolvedValue(undefined);

    const result = await incrementDocumentCreationCount();

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(mockSetItem).toHaveBeenCalledWith(DOCUMENT_CREATION_COUNT_KEY, '1');
  });

  it('should increment existing count', async () => {
    mockGetItem.mockResolvedValue('3');
    mockSetItem.mockResolvedValue(undefined);

    const result = await incrementDocumentCreationCount();

    expect(result.success).toBe(true);
    expect(result.count).toBe(4);
    expect(mockSetItem).toHaveBeenCalledWith(DOCUMENT_CREATION_COUNT_KEY, '4');
  });

  it('should block increment on corrupted storage (fail-closed)', async () => {
    mockGetItem.mockResolvedValue('corrupt');
    mockSetItem.mockResolvedValue(undefined);

    const result = await incrementDocumentCreationCount();

    expect(result.success).toBe(false);
    expect(result.error).toContain('Corrupt counter value');
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('should return error on write failure', async () => {
    mockGetItem.mockResolvedValue('0');
    mockSetItem.mockRejectedValue(new Error('write error'));

    const result = await incrementDocumentCreationCount();

    expect(result.success).toBe(false);
    expect(result.error).toBe('write error');
  });
});
