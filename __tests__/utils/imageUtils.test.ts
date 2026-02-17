/**
 * Tests for imageUtils.ts - imageUriToBase64 / imageUriToDataUrl / getImageMimeType / path traversal
 */
import { File } from 'expo-file-system';
import {
  imageUriToBase64,
  imageUriToDataUrl,
  getImageMimeType,
  copyImageToPermanentStorage,
  copyBackgroundImageToPermanentStorage,
  copyCustomerPhotoToPermanentStorage,
  copyFinancePhotoToPermanentStorage,
  copyFinancePhotoToTempStorage,
  moveFinancePhotoToEntryDirectory,
  deleteCustomerPhotosDirectory,
  deleteFinancePhotosDirectory,
  deleteStoredImage,
  MAX_SEAL_IMAGE_SIZE_BYTES,
  MAX_BACKGROUND_IMAGE_SIZE_BYTES,
  MAX_PHOTO_SIZE_BYTES,
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
    it('throws when customerId has path traversal', async () => {
      await expect(
        deleteCustomerPhotosDirectory('../../sensitive')
      ).rejects.toThrow('Invalid customerId');
    });
  });

  describe('deleteFinancePhotosDirectory', () => {
    it('does not delete when financeEntryId has path traversal', async () => {
      await deleteFinancePhotosDirectory('../../sensitive');
    });
  });

  describe('deleteStoredImage allowlist', () => {
    it('allows deletion of seal_images file', async () => {
      const deleteSpy = jest.spyOn(File.prototype, 'delete');
      await deleteStoredImage('file:///mock/document/seal_images/seal_123.png');
      expect(deleteSpy).toHaveBeenCalled();
      deleteSpy.mockRestore();
    });

    it('allows deletion of customer_photos file', async () => {
      const deleteSpy = jest.spyOn(File.prototype, 'delete');
      await deleteStoredImage('file:///mock/document/customer_photos/cust-1/before/photo.jpg');
      expect(deleteSpy).toHaveBeenCalled();
      deleteSpy.mockRestore();
    });

    it('allows deletion of background_images file', async () => {
      const deleteSpy = jest.spyOn(File.prototype, 'delete');
      await deleteStoredImage('file:///mock/document/background_images/bg_123.png');
      expect(deleteSpy).toHaveBeenCalled();
      deleteSpy.mockRestore();
    });

    it('allows deletion of finance_photos file', async () => {
      const deleteSpy = jest.spyOn(File.prototype, 'delete');
      await deleteStoredImage('file:///mock/document/finance_photos/entry-1/photo.jpg');
      expect(deleteSpy).toHaveBeenCalled();
      deleteSpy.mockRestore();
    });

    it('rejects URI outside document directory', async () => {
      const deleteSpy = jest.spyOn(File.prototype, 'delete');
      await deleteStoredImage('file:///other/path/image.png');
      expect(deleteSpy).not.toHaveBeenCalled();
      deleteSpy.mockRestore();
    });

    it('rejects URI in non-allowed subdirectory', async () => {
      const deleteSpy = jest.spyOn(File.prototype, 'delete');
      await deleteStoredImage('file:///mock/document/other_dir/image.png');
      expect(deleteSpy).not.toHaveBeenCalled();
      deleteSpy.mockRestore();
    });

    it('rejects URI with raw path traversal (..)', async () => {
      const deleteSpy = jest.spyOn(File.prototype, 'delete');
      await deleteStoredImage('file:///mock/document/seal_images/../../../etc/passwd');
      expect(deleteSpy).not.toHaveBeenCalled();
      deleteSpy.mockRestore();
    });

    it('rejects URI with URL-encoded path traversal (%2e%2e)', async () => {
      const deleteSpy = jest.spyOn(File.prototype, 'delete');
      await deleteStoredImage('file:///mock/document/seal_images/%2e%2e/%2e%2e/etc/passwd');
      expect(deleteSpy).not.toHaveBeenCalled();
      deleteSpy.mockRestore();
    });

    it('rejects URI with backslash', async () => {
      const deleteSpy = jest.spyOn(File.prototype, 'delete');
      await deleteStoredImage('file:///mock/document/seal_images\\..\\etc\\passwd');
      expect(deleteSpy).not.toHaveBeenCalled();
      deleteSpy.mockRestore();
    });

    it('rejects empty string', async () => {
      const deleteSpy = jest.spyOn(File.prototype, 'delete');
      await deleteStoredImage('');
      expect(deleteSpy).not.toHaveBeenCalled();
      deleteSpy.mockRestore();
    });

    it('rejects URI with document prefix but no slash boundary (e.g. documentseal_images)', async () => {
      const deleteSpy = jest.spyOn(File.prototype, 'delete');
      // "file:///mock/documentseal_images/foo.png" should NOT pass - missing slash boundary
      await deleteStoredImage('file:///mock/documentseal_images/foo.png');
      expect(deleteSpy).not.toHaveBeenCalled();
      deleteSpy.mockRestore();
    });
  });
});

