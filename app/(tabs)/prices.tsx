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
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { UnitPrice } from '../../src/types/unitPrice';
import type { UnitPriceInput } from '../../src/domain/unitPrice';
import { useUnitPriceList } from '../../src/hooks/useUnitPriceList';
import { useReadOnlyMode } from '../../src/hooks/useReadOnlyMode';
import { useProStatus } from '../../src/hooks/useProStatus';
import {
  EmptyUnitPriceList,
  UnitPriceListItem,
  UnitPriceEditorModal,
  MaterialSearchModal,
} from '../../src/components/unitPrice';
import {
  SearchBar,
  FilterChipGroup,
  ConfirmDialog,
  type FilterOption,
} from '../../src/components/common';
import { canCreateUnitPrice } from '../../src/subscription/freeTierLimitsService';

/**
 * Main unit price list screen
 */
export default function UnitPricesScreen() {
  // Unit price list state
  const {
    unitPrices,
    totalCount,
    isLoading,
    error,
    searchText,
    categories,
    selectedCategory,
    setSearchText,
    setCategory,
    refresh,
    createItem,
    createItems,
    updateItem,
    deleteItem,
  } = useUnitPriceList();

  // Read-only mode state
  const { isReadOnlyMode } = useReadOnlyMode();

  // Pro status
  const { isPro } = useProStatus();

  // Editor modal state
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingUnitPrice, setEditingUnitPrice] = useState<UnitPrice | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Material research modal state
  const [researchModalVisible, setResearchModalVisible] = useState(false);

  // Determine if list is filtered
  const isFiltered = Boolean(searchText || selectedCategory);

  // Handle create button press (with free tier limit check)
  const handleCreatePress = useCallback(() => {
    const check = canCreateUnitPrice(totalCount, isPro);
    if (!check.allowed) {
      Alert.alert(
        '単価マスタの上限に達しました',
        `無料プランでは${check.limit}件まで登録できます。\nProプランにアップグレードすると無制限に登録できます。`,
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: 'Proプランを見る', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }
    setEditingUnitPrice(null);
    setEditorVisible(true);
  }, [totalCount, isPro]);

  // Handle item press (edit)
  const handleItemPress = useCallback((unitPrice: UnitPrice) => {
    if (isReadOnlyMode) return;
    setEditingUnitPrice(unitPrice);
    setEditorVisible(true);
  }, [isReadOnlyMode]);

  // Handle delete trigger
  const handleDeletePress = useCallback((unitPrice: UnitPrice) => {
    setDeleteConfirm({ id: unitPrice.id, name: unitPrice.name });
  }, []);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm) return;
    setDeleteConfirm(null);
    if (isReadOnlyMode) return;

    const success = await deleteItem(deleteConfirm.id);
    if (!success) {
      Alert.alert('エラー', '削除に失敗しました');
    }
  }, [deleteConfirm, isReadOnlyMode, deleteItem]);

  // Handle delete cancel
  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  // Handle editor save
  const handleEditorSave = useCallback(async (input: UnitPriceInput) => {
    if (isReadOnlyMode) return;
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
  }, [isReadOnlyMode, editingUnitPrice, createItem, updateItem]);

  // Handle editor cancel
  const handleEditorCancel = useCallback(() => {
    setEditorVisible(false);
    setEditingUnitPrice(null);
  }, []);

  // Handle material research register (with free tier limit check)
  const handleResearchRegister = useCallback(async (input: UnitPriceInput) => {
    if (isReadOnlyMode) return;
    const check = canCreateUnitPrice(totalCount, isPro);
    if (!check.allowed) {
      Alert.alert(
        '単価マスタの上限に達しました',
        `無料プランでは${check.limit}件まで登録できます。\nProプランにアップグレードすると無制限に登録できます。`,
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: 'Proプランを見る', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }
    const success = await createItem(input);
    if (success) {
      Alert.alert('登録完了', `「${input.name}」を単価マスタに登録しました`);
    } else {
      Alert.alert('エラー', '登録に失敗しました');
    }
  }, [isReadOnlyMode, createItem, totalCount, isPro]);

  // Handle bulk register from material research (with free tier limit check)
  const handleResearchBulkRegister = useCallback(async (inputs: UnitPriceInput[]) => {
    if (isReadOnlyMode || inputs.length === 0) return;
    const check = canCreateUnitPrice(totalCount, isPro);
    if (!check.allowed) {
      Alert.alert(
        '単価マスタの上限に達しました',
        `無料プランでは${check.limit}件まで登録できます。\nProプランにアップグレードすると無制限に登録できます。`,
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: 'Proプランを見る', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }
    // Trim to remaining capacity
    const remaining = check.limit != null ? check.limit - totalCount : Infinity;
    const toRegister = inputs.slice(0, remaining);
    const successCount = await createItems(toRegister);
    if (successCount === inputs.length) {
      Alert.alert('登録完了', `${successCount}件を単価マスタに登録しました`);
    } else if (successCount > 0) {
      Alert.alert('一部登録完了', `${successCount}/${inputs.length}件を登録しました`);
    } else {
      Alert.alert('エラー', '登録に失敗しました');
    }
  }, [isReadOnlyMode, createItems, totalCount, isPro]);

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
      <View style={styles.searchRow}>
        <View style={styles.searchBarWrapper}>
          <SearchBar
            value={searchText}
            onChangeText={setSearchText}
            placeholder="品名で検索..."
          />
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.researchButton,
            pressed && !isReadOnlyMode && styles.researchButtonPressed,
            isReadOnlyMode && styles.researchButtonDisabled,
          ]}
          onPress={() => setResearchModalVisible(true)}
          disabled={isReadOnlyMode}
          accessibilityLabel="材料リサーチ"
          accessibilityRole="button"
        >
          <Ionicons name="search-circle-outline" size={18} color="#007AFF" />
          <Text style={styles.researchButtonText}>リサーチ</Text>
        </Pressable>
      </View>
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
  ), [searchText, setSearchText, isReadOnlyMode, categories, categoryOptions, selectedCategory, setCategory]);

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

      {/* Material research modal */}
      <MaterialSearchModal
        visible={researchModalVisible}
        onRegister={handleResearchRegister}
        onBulkRegister={handleResearchBulkRegister}
        onClose={() => setResearchModalVisible(false)}
        testID="material-search-modal"
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBarWrapper: {
    flex: 1,
  },
  researchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  researchButtonPressed: {
    opacity: 0.7,
  },
  researchButtonDisabled: {
    opacity: 0.4,
  },
  researchButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#007AFF',
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
