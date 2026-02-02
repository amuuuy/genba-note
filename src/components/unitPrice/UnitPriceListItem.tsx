/**
 * UnitPriceListItem Component
 *
 * List item for displaying a unit price.
 * Shows name, price, unit, category, and tax rate.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UnitPrice } from '@/types/unitPrice';

export interface UnitPriceListItemProps {
  /** Unit price to display */
  unitPrice: UnitPrice;
  /** Callback when item is pressed */
  onPress: () => void;
  /** Callback when delete is pressed */
  onDelete?: () => void;
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
 * Unit price list item component
 */
export const UnitPriceListItem = React.memo(function UnitPriceListItem({
  unitPrice,
  onPress,
  onDelete,
  testID,
}: UnitPriceListItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${unitPrice.name}、${formatCurrency(unitPrice.defaultPrice)}円、${unitPrice.unit}`}
      testID={testID}
    >
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {unitPrice.name}
        </Text>
        <View style={styles.details}>
          <Text style={styles.unit}>{unitPrice.unit}</Text>
          {unitPrice.category && (
            <>
              <Text style={styles.dot}>・</Text>
              <Text style={styles.category}>{unitPrice.category}</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.priceContainer}>
        <Text style={styles.price}>
          ¥{formatCurrency(unitPrice.defaultPrice)}
        </Text>
        <Text style={styles.taxRate}>
          {unitPrice.defaultTaxRate === 10 ? '10%' : '非課税'}
        </Text>
      </View>

      {onDelete ? (
        <Pressable
          style={styles.deleteButton}
          onPress={onDelete}
          accessibilityLabel="削除"
          accessibilityRole="button"
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      )}
    </Pressable>
  );
});

UnitPriceListItem.displayName = 'UnitPriceListItem';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  pressed: {
    backgroundColor: '#F2F2F7',
  },
  main: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unit: {
    fontSize: 13,
    color: '#666',
  },
  dot: {
    fontSize: 13,
    color: '#999',
    marginHorizontal: 4,
  },
  category: {
    fontSize: 13,
    color: '#666',
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  price: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  taxRate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
});
