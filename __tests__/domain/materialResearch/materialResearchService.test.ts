/**
 * Tests for materialResearchService
 *
 * Tests for the API service that calls the Supabase Edge Function.
 * Uses fetch mocking. Expects Result pattern (not throw).
 */

import { searchMaterials } from '@/domain/materialResearch/materialResearchService';
import { createTestRakutenResponse, createTestRakutenItem } from './helpers';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('searchMaterials', () => {
  it('returns success with empty results for empty keyword', async () => {
    const result = await searchMaterials({ keyword: '' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results).toEqual([]);
      expect(result.data.totalCount).toBe(0);
      expect(result.data.currentPage).toBe(1);
      expect(result.data.totalPages).toBe(0);
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns success with empty results for whitespace-only keyword', async () => {
    const result = await searchMaterials({ keyword: '   ' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results).toEqual([]);
    }
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls fetch with correct URL and body for valid keyword', async () => {
    const apiResponse = createTestRakutenResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiResponse,
    });

    await searchMaterials({ keyword: '塗料' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(typeof url).toBe('string');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body.keyword).toBe('塗料');
    expect(body.page).toBe(1);
    expect(body.hits).toBe(20);
  });

  it('passes custom page and hits parameters', async () => {
    const apiResponse = createTestRakutenResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiResponse,
    });

    await searchMaterials({ keyword: '塗料', page: 3, hits: 10 });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.page).toBe(3);
    expect(body.hits).toBe(10);
  });

  it('maps response items to MaterialSearchResult', async () => {
    const items = [
      createTestRakutenItem({ itemCode: 'a', itemName: 'Item A', itemPrice: 100 }),
      createTestRakutenItem({ itemCode: 'b', itemName: 'Item B', itemPrice: 200 }),
    ];
    const apiResponse = createTestRakutenResponse(items, {
      count: 50,
      page: 1,
      pageCount: 3,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => apiResponse,
    });

    const result = await searchMaterials({ keyword: '塗料' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results).toHaveLength(2);
      expect(result.data.results[0].id).toBe('a');
      expect(result.data.results[0].name).toBe('Item A');
      expect(result.data.results[1].id).toBe('b');
      expect(result.data.totalCount).toBe(50);
      expect(result.data.currentPage).toBe(1);
      expect(result.data.totalPages).toBe(3);
    }
  });

  it('returns RATE_LIMIT error on 429 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    const result = await searchMaterials({ keyword: '塗料' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('RATE_LIMIT');
      expect(result.error.message).toBe(
        '検索回数の制限に達しました。しばらくお待ちください。'
      );
    }
  });

  it('returns API_ERROR on non-429 error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const result = await searchMaterials({ keyword: '塗料' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('API_ERROR');
      expect(result.error.message).toBe(
        '検索に失敗しました。通信状況を確認してください。'
      );
    }
  });

  it('returns NETWORK_ERROR on fetch rejection', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await searchMaterials({ keyword: '塗料' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('NETWORK_ERROR');
      expect(result.error.message).toBe(
        '検索に失敗しました。通信状況を確認してください。'
      );
    }
  });
});
