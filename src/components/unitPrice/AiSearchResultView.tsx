/**
 * AiSearchResultView Component
 *
 * Displays AI search results including summary, price items,
 * recommended price range, and grounding sources.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AiSearchResponse, AiPriceItem } from '@/types/materialResearch';
import { formatCurrency } from '@/utils/currencyFormat';
import { safeOpenUrl } from '@/utils/safeOpenUrl';
import { AiPriceItemCard } from './AiPriceItemCard';

import { determineAiSearchViewState } from './aiSearchViewState';
export type { AiSearchViewState } from './aiSearchViewState';
export { determineAiSearchViewState };

export interface AiSearchResultViewProps {
  /** AI search result */
  result: AiSearchResponse | null;
  /** Whether search is loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Whether initial search has been performed */
  hasSearched: boolean;
  /** Callback when a price item is registered (single item edit flow) */
  onRegister: (item: AiPriceItem) => void;
  /** Callback to retry search */
  onRetry: () => void;
  /** Whether multi-select checkboxes are shown */
  selectable?: boolean;
  /** AI item IDs mapped by array index (for selection tracking) */
  aiItemIds?: string[];
  /** Set of selected AI item IDs */
  selectedIds?: Set<string>;
  /** Callback when selection is toggled */
  onToggleSelect?: (item: AiPriceItem, id: string) => void;
  /** Whether the floating selection bar is visible (adds bottom padding) */
  hasSelectionBar?: boolean;
  /** Test ID */
  testID?: string;
}

export const AiSearchResultView: React.FC<AiSearchResultViewProps> = ({
  result,
  isLoading,
  error,
  hasSearched,
  onRegister,
  onRetry,
  selectable = false,
  aiItemIds,
  selectedIds,
  onToggleSelect,
  hasSelectionBar = false,
  testID,
}) => {
  const handleSourcePress = useCallback((uri: string) => {
    safeOpenUrl(uri);
  }, []);

  const viewState = determineAiSearchViewState({ isLoading, error, hasSearched, result });

  if (viewState === 'loading') {
    return (
      <View style={styles.centerContainer} testID={testID}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Web検索中...</Text>
        <Text style={styles.loadingSubText}>AIが価格情報を調査しています</Text>
      </View>
    );
  }

  if (viewState === 'error') {
    return (
      <View style={styles.centerContainer} testID={testID}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>再検索</Text>
        </Pressable>
      </View>
    );
  }

  if (viewState === 'empty') {
    return (
      <View style={styles.centerContainer} testID={testID}>
        <Ionicons name="sparkles-outline" size={48} color="#C7C7CC" />
        <Text style={styles.emptyText}>
          材料名を入力してAI検索してください
        </Text>
      </View>
    );
  }

  if (viewState === 'no-results') {
    return (
      <View style={styles.centerContainer} testID={testID}>
        <Ionicons name="search-outline" size={48} color="#C7C7CC" />
        <Text style={styles.emptyText}>検索結果がありません</Text>
        {result?.summary ? (
          <Text style={styles.summaryFallback}>{result.summary}</Text>
        ) : null}
      </View>
    );
  }

  // viewState === 'results' — guard narrows result for TypeScript strict mode
  if (!result) return null;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        hasSelectionBar && styles.scrollContentWithSelectionBar,
      ]}
      testID={testID}
    >
      {/* Summary card */}
      {result.summary ? (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="sparkles" size={16} color="#8B5CF6" />
            <Text style={styles.summaryHeaderText}>AI分析</Text>
          </View>
          <Text style={styles.summaryText}>{result.summary}</Text>
          {result.recommendedPriceRange && (
            <View style={styles.priceRangeBadge}>
              <Text style={styles.priceRangeText}>
                相場: ¥{formatCurrency(result.recommendedPriceRange.min)} 〜 ¥{formatCurrency(result.recommendedPriceRange.max)}
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Price items */}
      <View style={styles.itemsSection}>
        <Text style={styles.sectionTitle}>価格比較</Text>
        {result.items.map((item, index) => {
          const itemId = aiItemIds?.[index];
          return (
            <AiPriceItemCard
              key={itemId ?? `ai-item-${index}`}
              item={item}
              onRegister={onRegister}
              selectable={selectable}
              selected={itemId ? selectedIds?.has(itemId) : false}
              onToggleSelect={
                selectable && onToggleSelect && itemId
                  ? (i) => onToggleSelect(i, itemId)
                  : undefined
              }
              testID={`ai-price-item-${index}`}
            />
          );
        })}
      </View>

      {/* Grounding sources */}
      {result.sources.length > 0 && (
        <View style={styles.sourcesSection}>
          <Text style={styles.sectionTitle}>情報ソース</Text>
          {result.sources.map((source, index) => (
            <Pressable
              key={`source-${index}`}
              style={styles.sourceItem}
              onPress={() => handleSourcePress(source.uri)}
            >
              <Ionicons name="link-outline" size={14} color="#007AFF" />
              <Text style={styles.sourceText} numberOfLines={1}>
                {source.title || source.uri}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

AiSearchResultView.displayName = 'AiSearchResultView';

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8B5CF6',
    marginTop: 16,
  },
  loadingSubText: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },
  errorText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 12,
  },
  summaryFallback: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  scrollContentWithSelectionBar: {
    paddingBottom: 70,
  },
  summaryCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  summaryHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    flex: 1,
  },
  summaryText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },
  priceRangeBadge: {
    marginTop: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  priceRangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  itemsSection: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  sourcesSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  sourceText: {
    fontSize: 13,
    color: '#007AFF',
    flex: 1,
  },
});
