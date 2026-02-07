/**
 * MaterialSearchResultItem Component
 *
 * Displays a single material search result from Rakuten API.
 * Shows product image, name, shop, price, and a register button.
 */

import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MaterialSearchResult } from '@/types/materialResearch';

export interface MaterialSearchResultItemProps {
  /** Search result to display */
  result: MaterialSearchResult;
  /** Callback when register button is pressed */
  onRegister: (result: MaterialSearchResult) => void;
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
 * Material search result list item
 */
export const MaterialSearchResultItem = React.memo(
  function MaterialSearchResultItem({
    result,
    onRegister,
    testID,
  }: MaterialSearchResultItemProps) {
    return (
      <View style={styles.container} testID={testID}>
        {/* Product image */}
        {result.imageUrl ? (
          <Image
            source={{ uri: result.imageUrl }}
            style={styles.image}
            accessibilityLabel={result.name}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="cube-outline" size={24} color="#C7C7CC" />
          </View>
        )}

        {/* Product info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {result.name}
          </Text>
          <Text style={styles.shopName} numberOfLines={1}>
            {result.shopName}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ¥{formatCurrency(result.price)}
            </Text>
            <Text style={styles.taxLabel}>
              {result.taxIncluded ? '(税込)' : '(税抜)'}
            </Text>
          </View>
          {result.reviewCount > 0 && (
            <View style={styles.reviewRow}>
              <Ionicons name="star" size={12} color="#FFB800" />
              <Text style={styles.reviewText}>
                {result.reviewAverage.toFixed(1)} ({result.reviewCount})
              </Text>
            </View>
          )}
        </View>

        {/* Register button */}
        <Pressable
          style={({ pressed }) => [
            styles.registerButton,
            pressed && styles.registerButtonPressed,
          ]}
          onPress={() => onRegister(result)}
          accessibilityLabel={`${result.name}を単価マスタに登録`}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Ionicons name="add-circle" size={28} color="#007AFF" />
        </Pressable>
      </View>
    );
  }
);

MaterialSearchResultItem.displayName = 'MaterialSearchResultItem';

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
  image: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
  },
  imagePlaceholder: {
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
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
  shopName: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
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
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  reviewText: {
    fontSize: 11,
    color: '#8E8E93',
    marginLeft: 3,
  },
  registerButton: {
    padding: 4,
  },
  registerButtonPressed: {
    opacity: 0.6,
  },
});
