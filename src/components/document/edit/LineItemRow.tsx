/**
 * LineItemRow Component
 *
 * Displays a single line item in the list.
 * Shows name, quantity × unitPrice = subtotal.
 * Tapping opens edit modal, swipe reveals delete button.
 */

import React, { memo, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LineItem } from '@/types/document';
import { calcLineSubtotal, fromQuantityMilli } from '@/domain/lineItem';
import { QuantityStepper } from '@/components/common/QuantityStepper';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export interface LineItemRowProps {
  /** Line item data */
  lineItem: LineItem;
  /** Row index (for display) */
  index: number;
  /** Callback when row is pressed (to edit) */
  onPress: (id: string) => void;
  /** Callback when delete is pressed */
  onDelete: (id: string) => void;
  /** Callback when quantity changes via stepper */
  onQuantityChange: (id: string, newQuantityMilli: number) => void;
  /** Whether editing is disabled */
  disabled?: boolean;
  /** Test ID */
  testID?: string;
}

/**
 * Format number as currency (with thousand separators)
 */
function formatCurrency(value: number): string {
  return value.toLocaleString('ja-JP');
}

/**
 * Format quantity (remove trailing zeros)
 */
function formatQuantity(quantityMilli: number): string {
  const quantity = fromQuantityMilli(quantityMilli);
  // Remove unnecessary trailing zeros
  return quantity.toString();
}

/**
 * Single line item row with swipe-to-delete
 */
function LineItemRowComponent({
  lineItem,
  index,
  onPress,
  onDelete,
  onQuantityChange,
  disabled = false,
  testID,
}: LineItemRowProps) {
  const subtotal = calcLineSubtotal(lineItem.quantityMilli, lineItem.unitPrice);
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteButtonWidth = 80;

  // State for delete confirmation when quantity reaches zero
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes
        return (
          !disabled &&
          Math.abs(gestureState.dx) > 10 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
        );
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow swipe left (negative dx)
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -deleteButtonWidth));
        } else {
          translateX.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped more than half, show delete button
        if (gestureState.dx < -deleteButtonWidth / 2) {
          Animated.spring(translateX, {
            toValue: -deleteButtonWidth,
            useNativeDriver: true,
          }).start();
        } else {
          // Snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handlePress = useCallback(() => {
    if (!disabled) {
      // Snap back first
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      onPress(lineItem.id);
    }
  }, [disabled, lineItem.id, onPress, translateX]);

  const handleDelete = useCallback(() => {
    if (disabled) return;
    onDelete(lineItem.id);
  }, [disabled, lineItem.id, onDelete]);

  // Handle quantity change from stepper
  const handleQuantityChange = useCallback(
    (newQuantityMilli: number) => {
      onQuantityChange(lineItem.id, newQuantityMilli);
    },
    [lineItem.id, onQuantityChange]
  );

  // Handle when stepper would reduce quantity to zero
  const handleZeroReached = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  // Confirm delete from dialog
  const handleConfirmDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    if (disabled) return;
    onDelete(lineItem.id);
  }, [disabled, lineItem.id, onDelete]);

  // Cancel delete from dialog
  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  return (
    <View style={styles.container} testID={testID}>
      {/* Delete button (behind the row) */}
      <Pressable
        style={styles.deleteButton}
        onPress={handleDelete}
        disabled={disabled}
        accessibilityLabel="削除"
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={24} color="#fff" />
      </Pressable>

      {/* Main row content */}
      <Animated.View
        style={[
          styles.rowContent,
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable
          style={[styles.pressable, disabled && styles.pressableDisabled]}
          onPress={handlePress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`${lineItem.name}, ${formatQuantity(lineItem.quantityMilli)}${lineItem.unit} × ${formatCurrency(lineItem.unitPrice)}円 = ${formatCurrency(subtotal)}円`}
          accessibilityHint="タップして編集"
        >
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>{index + 1}</Text>
          </View>
          <View style={styles.mainContent}>
            <Text style={styles.name} numberOfLines={1}>
              {lineItem.name}
            </Text>
            <View style={styles.calculation}>
              <QuantityStepper
                value={lineItem.quantityMilli}
                onChange={handleQuantityChange}
                onZeroReached={handleZeroReached}
                unit={lineItem.unit}
                disabled={disabled}
                testID={testID ? `${testID}-quantity-stepper` : undefined}
              />
              <Text style={styles.operator}>×</Text>
              <Text style={styles.unitPrice}>
                ¥{formatCurrency(lineItem.unitPrice)}
              </Text>
            </View>
          </View>
          <View style={styles.subtotalContainer}>
            <Text style={styles.subtotal}>
              ¥{formatCurrency(subtotal)}
            </Text>
            <Text style={styles.taxRate}>
              {lineItem.taxRate === 10 ? '10%' : '非課税'}
            </Text>
          </View>
          {!disabled && (
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#C7C7CC"
              style={styles.chevron}
            />
          )}
        </Pressable>
      </Animated.View>

      {/* Delete confirmation dialog when quantity reaches zero */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="明細の削除"
        message="数量が0になりました。この明細を削除しますか？"
        confirmText="削除"
        cancelText="キャンセル"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        testID={testID ? `${testID}-delete-confirm` : undefined}
      />
    </View>
  );
}

export const LineItemRow = memo(LineItemRowComponent);

LineItemRow.displayName = 'LineItemRow';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 1,
  },
  deleteButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: {
    backgroundColor: '#fff',
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    minHeight: 64,
  },
  pressableDisabled: {
    opacity: 0.6,
  },
  indexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  indexText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  mainContent: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  calculation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 13,
    color: '#666',
  },
  operator: {
    fontSize: 13,
    color: '#999',
    marginHorizontal: 4,
  },
  unitPrice: {
    fontSize: 13,
    color: '#666',
  },
  subtotalContainer: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  subtotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  taxRate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  chevron: {
    marginLeft: 4,
  },
});
