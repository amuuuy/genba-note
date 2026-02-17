/**
 * LineItemList Component
 *
 * Displays a list of line items with add/edit/delete functionality.
 * Uses FlatList for list rendering.
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LineItem } from '@/types/document';
import type { LineItemInput } from '@/domain/lineItem/lineItemService';
import type { UnitPrice } from '@/types/unitPrice';
import { unitPriceToLineItemInput } from '@/domain/unitPrice';
import { LineItemRow } from './LineItemRow';
import { LineItemEditorModal } from './LineItemEditorModal';
import { UnitPricePickerModal } from './UnitPricePickerModal';
import { MaterialSearchModal } from '@/components/unitPrice';

export interface LineItemListProps {
  /** Current line items */
  lineItems: LineItem[];
  /** Callback to add a line item */
  onAdd: (input: LineItemInput) => boolean;
  /** Callback to update a line item */
  onUpdate: (id: string, updates: Partial<LineItemInput>) => boolean;
  /** Callback to remove a line item */
  onRemove: (id: string) => boolean;
  /** Whether editing is disabled */
  disabled?: boolean;
  /** Error message for line items */
  error?: string | null;
  /** Callback to register a line item to the unit price list */
  onRegisterToUnitPrice?: (input: LineItemInput) => void | Promise<void>;
  /** Test ID */
  testID?: string;
}

/**
 * Line items list with CRUD operations
 */
