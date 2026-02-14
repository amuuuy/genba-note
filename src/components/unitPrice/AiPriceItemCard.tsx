/**
 * AiPriceItemCard Component
 *
 * Displays a single AI price research result.
 * Similar layout to MaterialSearchResultItem but without product image.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AiPriceItem } from '@/types/materialResearch';

export interface AiPriceItemCardProps {
  /** Price item to display */
  item: AiPriceItem;
  /** Callback when register button is pressed */
  onRegister: (item: AiPriceItem) => void;
  /** Test ID */
  testID?: string;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('ja-JP');
}

export const AiPriceItemCard = React.memo(
  function AiPriceItemCard({ item, onRegister, testID }: AiPriceItemCardProps) {
    const handleSourcePress = () => {
      if (item.sourceUrl) {
        Linking.openURL(item.sourceUrl);
      }
    };

    return (
      <View style={styles.container} testID={testID}>
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

        {/* Register button */}
        <Pressable
          style={({ pressed }) => [
            styles.registerButton,
            pressed && styles.registerButtonPressed,
          ]}
          onPress={() => onRegister(item)}
          accessibilityLabel={`${item.name}を単価マスタに登録`}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Ionicons name="add-circle" size={28} color="#007AFF" />
        </Pressable>
      </View>
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
