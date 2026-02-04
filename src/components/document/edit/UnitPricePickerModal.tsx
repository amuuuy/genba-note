/**
 * UnitPricePickerModal Component
 *
 * Modal for selecting a unit price from the master data.
 * Provides search/filter functionality.
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
import type { UnitPrice } from '@/types/unitPrice';
import { SearchBar, FilterChipGroup, type FilterOption } from '@/components/common';
import { useUnitPricePicker } from '@/hooks';

export interface UnitPricePickerModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when a unit price is selected */
  onSelect: (unitPrice: UnitPrice) => void;
  /** Callback when modal is closed */
  onCancel: () => void;
  /** Test ID */
  testID?: string;
}

/**
 * Format price as currency
 */
function formatCurrency(value: number): string {
  return value.toLocaleString('ja-JP');
}

/**
 * Unit price list item
 */
const UnitPriceItem = React.memo(function UnitPriceItem({
  unitPrice,
  onPress,
}: {
  unitPrice: UnitPrice;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${unitPrice.name}、${formatCurrency(unitPrice.defaultPrice)}円、${unitPrice.unit}`}
    >
      <View style={styles.itemMain}>
        <Text style={styles.itemName} numberOfLines={1}>
          {unitPrice.name}
        </Text>
        <View style={styles.itemDetails}>
          <Text style={styles.itemUnit}>{unitPrice.unit}</Text>
          {unitPrice.category && (
            <>
              <Text style={styles.itemDot}>・</Text>
              <Text style={styles.itemCategory}>{unitPrice.category}</Text>
            </>
          )}
        </View>
      </View>
      <View style={styles.itemPrice}>
        <Text style={styles.itemPriceText}>
          ¥{formatCurrency(unitPrice.defaultPrice)}
        </Text>
        <Text style={styles.itemTaxRate}>
          {unitPrice.defaultTaxRate === 10 ? '10%' : '非課税'}
        </Text>
      </View>
      <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
    </Pressable>
  );
});

/**
 * Modal for selecting from unit prices
 */
export const UnitPricePickerModal: React.FC<UnitPricePickerModalProps> = ({
  visible,
  onSelect,
  onCancel,
  testID,
}) => {
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
  } = useUnitPricePicker();

  const handleItemPress = useCallback(
    (unitPrice: UnitPrice) => {
      onSelect(unitPrice);
    },
    [onSelect]
  );

  // Build category filter options
  const categoryOptions: FilterOption<string>[] = [
    { value: '', label: 'すべて' },
    ...categories.map((cat) => ({ value: cat, label: cat })),
  ];

  const renderItem = useCallback(
    ({ item }: { item: UnitPrice }) => (
      <UnitPriceItem
        unitPrice={item}
        onPress={() => handleItemPress(item)}
      />
    ),
    [handleItemPress]
  );

  const keyExtractor = useCallback((item: UnitPrice) => item.id, []);

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
          {searchText || selectedCategory
            ? '該当する単価表がありません'
            : '単価表が登録されていません'}
        </Text>
      </View>
    );
  }, [isLoading, error, searchText, selectedCategory, refresh]);

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
          <Text style={styles.headerTitle}>単価表から選択</Text>
          <View style={styles.closeButton} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchText}
            onChangeText={setSearchText}
            placeholder="品名で検索..."
          />
        </View>

        {/* Category filter */}
        {categories.length > 0 && (
          <View style={styles.filterContainer}>
            <FilterChipGroup
              options={categoryOptions}
              selectedValue={selectedCategory ?? ''}
              onSelect={(value) => setCategory(value || null)}
            />
          </View>
        )}

        {/* List */}
        <FlatList
          data={unitPrices}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={ListEmptyComponent}
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          contentContainerStyle={
            unitPrices.length === 0 ? styles.listEmptyContent : undefined
          }
        />
      </View>
    </Modal>
  );
};

UnitPricePickerModal.displayName = 'UnitPricePickerModal';

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
  },
  filterContainer: {
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
  itemMain: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemUnit: {
    fontSize: 13,
    color: '#666',
  },
  itemDot: {
    fontSize: 13,
    color: '#999',
    marginHorizontal: 4,
  },
  itemCategory: {
    fontSize: 13,
    color: '#666',
  },
  itemPrice: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  itemPriceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  itemTaxRate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
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
});
