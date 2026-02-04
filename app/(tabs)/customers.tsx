/**
 * Customer List Screen
 *
 * Screen for managing customer master data:
 * - FlatList for list rendering
 * - Search functionality
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
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Customer } from '../../src/types/customer';
import { useCustomerList } from '../../src/hooks/useCustomerList';
import { useReadOnlyMode } from '../../src/hooks/useReadOnlyMode';
import {
  EmptyCustomerList,
  CustomerListItem,
} from '../../src/components/customer';
import {
  SearchBar,
  ConfirmDialog,
} from '../../src/components/common';

/**
 * Main customer list screen
 */
export default function CustomersScreen() {
  // Customer list state
  const {
    customers,
    isLoading,
    error,
    searchText,
    setSearchText,
    refresh,
    deleteItem,
  } = useCustomerList();

  // Read-only mode state
  const { isReadOnlyMode } = useReadOnlyMode();

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Determine if list is filtered
  const isFiltered = Boolean(searchText);

  // Handle create button press
  const handleCreatePress = useCallback(() => {
    router.push('/customer/new' as Href);
  }, []);

  // Handle item press (edit)
  const handleItemPress = useCallback((id: string) => {
    router.push(`/customer/${id}` as Href);
  }, []);

  // Handle delete trigger
  const handleDeletePress = useCallback((id: string, name: string) => {
    setDeleteConfirm({ id, name });
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

  // Render list item
  const renderItem = useCallback(
    ({ item }: { item: Customer }) => (
      <CustomerListItem
        customer={item}
        onPress={handleItemPress}
        onDelete={isReadOnlyMode ? undefined : handleDeletePress}
        testID={`customer-item-${item.id}`}
      />
    ),
    [handleItemPress, handleDeletePress, isReadOnlyMode]
  );

  // Render empty state
  const renderEmpty = useCallback(() => (
    <EmptyCustomerList
      isFiltered={isFiltered}
      onCreatePress={isReadOnlyMode ? undefined : handleCreatePress}
      testID="empty-customer-list"
    />
  ), [isFiltered, isReadOnlyMode, handleCreatePress]);

  // Render header with search
  const renderHeader = useCallback(() => (
    <View style={styles.header}>
      <SearchBar
        value={searchText}
        onChangeText={setSearchText}
        placeholder="顧客名・住所で検索..."
      />
    </View>
  ), [searchText, setSearchText]);

  // Show error state
  if (error && customers.length === 0) {
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

      {isLoading && customers.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={customers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          onRefresh={refresh}
          refreshing={isLoading}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB for creating new customer */}
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
        title="顧客を削除"
        message={`「${deleteConfirm?.name ?? ''}」を削除しますか？\nこの操作は取り消せません。\n※関連する写真も削除されます。`}
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
