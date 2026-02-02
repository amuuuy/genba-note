/**
 * EmptyDocumentList Component
 *
 * Displays a message when there are no documents to show.
 * Provides different messages for empty list vs no search results.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface EmptyDocumentListProps {
  /** Whether the list is empty due to filters/search */
  isFiltered: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Empty state component for document list
 */
export const EmptyDocumentList: React.FC<EmptyDocumentListProps> = ({
  isFiltered,
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
      <Text style={styles.title}>まだ書類がありません</Text>
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
});