function LineItemListComponent({
  lineItems,
  onAdd,
  onUpdate,
  onRemove,
  disabled = false,
  error,
  onRegisterToUnitPrice,
  testID,
}: LineItemListProps) {
  // Modal states
  const [editorVisible, setEditorVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [researchModalVisible, setResearchModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);

  // Open editor for new item
  const handleAddPress = useCallback(() => {
    setEditingItem(null);
    setEditorVisible(true);
  }, []);

  // Open editor for existing item
  const handleItemPress = useCallback((id: string) => {
    const item = lineItems.find((li) => li.id === id);
    if (item) {
      setEditingItem(item);
      setEditorVisible(true);
    }
  }, [lineItems]);

  // Handle delete
  const handleDelete = useCallback(
    (id: string) => {
      const success = onRemove(id);
      if (!success) {
        Alert.alert(
          '削除エラー',
          '明細の削除に失敗しました。最低1件の明細が必要です。',
          [{ text: 'OK' }]
        );
      }
    },
    [onRemove]
  );

  // Handle quantity change from stepper
  const handleQuantityChange = useCallback(
    (id: string, newQuantityMilli: number) => {
      const success = onUpdate(id, { quantityMilli: newQuantityMilli });
      if (!success) {
        Alert.alert(
          '更新エラー',
          '数量の更新に失敗しました。',
          [{ text: 'OK' }]
        );
      }
    },
    [onUpdate]
  );

  // Handle save from editor
  const handleEditorSave = useCallback(
    (input: LineItemInput) => {
      if (editingItem) {
        // Update existing
        const success = onUpdate(editingItem.id, input);
        if (success) {
          setEditorVisible(false);
          setEditingItem(null);
        } else {
          Alert.alert(
            '更新エラー',
            '明細の更新に失敗しました。入力内容を確認してください。',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Add new
        const success = onAdd(input);
        if (success) {
          setEditorVisible(false);
          // Prompt to register to unit price list
          if (onRegisterToUnitPrice) {
            Alert.alert(
              '単価表にも登録しますか？',
              `「${input.name}」を単価表に登録すると、次回から単価表から選択して追加できます。`,
              [
                { text: 'しない', style: 'cancel' },
                { text: '登録する', onPress: () => onRegisterToUnitPrice(input) },
              ]
            );
          }
        } else {
          Alert.alert(
            '追加エラー',
            '明細の追加に失敗しました。最大件数に達しているか、入力内容をご確認ください。',
            [{ text: 'OK' }]
          );
        }
      }
    },
    [editingItem, onAdd, onUpdate, onRegisterToUnitPrice]
  );

  // Handle cancel from editor
  const handleEditorCancel = useCallback(() => {
    setEditorVisible(false);
    setEditingItem(null);
  }, []);

  // Open unit price picker
  const handleOpenPicker = useCallback(() => {
    setEditorVisible(false);
    setPickerVisible(true);
  }, []);

  // Handle unit price selection
  const handleUnitPriceSelect = useCallback(
    (unitPrice: UnitPrice) => {
      const input = unitPriceToLineItemInput(unitPrice);
      const success = onAdd(input);
      if (success) {
        setPickerVisible(false);
      } else {
        Alert.alert(
          '追加エラー',
          '明細の追加に失敗しました。最大件数に達しているか、入力内容をご確認ください。',
          [{ text: 'OK' }]
        );
      }
    },
    [onAdd]
  );

  // Handle cancel from picker
  const handlePickerCancel = useCallback(() => {
    setPickerVisible(false);
  }, []);

  // Handle bulk add from material research
  const handleResearchAddLineItems = useCallback(
    (inputs: LineItemInput[]) => {
      if (inputs.length === 0) return;
      let successCount = 0;
      for (const input of inputs) {
        const success = onAdd(input);
        if (!success) break; // MAX_LINE_ITEMS reached
        successCount++;
      }
      if (successCount === inputs.length) {
        Alert.alert('追加完了', `${successCount}件の明細を追加しました`);
      } else if (successCount > 0) {
        Alert.alert(
          '一部追加完了',
          `${successCount}/${inputs.length}件を追加しました。明細の最大件数に達しました。`
        );
      } else {
        Alert.alert('追加エラー', '明細の最大件数に達しているため追加できません。');
      }
    },
    [onAdd]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: LineItem; index: number }) => (
      <LineItemRow
        lineItem={item}
        index={index}
        onPress={handleItemPress}
        onDelete={handleDelete}
        onQuantityChange={handleQuantityChange}
        disabled={disabled}
      />
    ),
    [handleItemPress, handleDelete, handleQuantityChange, disabled]
  );

  const keyExtractor = useCallback((item: LineItem) => item.id, []);

  return (
    <View style={styles.container} testID={testID}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>明細</Text>
        <Text style={styles.headerCount}>
          {lineItems.length}件
        </Text>
      </View>

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* List */}
      {lineItems.length > 0 ? (
        <View style={styles.listContainer}>
          <FlatList
            data={lineItems}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            scrollEnabled={false}
          />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={32} color="#C7C7CC" />
          <Text style={styles.emptyText}>明細がありません</Text>
        </View>
      )}

      {/* Add buttons */}
      {!disabled && (
        <>
          <View style={styles.addButtons}>
            <Pressable
              style={styles.addButton}
              onPress={handleAddPress}
              accessibilityLabel="明細を追加"
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
              <Text style={styles.addButtonText}>手入力で追加</Text>
            </Pressable>
            <View style={styles.buttonDivider} />
            <Pressable
              style={styles.addButton}
              onPress={() => setPickerVisible(true)}
              accessibilityLabel="単価表から追加"
              accessibilityRole="button"
            >
              <Ionicons name="list-outline" size={20} color="#007AFF" />
              <Text style={styles.addButtonText}>単価表から追加</Text>
            </Pressable>
          </View>
          <Pressable
            style={styles.researchButton}
            onPress={() => setResearchModalVisible(true)}
            accessibilityLabel="リサーチから追加"
            accessibilityRole="button"
          >
            <Ionicons name="sparkles-outline" size={20} color="#8B5CF6" />
            <Text style={styles.researchButtonText}>リサーチから追加</Text>
          </Pressable>
        </>
      )}

      {/* Editor Modal */}
      <LineItemEditorModal
        visible={editorVisible}
        lineItem={editingItem}
        onSave={handleEditorSave}
        onCancel={handleEditorCancel}
        onOpenUnitPricePicker={editingItem ? undefined : handleOpenPicker}
      />

      {/* Unit Price Picker Modal */}
      <UnitPricePickerModal
        visible={pickerVisible}
        onSelect={handleUnitPriceSelect}
        onCancel={handlePickerCancel}
      />

      {/* Material Research Modal */}
      <MaterialSearchModal
        visible={researchModalVisible}
        mode="lineItem"
        onAddLineItems={handleResearchAddLineItems}
        onClose={() => setResearchModalVisible(false)}
      />
    </View>
  );
}

export const LineItemList = memo(LineItemListComponent);

LineItemList.displayName = 'LineItemList';

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerCount: {
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    flex: 1,
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
  addButtons: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  addButtonText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  buttonDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5E5',
    marginVertical: 10,
  },
  researchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 8,
    paddingVertical: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  researchButtonText: {
    fontSize: 15,
    color: '#8B5CF6',
    fontWeight: '500',
  },
});