describe('image file size validation', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    (File as any)._mockExists = true;
    (File as any)._mockSize = 1024; // 1KB default
  });

  afterEach(() => {
    jest.restoreAllMocks();
    (File as any)._mockSize = 1024;
  });

  describe('size limit constants', () => {
    it('MAX_SEAL_IMAGE_SIZE_BYTES is 10MB', () => {
      expect(MAX_SEAL_IMAGE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    });

    it('MAX_BACKGROUND_IMAGE_SIZE_BYTES is 10MB', () => {
      expect(MAX_BACKGROUND_IMAGE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    });

    it('MAX_PHOTO_SIZE_BYTES is 50MB', () => {
      expect(MAX_PHOTO_SIZE_BYTES).toBe(50 * 1024 * 1024);
    });
  });

  describe('copyImageToPermanentStorage', () => {
    it('returns URI when file size is within limit', async () => {
      (File as any)._mockSize = 5 * 1024 * 1024; // 5MB
      const result = await copyImageToPermanentStorage('file:///source/seal.png');
      expect(result).not.toBeNull();
    });

    it('returns null when file exceeds 10MB limit', async () => {
      (File as any)._mockSize = 11 * 1024 * 1024; // 11MB
      const result = await copyImageToPermanentStorage('file:///source/seal.png');
      expect(result).toBeNull();
    });

    it('allows exactly 10MB file', async () => {
      (File as any)._mockSize = 10 * 1024 * 1024; // exactly 10MB
      const result = await copyImageToPermanentStorage('file:///source/seal.png');
      expect(result).not.toBeNull();
    });
  });

  describe('copyBackgroundImageToPermanentStorage', () => {
    it('returns URI when file size is within limit', async () => {
      (File as any)._mockSize = 5 * 1024 * 1024; // 5MB
      const result = await copyBackgroundImageToPermanentStorage('file:///source/bg.png');
      expect(result).not.toBeNull();
    });

    it('returns null when file exceeds 10MB limit', async () => {
      (File as any)._mockSize = 11 * 1024 * 1024; // 11MB
      const result = await copyBackgroundImageToPermanentStorage('file:///source/bg.png');
      expect(result).toBeNull();
    });
  });

  describe('copyCustomerPhotoToPermanentStorage', () => {
    it('returns URI when file size is within limit', async () => {
      (File as any)._mockSize = 30 * 1024 * 1024; // 30MB
      const result = await copyCustomerPhotoToPermanentStorage(
        'file:///source/photo.jpg',
        'customer-123',
        'before'
      );
      expect(result).not.toBeNull();
    });

    it('returns null when file exceeds 50MB limit', async () => {
      (File as any)._mockSize = 51 * 1024 * 1024; // 51MB
      const result = await copyCustomerPhotoToPermanentStorage(
        'file:///source/photo.jpg',
        'customer-123',
        'before'
      );
      expect(result).toBeNull();
    });
  });

  describe('copyFinancePhotoToPermanentStorage', () => {
    it('returns URI when file size is within limit', async () => {
      (File as any)._mockSize = 30 * 1024 * 1024; // 30MB
      const result = await copyFinancePhotoToPermanentStorage(
        'file:///source/receipt.jpg',
        'finance-entry-123'
      );
      expect(result).not.toBeNull();
    });

    it('returns null when file exceeds 50MB limit', async () => {
      (File as any)._mockSize = 51 * 1024 * 1024; // 51MB
      const result = await copyFinancePhotoToPermanentStorage(
        'file:///source/receipt.jpg',
        'finance-entry-123'
      );
      expect(result).toBeNull();
    });
  });

  describe('copyFinancePhotoToTempStorage', () => {
    it('returns URI when file size is within limit', async () => {
      (File as any)._mockSize = 30 * 1024 * 1024; // 30MB
      const result = await copyFinancePhotoToTempStorage(
        'file:///source/receipt.jpg'
      );
      expect(result).not.toBeNull();
    });

    it('returns null when file exceeds 50MB limit', async () => {
      (File as any)._mockSize = 51 * 1024 * 1024; // 51MB
      const result = await copyFinancePhotoToTempStorage(
        'file:///source/receipt.jpg'
      );
      expect(result).toBeNull();
    });
  });
});
