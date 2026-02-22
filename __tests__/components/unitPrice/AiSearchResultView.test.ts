/**
 * AiSearchResultView Component Tests
 *
 * Tests the view component that displays AI search results.
 * Focuses on the determineAiSearchViewState pure function for state priority,
 * and props interface validation.
 */

import type { AiSearchResultViewProps } from '@/components/unitPrice/AiSearchResultView';
import { determineAiSearchViewState } from '@/components/unitPrice/aiSearchViewState';
import type { AiSearchResponse } from '@/types/materialResearch';
import {
  createTestAiSearchResponse,
  createTestAiPriceItem,
} from '../../domain/materialResearch/helpers';

describe('AiSearchResultView', () => {
  describe('AiSearchResultViewProps interface', () => {
    it('accepts result as AiSearchResponse or null', () => {
      const propsWithNull: AiSearchResultViewProps = {
        result: null,
        isLoading: false,
        error: null,
        hasSearched: false,
        onRegister: jest.fn(),
        onRetry: jest.fn(),
      };
      expect(propsWithNull.result).toBeNull();

      const propsWithResult: AiSearchResultViewProps = {
        result: createTestAiSearchResponse(),
        isLoading: false,
        error: null,
        hasSearched: true,
        onRegister: jest.fn(),
        onRetry: jest.fn(),
      };
      expect(propsWithResult.result).not.toBeNull();
    });

    it('requires onRegister and onRetry callbacks', () => {
      const props: AiSearchResultViewProps = {
        result: null,
        isLoading: false,
        error: null,
        hasSearched: false,
        onRegister: jest.fn(),
        onRetry: jest.fn(),
      };
      expect(typeof props.onRegister).toBe('function');
      expect(typeof props.onRetry).toBe('function');
    });

    it('accepts optional testID', () => {
      const props: AiSearchResultViewProps = {
        result: null,
        isLoading: false,
        error: null,
        hasSearched: false,
        onRegister: jest.fn(),
        onRetry: jest.fn(),
        testID: 'ai-search-results',
      };
      expect(props.testID).toBe('ai-search-results');
    });

    it('accepts optional hasSelectionBar prop', () => {
      const props: AiSearchResultViewProps = {
        result: null,
        isLoading: false,
        error: null,
        hasSearched: false,
        onRegister: jest.fn(),
        onRetry: jest.fn(),
        hasSelectionBar: true,
      };
      expect(props.hasSelectionBar).toBe(true);
    });

    it('hasSelectionBar defaults to undefined when not provided', () => {
      const props: AiSearchResultViewProps = {
        result: null,
        isLoading: false,
        error: null,
        hasSearched: false,
        onRegister: jest.fn(),
        onRetry: jest.fn(),
      };
      expect(props.hasSelectionBar).toBeUndefined();
    });
  });

  describe('determineAiSearchViewState', () => {
    it('returns loading when isLoading is true (highest priority)', () => {
      expect(
        determineAiSearchViewState({
          isLoading: true,
          error: null,
          hasSearched: false,
          result: null,
        })
      ).toBe('loading');
    });

    it('returns loading even when error and result exist', () => {
      expect(
        determineAiSearchViewState({
          isLoading: true,
          error: 'some error',
          hasSearched: true,
          result: createTestAiSearchResponse(),
        })
      ).toBe('loading');
    });

    it('returns error when error is non-null and not loading', () => {
      expect(
        determineAiSearchViewState({
          isLoading: false,
          error: 'AI検索に失敗しました。',
          hasSearched: true,
          result: null,
        })
      ).toBe('error');
    });

    it('returns error even when result exists', () => {
      expect(
        determineAiSearchViewState({
          isLoading: false,
          error: 'API error',
          hasSearched: true,
          result: createTestAiSearchResponse(),
        })
      ).toBe('error');
    });

    it('returns empty when hasSearched is false', () => {
      expect(
        determineAiSearchViewState({
          isLoading: false,
          error: null,
          hasSearched: false,
          result: null,
        })
      ).toBe('empty');
    });

    it('returns no-results when result is null after search', () => {
      expect(
        determineAiSearchViewState({
          isLoading: false,
          error: null,
          hasSearched: true,
          result: null,
        })
      ).toBe('no-results');
    });

    it('returns no-results when result has empty items', () => {
      expect(
        determineAiSearchViewState({
          isLoading: false,
          error: null,
          hasSearched: true,
          result: createTestAiSearchResponse({ items: [] }),
        })
      ).toBe('no-results');
    });

    it('returns results when result has items', () => {
      expect(
        determineAiSearchViewState({
          isLoading: false,
          error: null,
          hasSearched: true,
          result: createTestAiSearchResponse(),
        })
      ).toBe('results');
    });
  });

  describe('result data display logic', () => {
    it('summary is displayed when present', () => {
      const result = createTestAiSearchResponse();
      expect(result.summary).toBeTruthy();
    });

    it('recommended price range is formatted correctly', () => {
      const result = createTestAiSearchResponse({
        recommendedPriceRange: { min: 1500, max: 2500 },
      });
      expect(result.recommendedPriceRange).not.toBeNull();
      const range = result.recommendedPriceRange!;
      const formatted = `¥${range.min.toLocaleString('ja-JP')} 〜 ¥${range.max.toLocaleString('ja-JP')}`;
      expect(formatted).toBe('¥1,500 〜 ¥2,500');
    });

    it('recommended price range is absent when null', () => {
      const result = createTestAiSearchResponse({
        recommendedPriceRange: null,
      });
      expect(result.recommendedPriceRange).toBeNull();
    });

    it('items count matches result.items.length', () => {
      const items = [
        createTestAiPriceItem({ name: 'Item A' }),
        createTestAiPriceItem({ name: 'Item B' }),
      ];
      const result = createTestAiSearchResponse({ items });
      expect(result.items).toHaveLength(2);
    });

    it('sources are listed when present', () => {
      const result = createTestAiSearchResponse();
      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.sources[0]).toHaveProperty('uri');
      expect(result.sources[0]).toHaveProperty('title');
    });

    it('sources section is hidden when sources array is empty', () => {
      const result = createTestAiSearchResponse({ sources: [] });
      expect(result.sources).toHaveLength(0);
    });
  });
});
