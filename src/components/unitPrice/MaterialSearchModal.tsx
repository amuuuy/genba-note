/**
 * MaterialSearchModal Component
 *
 * Full-screen modal for searching material prices.
 * Supports two search modes via tab switching:
 * - Rakuten Search: Product listings from Rakuten Ichiba API
 * - AI Price Research: Web-wide price research via Gemini + Google Search
 *
 * Features:
 * - mode='unitPrice': Register results to unit price master (with edit-before-register)
 * - mode='lineItem': Add results as document line items (with edit-before-add)
 * - Multi-select with bulk add via checkboxes and floating action bar
 */

import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { UnitPriceInput } from '@/domain/unitPrice';
import type { LineItemInput } from '@/domain/lineItem/lineItemService';
import type { MaterialSearchResult, AiPriceItem, SearchSource } from '@/types/materialResearch';
import { searchResultToUnitPriceInput } from '@/domain/materialResearch/rakutenMappingService';
import { aiPriceItemToUnitPriceInput } from '@/domain/materialResearch/geminiMappingService';
import {
  searchResultToLineItemInput,
  aiPriceItemToLineItemInput,
} from '@/domain/materialResearch/lineItemMappingService';
import { useMaterialSearch } from '@/hooks/useMaterialSearch';
import { useAiPriceSearch } from '@/hooks/useAiPriceSearch';
import { useMultiSelect } from '@/hooks/useMultiSelect';
import { useProStatus } from '@/hooks/useProStatus';
import { useDailySearchUsage } from '@/hooks/useDailySearchUsage';
import { FREE_AI_SEARCH_DAILY_LIMIT, FREE_RAKUTEN_SEARCH_DAILY_LIMIT } from '@/subscription/freeTierLimitsService';
import { generateUUID } from '@/utils/uuid';
import { MaterialSearchResultItem } from './MaterialSearchResultItem';
import { AiSearchResultView } from './AiSearchResultView';
import { UnitPriceEditorModal } from './UnitPriceEditorModal';
import { LineItemEditorModal } from '../document/edit/LineItemEditorModal';
import { createGuardedAiSearch, createGuardedRakutenSearch } from './materialSearchLimitUtils';

export type MaterialSearchMode = 'unitPrice' | 'lineItem';

interface MaterialSearchModalBaseProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Test ID */
  testID?: string;
}

interface MaterialSearchModalUnitPriceProps extends MaterialSearchModalBaseProps {
  /** Mode: 'unitPrice' for unit price master (default) */
  mode?: 'unitPrice';
  /** Callback when a single unit price is registered (after edit) */
  onRegister?: (input: UnitPriceInput) => void;
  /** Callback for bulk unit price registration */
  onBulkRegister?: (inputs: UnitPriceInput[]) => void;
  /** Not available in unitPrice mode */
  onAddLineItems?: never;
}

interface MaterialSearchModalLineItemProps extends MaterialSearchModalBaseProps {
  /** Mode: 'lineItem' for document line items */
  mode: 'lineItem';
  /** Callback for adding line items (single or bulk) */
  onAddLineItems?: (inputs: LineItemInput[]) => void;
  /** Not available in lineItem mode */
  onRegister?: never;
  /** Not available in lineItem mode */
  onBulkRegister?: never;
}

export type MaterialSearchModalProps =
  | MaterialSearchModalUnitPriceProps
  | MaterialSearchModalLineItemProps;

/**
 * Material search modal for price research
 */
