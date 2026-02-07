/**
 * MaterialSearchModal Component
 *
 * Full-screen modal for searching material prices via Rakuten API.
 * Displays search results with one-tap registration to unit price master.
 */

import React, { useCallback } from 'react';
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
import type { MaterialSearchResult } from '@/types/materialResearch';
import { searchResultToUnitPriceInput } from '@/domain/materialResearch/rakutenMappingService';
import { useMaterialSearch } from '@/hooks/useMaterialSearch';
import { MaterialSearchResultItem } from './MaterialSearchResultItem';

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
  const {
    query,
    setQuery,
    results,
    isLoading,
    error,
    currentPage,
    totalPages,
    search,
    loadMore,
    clear,
  } = useMaterialSearch();

  const handleClose = useCallback(() => {
    clear();
    onClose();
  }, [clear, onClose]);

  const handleRegister = useCallback(
    (result: MaterialSearchResult) => {
      const input = searchResultToUnitPriceInput(result);
      onRegister(input);
    },
    [onRegister]
  );

  const handleSearch = useCallback(() => {
    search();
  }, [search]);

  const renderItem = useCallback(
    ({ item }: { item: MaterialSearchResult }) => (
      <MaterialSearchResultItem
        result={item}
        onRegister={handleRegister}
        testID={`search-result-${item.id}`}
      />
    ),
    [handleRegister]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={handleSearch}>
            <Text style={styles.retryButtonText}>再検索</Text>
          </Pressable>
        </View>
      );
    }

    if (query.trim()) {
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
  }, [isLoading, error, query, handleSearch]);

  const renderFooter = useCallback(() => {
    if (isLoading && results.length > 0) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      );
    }

    if (currentPage < totalPages && results.length > 0) {
      return (
        <Pressable style={styles.loadMoreButton} onPress={loadMore}>
          <Text style={styles.loadMoreText}>もっと見る</Text>
        </Pressable>
      );
    }

    return null;
  }, [isLoading, results.length, currentPage, totalPages, loadMore]);

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
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="材料名を入力..."
              placeholderTextColor="#C7C7CC"
              returnKeyType="search"
              onSubmitEditing={handleSearch}
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
            {isLoading && results.length === 0 ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>検索</Text>
            )}
          </Pressable>
        </View>

        {/* Disclaimer banner */}
        <View style={styles.disclaimerBanner}>
          <Ionicons name="information-circle" size={16} color="#856404" />
          <Text style={styles.disclaimerText}>
            参考価格です。実際の仕入れ価格は取引先にご確認ください
          </Text>
        </View>

        {/* Results list */}
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
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
