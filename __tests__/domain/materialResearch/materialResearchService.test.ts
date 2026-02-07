/**
 * Tests for materialResearchService
 *
 * Tests for the API service that calls the Supabase Edge Function.
 * Uses fetch mocking.
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
  it('returns empty results for empty keyword', async () => {
    const result = await searchMaterials({ keyword: '' });

    expect(result.results).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns empty results for whitespace-only keyword', async () => {
    const result = await searchMaterials({ keyword: '   ' });

    expect(result.results).toEqual([]);
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

    expect(result.results).toHaveLength(2);
    expect(result.results[0].id).toBe('a');
    expect(result.results[0].name).toBe('Item A');
    expect(result.results[1].id).toBe('b');
    expect(result.totalCount).toBe(50);
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(3);
  });

  it('throws rate limit error on 429 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    });

    await expect(searchMaterials({ keyword: '塗料' })).rejects.toThrow(
      '検索回数の制限に達しました。しばらくお待ちください。'
    );
  });

  it('throws generic error on non-429 error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(searchMaterials({ keyword: '塗料' })).rejects.toThrow(
      '検索に失敗しました。通信状況を確認してください。'
    );
  });

  it('throws network error on fetch rejection', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(searchMaterials({ keyword: '塗料' })).rejects.toThrow(
      '検索に失敗しました。通信状況を確認してください。'
    );
  });
});
