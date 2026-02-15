/**
 * Tests for geminiSearchService
 *
 * Tests for the API service that calls the gemini-search Edge Function.
 * Uses fetch mocking. Expects Result pattern (not throw).
 */

import { searchMaterialsWithAi } from '@/domain/materialResearch/geminiSearchService';
import { createTestGeminiEdgeFunctionResponse } from './helpers';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('searchMaterialsWithAi', () => {
  it('returns success with empty result for empty query', async () => {
    const result = await searchMaterialsWithAi({ query: '' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toEqual([]);
      expect(result.data.summary).toBe('');
      expect(result.data.model).toBe('FLASH');
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
    expect(body.model).toBe('FLASH');
  });

  it('passes PRO model parameter to Edge Function', async () => {
    const apiResponse = createTestGeminiEdgeFunctionResponse({ model: 'PRO' });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiResponse,
    });

    await searchMaterialsWithAi({ query: 'コンパネ', model: 'PRO' });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe('PRO');
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
      expect(result.data.model).toBe('FLASH');
    }
  });

  it('returns RATE_LIMIT error on 429 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    const result = await searchMaterialsWithAi({ query: 'コンパネ' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('RATE_LIMIT');
      expect(result.error.message).toBe(
        'AI検索の利用回数制限に達しました。しばらくお待ちください。'
      );
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
});
