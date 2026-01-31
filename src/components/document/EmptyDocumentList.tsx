/**
 * EmptyDocumentList Component
 *
 * Displays a message when there are no documents to show.
 * Provides different messages for empty list vs no search results.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface EmptyDocumentListProps {
  /** Whether the list is empty due to filters/search */
  isFiltered: boolean;
  /** Callback to create a new document */
  onCreatePress?: () => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Empty state component for document list
 */
export const EmptyDocumentList: React.FC<EmptyDocumentListProps> = ({
  isFiltered,
  onCreatePress,
  testID,
}) => {
  if (isFiltered) {
    return (
      <View style={styles.container} testID={testID}>
        <Ionicons name="search-outline" size={48} color="#C7C7CC" />
        <Text style={styles.title}>該当する書類がありません</Text>
        <Text style={styles.message}>
          検索条件を変更してみてください
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      <Ionicons name="document-text-outline" size={48} color="#C7C7CC" />
      <Text style={styles.title}>書類がありません</Text>
      <Text style={styles.message}>
        最初の見積書または請求書を作成しましょう
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

EmptyDocumentList.displayName = 'EmptyDocumentList';

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
