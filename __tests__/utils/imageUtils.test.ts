/**
 * Tests for imageUtils.ts - imageUriToBase64 / imageUriToDataUrl / getImageMimeType
 */
import { File } from 'expo-file-system';
import { imageUriToBase64, imageUriToDataUrl, getImageMimeType } from '@/utils/imageUtils';

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
