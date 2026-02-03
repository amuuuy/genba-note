/**
 * EmptyCustomerList Component
 *
 * Displays a message when there are no customers to show.
 * Provides different messages for empty list vs no search results.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface EmptyCustomerListProps {
  /** Whether the list is empty due to filters/search */
  isFiltered: boolean;
  /** Callback to create a new customer */
  onCreatePress?: () => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Empty state component for customer list
 */
export const EmptyCustomerList: React.FC<EmptyCustomerListProps> = ({
  isFiltered,
  onCreatePress,
  testID,
}) => {
  if (isFiltered) {
    return (
      <View style={styles.container} testID={testID}>
        <Ionicons name="search-outline" size={48} color="#C7C7CC" />
        <Text style={styles.title}>該当する顧客がありません</Text>
        <Text style={styles.message}>
          検索条件を変更してみてください
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      <Ionicons name="people-outline" size={48} color="#C7C7CC" />
      <Text style={styles.title}>顧客がありません</Text>
      <Text style={styles.message}>
        取引先情報を登録して{'\n'}書類作成を効率化しましょう
      </Text>
      {onCreatePress && (
        <Pressable
          style={styles.createButton}
          onPress={onCreatePress}
          accessibilityRole="button"
          accessibilityLabel="新規作成"
        >
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.createButtonText}>新規作成</Text>
        </Pressable>
      )}
    </View>
  );
};

EmptyCustomerList.displayName = 'EmptyCustomerList';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 300,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
