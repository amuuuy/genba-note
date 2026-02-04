/**
 * Unit Price List Screen
 *
 * Screen for managing unit price master data:
 * - FlatList for list rendering
 * - Search and category filter
 * - Create/Edit/Delete operations
 * - FAB for quick creation
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UnitPrice } from '../../src/types/unitPrice';
import type { UnitPriceInput } from '../../src/domain/unitPrice';
import { useUnitPriceList } from '../../src/hooks/useUnitPriceList';
import { useReadOnlyMode } from '../../src/hooks/useReadOnlyMode';
import {
  EmptyUnitPriceList,
  UnitPriceListItem,
  UnitPriceEditorModal,
} from '../../src/components/unitPrice';
import {
  SearchBar,
  FilterChipGroup,
  ConfirmDialog,
  type FilterOption,
} from '../../src/components/common';

/**
 * Main unit price list screen
 */
export default function UnitPricesScreen() {
  // Unit price list state
  const {
    unitPrices,
    isLoading,
    error,
    searchText,
    categories,
    selectedCategory,
    setSearchText,
    setCategory,
    refresh,
    createItem,
    updateItem,
    deleteItem,
  } = useUnitPriceList();

  // Read-only mode state
  const { isReadOnlyMode } = useReadOnlyMode();

  // Editor modal state
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingUnitPrice, setEditingUnitPrice] = useState<UnitPrice | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Determine if list is filtered
  const isFiltered = Boolean(searchText || selectedCategory);

  // Handle create button press
  const handleCreatePress = useCallback(() => {
    setEditingUnitPrice(null);
    setEditorVisible(true);
  }, []);

  // Handle item press (edit)
  const handleItemPress = useCallback((unitPrice: UnitPrice) => {
    setEditingUnitPrice(unitPrice);
    setEditorVisible(true);
  }, []);

  // Handle delete trigger
  const handleDeletePress = useCallback((unitPrice: UnitPrice) => {
    setDeleteConfirm({ id: unitPrice.id, name: unitPrice.name });
  }, []);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm) return;

    const success = await deleteItem(deleteConfirm.id);
    if (!success) {
      Alert.alert('エラー', '削除に失敗しました');
    }
    setDeleteConfirm(null);
  }, [deleteConfirm, deleteItem]);

  // Handle delete cancel
  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  // Handle editor save
  const handleEditorSave = useCallback(async (input: UnitPriceInput) => {
    let success: boolean;
    if (editingUnitPrice) {
      // Update existing
      success = await updateItem(editingUnitPrice.id, input);
    } else {
      // Create new
      success = await createItem(input);
    }

    if (success) {
      setEditorVisible(false);
      setEditingUnitPrice(null);
    } else {
      Alert.alert('エラー', '保存に失敗しました');
    }
  }, [editingUnitPrice, createItem, updateItem]);

  // Handle editor cancel
  const handleEditorCancel = useCallback(() => {
    setEditorVisible(false);
    setEditingUnitPrice(null);
  }, []);

  // Build category filter options
  const categoryOptions: FilterOption<string>[] = [
    { value: '', label: 'すべて' },
    ...categories.map((cat) => ({ value: cat, label: cat })),
  ];

  // Render list item
  const renderItem = useCallback(
    ({ item }: { item: UnitPrice }) => (
      <UnitPriceListItem
        unitPrice={item}
        onPress={() => handleItemPress(item)}
        onDelete={isReadOnlyMode ? undefined : () => handleDeletePress(item)}
        testID={`unit-price-item-${item.id}`}
      />
    ),
    [handleItemPress, handleDeletePress, isReadOnlyMode]
  );

  // Render empty state
  const renderEmpty = useCallback(() => (
    <EmptyUnitPriceList
      isFiltered={isFiltered}
      onCreatePress={isReadOnlyMode ? undefined : handleCreatePress}
      testID="empty-unit-price-list"
    />
  ), [isFiltered, isReadOnlyMode, handleCreatePress]);

  // Render header with search and filters
  const renderHeader = useCallback(() => (
    <View style={styles.header}>
      <SearchBar
        value={searchText}
        onChangeText={setSearchText}
        placeholder="品名で検索..."
      />
      {categories.length > 0 && (
        <View style={styles.filterContainer}>
          <FilterChipGroup
            options={categoryOptions}
            selectedValue={selectedCategory ?? ''}
            onSelect={(value) => setCategory(value || null)}
          />
        </View>
      )}
    </View>
  ), [searchText, setSearchText, categories, categoryOptions, selectedCategory, setCategory]);

  // Show error state
  if (error && unitPrices.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Ionicons name="refresh" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}

      {isLoading && unitPrices.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={unitPrices}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          onRefresh={refresh}
          refreshing={isLoading}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB for creating new unit price */}
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

      {/* Editor modal */}
      <UnitPriceEditorModal
        visible={editorVisible}
        unitPrice={editingUnitPrice}
        onSave={handleEditorSave}
        onCancel={handleEditorCancel}
        testID="unit-price-editor-modal"
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        visible={deleteConfirm !== null}
        title="単価を削除"
        message={`「${deleteConfirm?.name ?? ''}」を削除しますか？\nこの操作は取り消せません。`}
        confirmText="削除"
        cancelText="キャンセル"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
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
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
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
});