export const MaterialSearchModal: React.FC<MaterialSearchModalProps> = ({
  visible,
  mode = 'unitPrice',
  onRegister,
  onBulkRegister,
  onAddLineItems,
  onClose,
  testID,
}) => {
  const [activeTab, setActiveTab] = useState<SearchSource>('rakuten');
  const [query, setQuery] = useState('');
  const [hasAiSearched, setHasAiSearched] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const guardedAiSearchRef = useRef(createGuardedAiSearch());
  const guardedRakutenSearchRef = useRef(createGuardedRakutenSearch());

  // Rakuten search hook
  const rakuten = useMaterialSearch();

  // AI search hook
  const ai = useAiPriceSearch();

  // Pro status and daily usage for free tier limits
  const { isPro, isLoading: isProLoading } = useProStatus();
  const dailyUsage = useDailySearchUsage(visible);
  // Show remaining only when both Pro status and daily usage are loaded
  const limitsReady = !isProLoading && dailyUsage.isLoaded;
  const aiRemaining = isPro ? Infinity : Math.max(0, FREE_AI_SEARCH_DAILY_LIMIT - dailyUsage.aiSearchCount);
  const rakutenRemaining = isPro ? Infinity : Math.max(0, FREE_RAKUTEN_SEARCH_DAILY_LIMIT - dailyUsage.rakutenSearchCount);

  // Multi-select
  const selection = useMultiSelect();

  // Stable IDs for AI items (since AiPriceItem has no id field)
  const [aiItemIds, setAiItemIds] = useState<string[]>([]);

  // Assign UUIDs to AI items when results change
  useEffect(() => {
    if (ai.result?.items) {
      setAiItemIds(ai.result.items.map(() => generateUUID()));
    } else {
      setAiItemIds([]);
    }
  }, [ai.result]);

  // AI items lookup map: id -> AiPriceItem
  const aiItemMap = useMemo(() => {
    const map = new Map<string, AiPriceItem>();
    if (ai.result?.items) {
      ai.result.items.forEach((item, index) => {
        const id = aiItemIds[index];
        if (id) map.set(id, item);
      });
    }
    return map;
  }, [ai.result, aiItemIds]);

  // Edit-before-register state (unitPrice mode)
  const [editingUnitPriceInput, setEditingUnitPriceInput] = useState<UnitPriceInput | null>(null);

  // Edit-before-add state (lineItem mode)
  const [editingLineItemInput, setEditingLineItemInput] = useState<LineItemInput | null>(null);

  const isLoading = activeTab === 'rakuten' ? rakuten.isLoading : ai.isLoading;

  const handleClose = useCallback(() => {
    rakuten.clear();
    ai.clear();
    setQuery('');
    setActiveTab('rakuten');
    setHasAiSearched(false);
    selection.clear();
    setAiItemIds([]);
    setEditingUnitPriceInput(null);
    setEditingLineItemInput(null);
    onClose();
  }, [rakuten, ai, selection, onClose]);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || isLoading) return;

    selection.clear();

    if (activeTab === 'rakuten') {
      await guardedRakutenSearchRef.current.execute({
        isProLoading,
        isPro,
        reload: dailyUsage.reload,
        search: () => rakuten.search(query),
        incrementRakuten: dailyUsage.incrementRakuten,
        onBlocked: (limit) => {
          Alert.alert(
            '楽天検索の上限に達しました',
            `無料プランでは1日${limit}回まで楽天検索できます。\nProプランにアップグレードすると無制限に利用できます。`,
            [
              { text: 'キャンセル', style: 'cancel' },
              { text: 'Proプランを見る', onPress: () => router.push('/paywall') },
            ]
          );
        },
      });
    } else {
      const result = await guardedAiSearchRef.current.execute({
        isProLoading,
        isPro,
        reload: dailyUsage.reload,
        search: () => ai.search(query),
        incrementAi: dailyUsage.incrementAi,
        onBlocked: (limit) => {
          Alert.alert(
            'AI検索の上限に達しました',
            `無料プランでは1日${limit}回までAI検索できます。\nProプランにアップグレードすると無制限に利用できます。`,
            [
              { text: 'キャンセル', style: 'cancel' },
              { text: 'Proプランを見る', onPress: () => router.push('/paywall') },
            ]
          );
        },
      });
      if (result.outcome === 'searched') {
        setHasAiSearched(true);
      }
    }
  }, [query, activeTab, isLoading, rakuten, ai, selection, dailyUsage, isPro, isProLoading]);

  // --- Single item register (opens editor) ---

  const handleRakutenRegister = useCallback(
    (result: MaterialSearchResult) => {
      if (mode === 'unitPrice') {
        const input = searchResultToUnitPriceInput(result);
        setEditingUnitPriceInput(input);
      } else {
        const input = searchResultToLineItemInput(result);
        setEditingLineItemInput(input);
      }
    },
    [mode]
  );

  const handleAiRegister = useCallback(
    (item: AiPriceItem) => {
      if (mode === 'unitPrice') {
        const input = aiPriceItemToUnitPriceInput(item);
        setEditingUnitPriceInput(input);
      } else {
        const input = aiPriceItemToLineItemInput(item);
        setEditingLineItemInput(input);
      }
    },
    [mode]
  );

  // --- Editor save callbacks ---

  const handleUnitPriceEditorSave = useCallback(
    (input: UnitPriceInput) => {
      setEditingUnitPriceInput(null);
      onRegister?.(input);
    },
    [onRegister]
  );

  const handleLineItemEditorSave = useCallback(
    (input: LineItemInput) => {
      setEditingLineItemInput(null);
      onAddLineItems?.([input]);
    },
    [onAddLineItems]
  );

  const handleEditorCancel = useCallback(() => {
    setEditingUnitPriceInput(null);
    setEditingLineItemInput(null);
  }, []);

  // --- Multi-select toggle ---

  const handleRakutenToggleSelect = useCallback(
    (result: MaterialSearchResult) => {
      selection.toggle(result.id);
    },
    [selection]
  );

  const handleAiToggleSelect = useCallback(
    (_item: AiPriceItem, id: string) => {
      selection.toggle(id);
    },
    [selection]
  );

  // --- Bulk add ---

  const handleBulkAdd = useCallback(() => {
    if (selection.selectedCount === 0) return;

    if (mode === 'unitPrice') {
      const inputs: UnitPriceInput[] = [];

      // Collect selected Rakuten items
      for (const result of rakuten.results) {
        if (selection.isSelected(result.id)) {
          inputs.push(searchResultToUnitPriceInput(result));
        }
      }

      // Collect selected AI items
      for (const [id, item] of aiItemMap) {
        if (selection.isSelected(id)) {
          inputs.push(aiPriceItemToUnitPriceInput(item));
        }
      }

      if (inputs.length > 0) {
        onBulkRegister?.(inputs);
      }
    } else {
      const inputs: LineItemInput[] = [];

      for (const result of rakuten.results) {
        if (selection.isSelected(result.id)) {
          inputs.push(searchResultToLineItemInput(result));
        }
      }

      for (const [id, item] of aiItemMap) {
        if (selection.isSelected(id)) {
          inputs.push(aiPriceItemToLineItemInput(item));
        }
      }

      if (inputs.length > 0) {
        onAddLineItems?.(inputs);
      }
    }

    selection.clear();
  }, [mode, selection, rakuten.results, aiItemMap, onBulkRegister, onAddLineItems]);

  // --- Tab change ---

  const handleTabChange = useCallback((tab: SearchSource) => {
    setActiveTab(tab);
    selection.clear();
  }, [selection]);

  const handleSubmitEditing = useCallback(() => {
    handleSearch();
  }, [handleSearch]);

  // --- Rakuten list rendering ---

  const renderRakutenItem = useCallback(
    ({ item }: { item: MaterialSearchResult }) => (
      <MaterialSearchResultItem
        result={item}
        onRegister={handleRakutenRegister}
        selectable
        selected={selection.isSelected(item.id)}
        onToggleSelect={handleRakutenToggleSelect}
        testID={`search-result-${item.id}`}
      />
    ),
    [handleRakutenRegister, selection, handleRakutenToggleSelect]
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
            {limitsReady && !isPro && (
              <View style={[
                styles.remainingBadge,
                rakutenRemaining === 0 && styles.remainingBadgeExhausted,
              ]}>
                <Text style={[
                  styles.remainingBadgeText,
                  rakutenRemaining === 0 && styles.remainingBadgeTextExhausted,
                ]}>
                  {rakutenRemaining}/{FREE_RAKUTEN_SEARCH_DAILY_LIMIT}
                </Text>
              </View>
            )}
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
            {limitsReady && !isPro && (
              <View style={[
                styles.remainingBadge,
                aiRemaining === 0 && styles.remainingBadgeExhausted,
              ]}>
                <Text style={[
                  styles.remainingBadgeText,
                  aiRemaining === 0 && styles.remainingBadgeTextExhausted,
                ]}>
                  {aiRemaining}/{FREE_AI_SEARCH_DAILY_LIMIT}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

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
            contentContainerStyle={[
              styles.listContent,
              selection.selectedCount > 0 && styles.listContentWithSelectionBar,
            ]}
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
            selectable
            aiItemIds={aiItemIds}
            selectedIds={selection.selectedIds}
            onToggleSelect={handleAiToggleSelect}
            hasSelectionBar={selection.selectedCount > 0}
            testID="ai-search-results"
          />
        )}

        {/* Selection bar (shown when items are selected) */}
        {selection.selectedCount > 0 && (
          <View style={styles.selectionBar}>
            <Text style={styles.selectionCount}>
              {selection.selectedCount}件選択中
            </Text>
            <View style={styles.selectionActions}>
              <Pressable
                style={styles.selectionClearButton}
                onPress={selection.clear}
                accessibilityLabel="選択を解除"
                accessibilityRole="button"
              >
                <Text style={styles.selectionClearText}>解除</Text>
              </Pressable>
              <Pressable
                style={styles.bulkAddButton}
                onPress={handleBulkAdd}
                accessibilityLabel={`${selection.selectedCount}件追加`}
                accessibilityRole="button"
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.bulkAddText}>
                  {selection.selectedCount}件追加
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* UnitPrice editor modal (unitPrice mode, single item edit) */}
      {mode === 'unitPrice' && (
        <UnitPriceEditorModal
          visible={editingUnitPriceInput !== null}
          unitPrice={null}
          initialInput={editingUnitPriceInput}
          onSave={handleUnitPriceEditorSave}
          onCancel={handleEditorCancel}
          testID="research-unit-price-editor"
        />
      )}

      {/* LineItem editor modal (lineItem mode, single item edit) */}
      {mode === 'lineItem' && (
        <LineItemEditorModal
          visible={editingLineItemInput !== null}
          lineItem={null}
          initialInput={editingLineItemInput}
          onSave={handleLineItemEditorSave}
          onCancel={handleEditorCancel}
          testID="research-line-item-editor"
        />
      )}
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
  listContentWithSelectionBar: {
    paddingBottom: 70,
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
  // Selection bar
  selectionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  selectionCount: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionClearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  selectionClearText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  bulkAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  bulkAddText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // Remaining count badge on AI tab
  remainingBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 4,
  },
  remainingBadgeExhausted: {
    backgroundColor: '#FFEBEE',
  },
  remainingBadgeText: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '500',
  },
  remainingBadgeTextExhausted: {
    color: '#FF3B30',
  },
});
