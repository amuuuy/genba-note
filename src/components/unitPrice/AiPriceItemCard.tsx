/**
 * AiPriceItemCard Component
 *
 * Displays a single AI price research result.
 * Similar layout to MaterialSearchResultItem but without product image.
 * Supports optional checkbox for multi-select mode.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, type GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AiPriceItem } from '@/types/materialResearch';
import { formatCurrency } from '@/utils/currencyFormat';
import { safeOpenUrl } from '@/utils/safeOpenUrl';

export interface AiPriceItemCardProps {
  /** Price item to display */
  item: AiPriceItem;
  /** Callback when register button is pressed (single item edit flow) */
  onRegister: (item: AiPriceItem) => void;
  /** Whether multi-select checkboxes are shown */
  selectable?: boolean;
  /** Whether this item is currently selected */
  selected?: boolean;
  /** Callback when selection is toggled */
  onToggleSelect?: (item: AiPriceItem) => void;
  /** Test ID */
  testID?: string;
}

export const AiPriceItemCard = React.memo(
  function AiPriceItemCard({
    item,
    onRegister,
    selectable = false,
    selected = false,
    onToggleSelect,
    testID,
  }: AiPriceItemCardProps) {
    const handleSourcePress = (e: GestureResponderEvent) => {
      e.stopPropagation();
      if (item.sourceUrl) {
        safeOpenUrl(item.sourceUrl);
      }
    };

    return (
      <Pressable
        style={[styles.container, selected && styles.containerSelected]}
        onPress={selectable && onToggleSelect ? () => onToggleSelect(item) : undefined}
        testID={testID}
      >
        {/* Checkbox (multi-select mode) */}
        {selectable && (
          <Pressable
            style={styles.checkbox}
            onPress={(e: GestureResponderEvent) => {
              e.stopPropagation();
              onToggleSelect?.(item);
            }}
            hitSlop={8}
            accessibilityLabel={selected ? `${item.name}の選択を解除` : `${item.name}を選択`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
          >
            <Ionicons
              name={selected ? 'checkbox' : 'square-outline'}
              size={22}
              color={selected ? '#8B5CF6' : '#C7C7CC'}
            />
          </Pressable>
        )}

        {/* AI icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="sparkles" size={24} color="#8B5CF6" />
        </View>

        {/* Price info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Pressable
            onPress={handleSourcePress}
            disabled={!item.sourceUrl}
          >
            <Text
              style={[styles.sourceName, item.sourceUrl && styles.sourceNameLink]}
              numberOfLines={1}
            >
              {item.sourceName}
            </Text>
          </Pressable>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ¥{formatCurrency(item.price)}
            </Text>
            <Text style={styles.taxLabel}>
              {item.taxIncluded ? '(税込)' : '(税抜)'}
            </Text>
          </View>
        </View>

        {/* Register button (single item edit flow) */}
        <Pressable
          style={({ pressed }) => [
            styles.registerButton,
            pressed && styles.registerButtonPressed,
          ]}
          onPress={(e: GestureResponderEvent) => {
            e.stopPropagation();
            onRegister(item);
          }}
          accessibilityLabel={`${item.name}を編集して登録`}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Ionicons name="add-circle" size={28} color="#007AFF" />
        </Pressable>
      </Pressable>
    );
  }
);

AiPriceItemCard.displayName = 'AiPriceItemCard';

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
  containerSelected: {
    backgroundColor: '#F5F3FF',
  },
  checkbox: {
    marginRight: 10,
    padding: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    lineHeight: 20,
    marginBottom: 2,
  },
  sourceName: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  sourceNameLink: {
    color: '#007AFF',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  taxLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginLeft: 4,
  },
  registerButton: {
    padding: 4,
  },
  registerButtonPressed: {
    opacity: 0.6,
  },
});
