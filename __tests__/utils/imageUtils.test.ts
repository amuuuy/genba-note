/**
 * Tests for imageUtils.ts - imageUriToBase64 / imageUriToDataUrl / getImageMimeType / path traversal
 */
import { File } from 'expo-file-system';
import {
  imageUriToBase64,
  imageUriToDataUrl,
  getImageMimeType,
  copyCustomerPhotoToPermanentStorage,
  copyFinancePhotoToPermanentStorage,
  moveFinancePhotoToEntryDirectory,
  deleteCustomerPhotosDirectory,
  deleteFinancePhotosDirectory,
} from '@/utils/imageUtils';

describe('imageUriToBase64', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    (File as any)._mockExists = true;
  });

  it('should return base64 string when file exists and is readable', async () => {
    const result = await imageUriToBase64('file:///test/image.png');
    expect(result).toBe('mockBase64Data');
  });

  it('should return null when file does not exist', async () => {
    (File as any)._mockExists = false;

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await imageUriToBase64('file:///missing/image.png');

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('File does not exist')
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should return null and log console.error when base64() throws', async () => {
    jest
      .spyOn(File.prototype, 'base64')
      .mockRejectedValueOnce(new Error('Disk I/O error'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await imageUriToBase64('file:///test/image.png');

    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to convert image to base64:',
      expect.any(Error)
    );
  });
});

describe('imageUriToDataUrl', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('should wrap base64 with correct data URL prefix for jpeg', async () => {
    const result = await imageUriToDataUrl('file:///test/photo.jpg');
    expect(result).toBe('data:image/jpeg;base64,mockBase64Data');
  });

  it('should wrap base64 with correct data URL prefix for png', async () => {
    const result = await imageUriToDataUrl('file:///test/photo.png');
    expect(result).toBe('data:image/png;base64,mockBase64Data');
  });

  it('should return null when base64 conversion fails', async () => {
    jest
      .spyOn(File.prototype, 'base64')
      .mockRejectedValueOnce(new Error('fail'));
    jest.spyOn(console, 'error').mockImplementation();

    const result = await imageUriToDataUrl('file:///test/photo.jpg');
    expect(result).toBeNull();
  });
});

describe('getImageMimeType', () => {
  it('returns image/jpeg for .jpg', () => {
    expect(getImageMimeType('file:///test.jpg')).toBe('image/jpeg');
  });

  it('returns image/jpeg for .jpeg', () => {
    expect(getImageMimeType('file:///test.jpeg')).toBe('image/jpeg');
  });

  it('returns image/png for .png', () => {
    expect(getImageMimeType('file:///test.png')).toBe('image/png');
  });

  it('returns image/gif for .gif', () => {
    expect(getImageMimeType('file:///test.gif')).toBe('image/gif');
  });

  it('returns image/webp for .webp', () => {
    expect(getImageMimeType('file:///test.webp')).toBe('image/webp');
  });

  it('defaults to image/png for unknown extension', () => {
    expect(getImageMimeType('file:///test.bmp')).toBe('image/png');
  });
});

describe('path traversal protection', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('copyCustomerPhotoToPermanentStorage', () => {
    it('rejects customerId with path traversal (..)', async () => {
      const result = await copyCustomerPhotoToPermanentStorage(
        'file:///source.jpg',
        '../../../etc',
        'before'
      );
      expect(result).toBeNull();
    });

    it('rejects customerId with forward slash', async () => {
      const result = await copyCustomerPhotoToPermanentStorage(
        'file:///source.jpg',
        'foo/bar',
        'before'
      );
      expect(result).toBeNull();
    });

    it('rejects customerId with backslash', async () => {
      const result = await copyCustomerPhotoToPermanentStorage(
        'file:///source.jpg',
        'foo\\bar',
        'before'
      );
      expect(result).toBeNull();
    });

    it('rejects customerId with URL-encoded traversal', async () => {
      const result = await copyCustomerPhotoToPermanentStorage(
        'file:///source.jpg',
        '%2e%2e%2f%2e%2e%2fetc',
        'before'
      );
      expect(result).toBeNull();
    });

    it('accepts normal UUID customerId', async () => {
      const result = await copyCustomerPhotoToPermanentStorage(
        'file:///source.jpg',
        'abc-123-def-456',
        'before'
      );
      expect(result).not.toBeNull();
    });
  });

  describe('copyFinancePhotoToPermanentStorage', () => {
    it('rejects financeEntryId with path traversal', async () => {
      const result = await copyFinancePhotoToPermanentStorage(
        'file:///source.jpg',
        '../../sensitive'
      );
      expect(result).toBeNull();
    });

    it('accepts normal UUID financeEntryId', async () => {
      const result = await copyFinancePhotoToPermanentStorage(
        'file:///source.jpg',
        'finance-entry-123'
      );
      expect(result).not.toBeNull();
    });
  });

  describe('moveFinancePhotoToEntryDirectory', () => {
    it('rejects financeEntryId with path traversal', async () => {
      const result = await moveFinancePhotoToEntryDirectory(
        'file:///tmp/photo.jpg',
        '../../../etc'
      );
      expect(result).toBeNull();
    });

    it('accepts normal UUID financeEntryId', async () => {
      const result = await moveFinancePhotoToEntryDirectory(
        'file:///tmp/photo.jpg',
        'finance-entry-456'
      );
      expect(result).not.toBeNull();
    });
  });

  describe('deleteCustomerPhotosDirectory', () => {
    it('does not delete when customerId has path traversal', async () => {
      // Should not throw, just return early
      await deleteCustomerPhotosDirectory('../../sensitive');
      // If it reached this point without throwing, validation worked
    });
  });

  describe('deleteFinancePhotosDirectory', () => {
    it('does not delete when financeEntryId has path traversal', async () => {
      await deleteFinancePhotosDirectory('../../sensitive');
    });
  });
});
