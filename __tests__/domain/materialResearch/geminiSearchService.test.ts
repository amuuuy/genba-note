/**
 * Tests for geminiSearchService
 *
 * Tests for the API service that calls the gemini-search Edge Function.
 * Uses fetch mocking. Expects Result pattern (not throw).
 */

import { searchMaterialsWithAi } from '@/domain/materialResearch/geminiSearchService';
import { createTestGeminiEdgeFunctionResponse } from './helpers';
import { getAccessToken, initializeAuth } from '@/domain/auth/supabaseAuthService';

// Mock auth service
jest.mock('@/domain/auth/supabaseAuthService', () => ({
  getAccessToken: jest.fn(),
  initializeAuth: jest.fn(),
}));
const mockGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;
const mockInitializeAuth = initializeAuth as jest.MockedFunction<typeof initializeAuth>;

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  mockGetAccessToken.mockReset();
  mockInitializeAuth.mockReset();
  // Default: auth succeeds with a valid token
  mockGetAccessToken.mockResolvedValue('default-test-jwt');
  mockInitializeAuth.mockResolvedValue({ success: true });
});

describe('searchMaterialsWithAi', () => {
  it('returns success with empty result for empty query', async () => {
    const result = await searchMaterialsWithAi({ query: '' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toEqual([]);
      expect(result.data.summary).toBe('');
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns success with empty result for whitespace-only query', async () => {
    const result = await searchMaterialsWithAi({ query: '   ' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toEqual([]);
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls fetch with correct URL and body for valid query', async () => {
    const apiResponse = createTestGeminiEdgeFunctionResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiResponse,
    });

    await searchMaterialsWithAi({ query: 'コンパネ 12mm' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(typeof url).toBe('string');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body.query).toBe('コンパネ 12mm');
  });

  it('returns parsed AI search response on success', async () => {
    const apiResponse = createTestGeminiEdgeFunctionResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiResponse,
    });

    const result = await searchMaterialsWithAi({ query: 'コンパネ' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items.length).toBeGreaterThan(0);
      expect(result.data.items[0].name).toBe('コンパネ 12mm 3x6');
      expect(result.data.sources).toEqual(apiResponse.sources);
    }
  });

  it('returns RATE_LIMIT error on 429 with rate limit body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Rate limit exceeded. Try again later.' }),
    });

    const result = await searchMaterialsWithAi({ query: 'コンパネ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('RATE_LIMIT');
    }
  });

  it('returns DAILY_LIMIT error on 429 with daily_limit_exceeded body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: 'daily_limit_exceeded' }),
    });

    const result = await searchMaterialsWithAi({ query: 'コンパネ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('DAILY_LIMIT');
    }
  });

  it('returns AUTH_ERROR on 401 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    });

    const result = await searchMaterialsWithAi({ query: 'コンパネ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('AUTH_ERROR');
    }
  });

  it('returns API_ERROR on non-429 error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await searchMaterialsWithAi({ query: 'コンパネ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('API_ERROR');
      expect(result.error.message).toBe(
        'AI検索に失敗しました。通信状況を確認してください。'
      );
    }
  });

  it('returns NETWORK_ERROR on fetch rejection', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await searchMaterialsWithAi({ query: 'コンパネ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NETWORK_ERROR');
      expect(result.error.message).toBe(
        'AI検索に失敗しました。通信状況を確認してください。'
      );
    }
  });

  it('returns PARSE_ERROR when response has no items and no summary', async () => {
    const apiResponse = createTestGeminiEdgeFunctionResponse({
      text: '',
      sources: [],
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiResponse,
    });

    const result = await searchMaterialsWithAi({ query: 'コンパネ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PARSE_ERROR');
    }
  });

  it('trims query before sending', async () => {
    const apiResponse = createTestGeminiEdgeFunctionResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiResponse,
    });

    await searchMaterialsWithAi({ query: '  コンパネ  ' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.query).toBe('コンパネ');
  });

  it('returns PARSE_ERROR for malformed response payload (missing text)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ notText: 123, sources: [] }),
    });

    const result = await searchMaterialsWithAi({ query: 'コンパネ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PARSE_ERROR');
    }
  });

  it('returns PARSE_ERROR when response.json() throws', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new Error('Invalid JSON'); },
    });

    const result = await searchMaterialsWithAi({ query: 'コンパネ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PARSE_ERROR');
    }
  });

  it('returns PARSE_ERROR when response.json() resolves to null', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    });

    const result = await searchMaterialsWithAi({ query: 'コンパネ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PARSE_ERROR');
    }
  });

  it('returns PARSE_ERROR when response.json() resolves to a primitive', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => 123,
    });

    const result = await searchMaterialsWithAi({ query: 'コンパネ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PARSE_ERROR');
    }
  });

  it('uses user JWT from getAccessToken in Authorization header', async () => {
    mockGetAccessToken.mockResolvedValueOnce('user-jwt-from-auth');
    const apiResponse = createTestGeminiEdgeFunctionResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiResponse,
    });

    await searchMaterialsWithAi({ query: 'テスト' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer user-jwt-from-auth');
  });

  it('retries auth when getAccessToken returns null initially', async () => {
    mockGetAccessToken
      .mockResolvedValueOnce(null)         // first call returns null
      .mockResolvedValueOnce('retry-jwt'); // after initializeAuth, succeeds
    const apiResponse = createTestGeminiEdgeFunctionResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiResponse,
    });

    await searchMaterialsWithAi({ query: 'テスト' });

    expect(mockInitializeAuth).toHaveBeenCalledTimes(1);
    expect(mockGetAccessToken).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer retry-jwt');
  });

  it('returns AUTH_ERROR when getAccessToken returns null after retry', async () => {
    mockGetAccessToken.mockResolvedValue(null);

    const result = await searchMaterialsWithAi({ query: 'テスト' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('AUTH_ERROR');
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
