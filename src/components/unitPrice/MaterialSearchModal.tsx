/**
 * MaterialSearchModal Component
 *
 * Full-screen modal for searching material prices.
 * Supports two search modes via tab switching:
 * - Rakuten Search: Product listings from Rakuten Ichiba API
 * - AI Price Research: Web-wide price research via Gemini + Google Search
 */

import React, { useCallback, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UnitPriceInput } from '@/domain/unitPrice';
import type { MaterialSearchResult, AiPriceItem, SearchSource } from '@/types/materialResearch';
import { searchResultToUnitPriceInput } from '@/domain/materialResearch/rakutenMappingService';
import { aiPriceItemToUnitPriceInput } from '@/domain/materialResearch/geminiMappingService';
import { useMaterialSearch } from '@/hooks/useMaterialSearch';
import { useAiPriceSearch } from '@/hooks/useAiPriceSearch';
import { MaterialSearchResultItem } from './MaterialSearchResultItem';
import { AiSearchResultView } from './AiSearchResultView';
import { AiModelSelector } from './AiModelSelector';

export interface MaterialSearchModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when a search result is registered as unit price */
  onRegister: (input: UnitPriceInput) => void;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Test ID */
  testID?: string;
}

/**
 * Material search modal for price research
 */
export const MaterialSearchModal: React.FC<MaterialSearchModalProps> = ({
  visible,
  onRegister,
  onClose,
  testID,
}) => {
  const [activeTab, setActiveTab] = useState<SearchSource>('rakuten');
  const [query, setQuery] = useState('');
  const [hasAiSearched, setHasAiSearched] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Rakuten search hook
  const rakuten = useMaterialSearch();

  // AI search hook
  const ai = useAiPriceSearch();

  const isLoading = activeTab === 'rakuten' ? rakuten.isLoading : ai.isLoading;

  const handleClose = useCallback(() => {
    rakuten.clear();
    ai.clear();
    setQuery('');
    setActiveTab('rakuten');
    setHasAiSearched(false);
    onClose();
  }, [rakuten, ai, onClose]);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;

    if (activeTab === 'rakuten') {
      rakuten.setQuery(query);
      // Need to trigger search after setting query
      // useMaterialSearch uses its own query state, so we set it and trigger
      rakuten.setQuery(query);
      // Workaround: call search directly with the query
      setTimeout(() => rakuten.search(), 0);
    } else {
      ai.setQuery(query);
      setHasAiSearched(true);
      setTimeout(() => ai.search(), 0);
    }
  }, [query, activeTab, rakuten, ai]);

  const handleRakutenRegister = useCallback(
    (result: MaterialSearchResult) => {
      const input = searchResultToUnitPriceInput(result);
      onRegister(input);
    },
    [onRegister]
  );

  const handleAiRegister = useCallback(
    (item: AiPriceItem) => {
      const input = aiPriceItemToUnitPriceInput(item);
      onRegister(input);
    },
    [onRegister]
  );

  const handleTabChange = useCallback((tab: SearchSource) => {
    setActiveTab(tab);
  }, []);

  // Sync query to the active hook when search is triggered
  const handleSubmitEditing = useCallback(() => {
    handleSearch();
  }, [handleSearch]);

  // Rakuten-specific callbacks
  const renderRakutenItem = useCallback(
    ({ item }: { item: MaterialSearchResult }) => (
      <MaterialSearchResultItem
        result={item}
        onRegister={handleRakutenRegister}
        testID={`search-result-${item.id}`}
      />
    ),
    [handleRakutenRegister]
  );

  const renderRakutenEmpty = useCallback(() => {
    if (rakuten.isLoading) return null;

    if (rakuten.error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <Text style={styles.emptyText}>{rakuten.error}</Text>
          <Pressable style={styles.retryButton} onPress={handleSearch}>
            <Text style={styles.retryButtonText}>再検索</Text>
          </Pressable>
        </View>
      );
    }

    if (query.trim() && rakuten.results.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color="#C7C7CC" />
          <Text style={styles.emptyText}>検索結果がありません</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-circle-outline" size={48} color="#C7C7CC" />
        <Text style={styles.emptyText}>
          材料名を入力して検索してください
        </Text>
      </View>
    );
  }, [rakuten.isLoading, rakuten.error, rakuten.results.length, query, handleSearch]);

  const renderRakutenFooter = useCallback(() => {
    if (rakuten.isLoading && rakuten.results.length > 0) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      );
    }

    if (rakuten.currentPage < rakuten.totalPages && rakuten.results.length > 0) {
      return (
        <Pressable style={styles.loadMoreButton} onPress={rakuten.loadMore}>
          <Text style={styles.loadMoreText}>もっと見る</Text>
        </Pressable>
      );
    }

    return null;
  }, [rakuten.isLoading, rakuten.results.length, rakuten.currentPage, rakuten.totalPages, rakuten.loadMore]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      testID={testID}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>材料リサーチ</Text>
          <Pressable
            onPress={handleClose}
            style={styles.headerButton}
            accessibilityLabel="閉じる"
            accessibilityRole="button"
          >
            <Text style={styles.closeText}>閉じる</Text>
          </Pressable>
        </View>

        {/* Search input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputRow}>
            <Ionicons
              name="search"
              size={18}
              color="#8E8E93"
              style={styles.searchIcon}
            />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="材料名を入力..."
              placeholderTextColor="#C7C7CC"
              returnKeyType="search"
              onSubmitEditing={handleSubmitEditing}
              autoFocus
              testID="material-search-input"
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => setQuery('')}
                hitSlop={8}
                accessibilityLabel="クリア"
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color="#C7C7CC"
                />
              </Pressable>
            )}
          </View>
          <Pressable
            style={[
              styles.searchButton,
              (!query.trim() || isLoading) && styles.searchButtonDisabled,
            ]}
            onPress={handleSearch}
            disabled={!query.trim() || isLoading}
            accessibilityLabel="検索"
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>検索</Text>
            )}
          </Pressable>
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, activeTab === 'rakuten' && styles.tabActive]}
            onPress={() => handleTabChange('rakuten')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'rakuten' }}
          >
            <Ionicons
              name="cart-outline"
              size={16}
              color={activeTab === 'rakuten' ? '#007AFF' : '#8E8E93'}
            />
            <Text style={[styles.tabText, activeTab === 'rakuten' && styles.tabTextActive]}>
              楽天検索
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'ai' && styles.tabActiveAi]}
            onPress={() => handleTabChange('ai')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'ai' }}
          >
            <Ionicons
              name="sparkles"
              size={16}
              color={activeTab === 'ai' ? '#8B5CF6' : '#8E8E93'}
            />
            <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActiveAi]}>
              AI価格調査
            </Text>
          </Pressable>
        </View>

        {/* AI Model selector (only shown on AI tab) */}
        {activeTab === 'ai' && (
          <View style={styles.modelSelectorContainer}>
            <AiModelSelector
              model={ai.model}
              onChange={ai.setModel}
              disabled={ai.isLoading}
              testID="ai-model-selector"
            />
          </View>
        )}

        {/* Disclaimer banner */}
        <View style={styles.disclaimerBanner}>
          <Ionicons name="information-circle" size={16} color="#856404" />
          <Text style={styles.disclaimerText}>
            {activeTab === 'ai'
              ? 'AIによる参考価格です。実際の仕入れ価格は取引先にご確認ください'
              : '参考価格です。実際の仕入れ価格は取引先にご確認ください'}
          </Text>
        </View>

        {/* Results area */}
        {activeTab === 'rakuten' ? (
          <FlatList
            data={rakuten.results}
            renderItem={renderRakutenItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderRakutenEmpty}
            ListFooterComponent={renderRakutenFooter}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          <AiSearchResultView
            result={ai.result}
            isLoading={ai.isLoading}
            error={ai.error}
            hasSearched={hasAiSearched}
            onRegister={handleAiRegister}
            onRetry={handleSearch}
            testID="ai-search-results"
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

MaterialSearchModal.displayName = 'MaterialSearchModal';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  headerSpacer: {
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  closeText: {
    fontSize: 17,
    color: '#007AFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    gap: 10,
  },
  searchInputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 0,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabActiveAi: {
    borderBottomColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#007AFF',
  },
  tabTextActiveAi: {
    color: '#8B5CF6',
  },
  modelSelectorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#856404',
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
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
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },
});
