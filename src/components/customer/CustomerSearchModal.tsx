/**
 * CustomerSearchModal Component
 *
 * Modal for selecting a customer from the master data.
 * Provides search functionality.
 */

import React, { useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Customer } from '@/types/customer';
import { SearchBar } from '@/components/common';
import { useCustomerList } from '@/hooks';

export interface CustomerSearchModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when a customer is selected */
  onSelect: (customer: Customer) => void;
  /** Callback when modal is closed */
  onCancel: () => void;
  /** Callback when "Create New" is pressed (optional) */
  onCreateNew?: () => void;
  /** Test ID */
  testID?: string;
}

/**
 * Customer list item
 */
const CustomerItem = React.memo(function CustomerItem({
  customer,
  onPress,
}: {
  customer: Customer;
  onPress: () => void;
}) {
  const secondaryText = customer.address || customer.contact.phone || '';

  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${customer.name}${secondaryText ? `、${secondaryText}` : ''}`}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="person-outline" size={20} color="#666" />
      </View>
      <View style={styles.itemMain}>
        <Text style={styles.itemName} numberOfLines={1}>
          {customer.name}
        </Text>
        {secondaryText ? (
          <Text style={styles.itemSecondary} numberOfLines={1}>
            {secondaryText}
          </Text>
        ) : null}
      </View>
      <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
    </Pressable>
  );
});

/**
 * Modal for selecting from customers
 */
export const CustomerSearchModal: React.FC<CustomerSearchModalProps> = ({
  visible,
  onSelect,
  onCancel,
  onCreateNew,
  testID,
}) => {
  const {
    customers,
    isLoading,
    error,
    searchText,
    setSearchText,
    refresh,
  } = useCustomerList();

  const handleItemPress = useCallback(
    (customer: Customer) => {
      onSelect(customer);
    },
    [onSelect]
  );

  const renderItem = useCallback(
    ({ item }: { item: Customer }) => (
      <CustomerItem
        customer={item}
        onPress={() => handleItemPress(item)}
      />
    ),
    [handleItemPress]
  );

  const keyExtractor = useCallback((item: Customer) => item.id, []);

  const ListEmptyComponent = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.emptyText}>読み込み中...</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryText}>再読み込み</Text>
          </Pressable>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={48} color="#C7C7CC" />
        <Text style={styles.emptyText}>
          {searchText
            ? '該当する顧客がありません'
            : '顧客が登録されていません'}
        </Text>
        {onCreateNew && !searchText && (
          <Pressable style={styles.createButton} onPress={onCreateNew}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.createText}>新規顧客を作成</Text>
          </Pressable>
        )}
      </View>
    );
  }, [isLoading, error, searchText, refresh, onCreateNew]);

  const ListFooterComponent = useCallback(() => {
    if (customers.length === 0 || !onCreateNew) return null;

    return (
      <View style={styles.footer}>
        <Pressable
          style={styles.footerButton}
          onPress={onCreateNew}
          accessibilityRole="button"
          accessibilityLabel="新規顧客を作成"
        >
          <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.footerText}>新規顧客を作成</Text>
        </Pressable>
      </View>
    );
  }, [customers.length, onCreateNew]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
      testID={testID}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={onCancel}
            style={styles.closeButton}
            accessibilityLabel="閉じる"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={28} color="#000" />
          </Pressable>
          <Text style={styles.headerTitle}>顧客を選択</Text>
          <View style={styles.closeButton} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchText}
            onChangeText={setSearchText}
            placeholder="顧客名・住所で検索..."
          />
        </View>

        {/* List */}
        <FlatList
          data={customers}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={ListEmptyComponent}
          ListFooterComponent={ListFooterComponent}
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          contentContainerStyle={
            customers.length === 0 ? styles.listEmptyContent : undefined
          }
        />
      </View>
    </Modal>
  );
};

CustomerSearchModal.displayName = 'CustomerSearchModal';

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
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  list: {
    flex: 1,
  },
  listEmptyContent: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemMain: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  itemSecondary: {
    fontSize: 13,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#FF3B30',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    gap: 8,
  },
  createText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  footer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },
});
