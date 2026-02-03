/**
 * CustomerListItem Component
 *
 * List item for displaying a customer.
 * Shows name, address, and contact info.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Customer } from '@/types/customer';

export interface CustomerListItemProps {
  /** Customer to display */
  customer: Customer;
  /** Callback when item is pressed */
  onPress: (id: string) => void;
  /** Callback when delete is triggered */
  onDelete?: (id: string, name: string) => void;
  /** Test ID */
  testID?: string;
}

/**
 * Customer list item component
 */
export const CustomerListItem = React.memo(function CustomerListItem({
  customer,
  onPress,
  onDelete,
  testID,
}: CustomerListItemProps) {
  const handlePress = () => {
    onPress(customer.id);
  };

  const handleDelete = () => {
    onDelete?.(customer.id, customer.name);
  };

  // Build secondary text (address and contact)
  const secondaryParts: string[] = [];
  if (customer.address) {
    secondaryParts.push(customer.address);
  }
  if (customer.contact.phone) {
    secondaryParts.push(customer.contact.phone);
  }
  const secondaryText = secondaryParts.join(' / ');

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${customer.name}${secondaryText ? `、${secondaryText}` : ''}`}
      testID={testID}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="person-outline" size={24} color="#666" />
      </View>

      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {customer.name}
        </Text>
        {secondaryText ? (
          <Text style={styles.secondary} numberOfLines={1}>
            {secondaryText}
          </Text>
        ) : null}
      </View>

      {onDelete ? (
        <Pressable
          style={styles.deleteButton}
          onPress={handleDelete}
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

CustomerListItem.displayName = 'CustomerListItem';

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
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  main: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  secondary: {
    fontSize: 13,
    color: '#666',
  },
  deleteButton: {
    padding: 4,
  },
});
