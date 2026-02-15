/**
 * Tests for safeOpenUrl utility
 *
 * Verifies URL validation and safe opening behavior.
 */

import { isOpenableUrl, safeOpenUrl } from '@/utils/safeOpenUrl';
import { Linking } from 'react-native';

jest.mock('react-native', () => ({
  Linking: {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  },
}));

const mockCanOpenURL = Linking.canOpenURL as jest.MockedFunction<
  typeof Linking.canOpenURL
>;
const mockOpenURL = Linking.openURL as jest.MockedFunction<
  typeof Linking.openURL
>;

describe('isOpenableUrl', () => {
  it('returns true for https URL', () => {
    expect(isOpenableUrl('https://example.com')).toBe(true);
  });

  it('returns true for http URL', () => {
    expect(isOpenableUrl('http://example.com')).toBe(true);
  });

  it('returns false for javascript: URL', () => {
    expect(isOpenableUrl('javascript:alert(1)')).toBe(false);
  });

  it('returns false for data: URL', () => {
    expect(isOpenableUrl('data:text/html,<h1>test</h1>')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isOpenableUrl('')).toBe(false);
  });

  it('returns false for non-URL string', () => {
    expect(isOpenableUrl('not a url')).toBe(false);
  });

  it('returns false for file: URL', () => {
    expect(isOpenableUrl('file:///etc/passwd')).toBe(false);
  });
});

describe('safeOpenUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens valid https URL when canOpenURL returns true', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    mockOpenURL.mockResolvedValue(undefined as never);

    await safeOpenUrl('https://example.com');

    expect(mockCanOpenURL).toHaveBeenCalledWith('https://example.com');
    expect(mockOpenURL).toHaveBeenCalledWith('https://example.com');
  });

  it('does not open URL when canOpenURL returns false', async () => {
    mockCanOpenURL.mockResolvedValue(false);

    await safeOpenUrl('https://cannot-open.com');

    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  it('does not open invalid URL scheme', async () => {
    await safeOpenUrl('javascript:alert(1)');

    expect(mockCanOpenURL).not.toHaveBeenCalled();
    expect(mockOpenURL).not.toHaveBeenCalled();
  });

  it('does not throw when openURL fails', async () => {
    mockCanOpenURL.mockResolvedValue(true);
    mockOpenURL.mockRejectedValue(new Error('Cannot open URL'));

    await expect(safeOpenUrl('https://example.com')).resolves.not.toThrow();
  });

  it('does not throw when canOpenURL fails', async () => {
    mockCanOpenURL.mockRejectedValue(new Error('Unknown error'));

    await expect(safeOpenUrl('https://example.com')).resolves.not.toThrow();
  });
});
