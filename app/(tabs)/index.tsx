/**
 * Document List Screen
 *
 * Main screen showing all documents (estimates and invoices) with:
 * - FlashList for high-performance scrolling
 * - Search and filter functionality
 * - Swipe-to-delete
 * - Create new document flow
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
  Modal,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { DocumentWithTotals, DocumentType, DocumentStatus } from '../../src/types';
import { useDocumentFilter } from '../../src/hooks/useDocumentFilter';
import { useDocumentList } from '../../src/hooks/useDocumentList';
import { useReadOnlyMode } from '../../src/hooks/useReadOnlyMode';
import {
  DocumentListItem,
  EmptyDocumentList,
} from '../../src/components/document';
import {
  SearchBar,
  FilterChipGroup,
  ConfirmDialog,
  type FilterOption,
} from '../../src/components/common';

// Filter options for document type
const TYPE_OPTIONS: FilterOption<DocumentType | 'all'>[] = [
  { value: 'all', label: 'すべて' },
  { value: 'estimate', label: '見積書' },
  { value: 'invoice', label: '請求書' },
];

// Filter options for document status
const STATUS_OPTIONS: FilterOption<DocumentStatus | 'all'>[] = [
  { value: 'all', label: 'すべて' },
  { value: 'draft', label: '下書き' },
  { value: 'sent', label: '送付済' },
  { value: 'paid', label: '入金済' },
];

/**
 * Delete confirmation state
 */
interface DeleteConfirmState {
  id: string;
  clientName: string;
}

/**
 * Main document list screen
 */
export default function DocumentListScreen() {
  // Filter state (separated domain filter and UI metadata)
  const {
    filterState,
    filter,
    isFiltered,
    setSearchText,
    setTypeFilter,
    setStatusFilter,
  } = useDocumentFilter();

  // Document list state (pass only domain filter, no UI metadata)
  const { documents, isLoading, error, refresh, deleteDocument } =
    useDocumentList(filter);

  // Read-only mode state
  const { isReadOnlyMode } = useReadOnlyMode();

  // Delete confirmation dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(
    null
  );

  // Android type selection modal state
  const [showTypeModal, setShowTypeModal] = useState(false);

  // Handle document press
  const handleDocumentPress = useCallback((id: string) => {
    router.push(`/document/${id}`);
  }, []);

  // Handle delete trigger (from swipe)
  const handleDeleteTrigger = useCallback((id: string, clientName: string) => {
    setDeleteConfirm({ id, clientName });
  }, []);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (deleteConfirm) {
      await deleteDocument(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, deleteDocument]);

  // Handle delete cancel
  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  // Handle create new document
  const handleCreatePress = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['キャンセル', '見積書を作成', '請求書を作成'],
          cancelButtonIndex: 0,
          title: '新規作成',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            router.push('/document/new?type=estimate');
          } else if (buttonIndex === 2) {
            router.push('/document/new?type=invoice');
          }
        }
      );
    } else {
      setShowTypeModal(true);
    }
  }, []);

  // Handle type selection (Android)
  const handleTypeSelect = useCallback((type: DocumentType) => {
    setShowTypeModal(false);
    router.push(`/document/new?type=${type}`);
  }, []);

  // Render list item
  const renderItem = useCallback(
    ({ item }: { item: DocumentWithTotals }) => (
      <DocumentListItem
        document={item}
        onPress={handleDocumentPress}
        onDelete={handleDeleteTrigger}
        disableDelete={isReadOnlyMode}
      />
    ),
    [handleDocumentPress, handleDeleteTrigger, isReadOnlyMode]
  );

  // Render empty state
  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <EmptyDocumentList
        isFiltered={isFiltered}
        onCreatePress={isReadOnlyMode ? undefined : handleCreatePress}
      />
    );
  }, [isLoading, isFiltered, handleCreatePress, isReadOnlyMode]);

  // Render header with search and filters
  const renderHeader = () => (
    <View style={styles.header}>
      <SearchBar
        value={filterState.searchText}
        onChangeText={setSearchText}
        placeholder="書類を検索..."
      />
      <View style={styles.filterContainer}>
        <FilterChipGroup
          options={TYPE_OPTIONS}
          selectedValue={filterState.type}
          onSelect={setTypeFilter}
          testID="type-filter"
        />
        <FilterChipGroup
          options={STATUS_OPTIONS}
          selectedValue={filterState.status}
          onSelect={setStatusFilter}
          testID="status-filter"
        />
      </View>
    </View>
  );

  // Show error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>再読み込み</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {renderHeader()}

      {isLoading && documents.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlashList
          data={documents}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          onRefresh={refresh}
          refreshing={isLoading}
          drawDistance={250}
          estimatedItemSize={88}
        />
      )}

      {/* FAB for creating new document */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && !isReadOnlyMode && styles.fabPressed,
          isReadOnlyMode && styles.fabDisabled,
        ]}
        onPress={handleCreatePress}
        disabled={isReadOnlyMode}
        accessibilityLabel={isReadOnlyMode ? '読み取り専用モード中は作成できません' : '新規作成'}
        accessibilityRole="button"
        accessibilityState={{ disabled: isReadOnlyMode }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        visible={deleteConfirm !== null}
        title="書類を削除"
        message={`「${deleteConfirm?.clientName ?? ''}」の書類を削除しますか？\nこの操作は取り消せません。`}
        confirmText="削除"
        cancelText="キャンセル"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {/* Android type selection modal */}
      <Modal
        visible={showTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTypeModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTypeModal(false)}
        >
          <View style={styles.typeModal}>
            <Text style={styles.typeModalTitle}>新規作成</Text>
            <Pressable
              style={styles.typeOption}
              onPress={() => handleTypeSelect('estimate')}
            >
              <Ionicons name="document-text-outline" size={24} color="#007AFF" />
              <Text style={styles.typeOptionText}>見積書を作成</Text>
            </Pressable>
            <Pressable
              style={styles.typeOption}
              onPress={() => handleTypeSelect('invoice')}
            >
              <Ionicons name="receipt-outline" size={24} color="#FF9500" />
              <Text style={styles.typeOptionText}>請求書を作成</Text>
            </Pressable>
            <Pressable
              style={styles.cancelOption}
              onPress={() => setShowTypeModal(false)}
            >
              <Text style={styles.cancelOptionText}>キャンセル</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  filterContainer: {
    marginTop: 12,
  },
  listContent: {
    paddingBottom: 100, // Space for FAB
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  fabDisabled: {
    backgroundColor: '#999',
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  typeModal: {
    backgroundColor: '#fff',
    borderRadius: 14,
    width: '100%',
    maxWidth: 320,
    padding: 20,
  },
  typeModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    color: '#000',
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    marginBottom: 12,
    gap: 12,
  },
  typeOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  cancelOption: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelOptionText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});
