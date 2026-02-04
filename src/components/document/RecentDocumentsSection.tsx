/**
 * RecentDocumentsSection Component
 *
 * Section component displaying recent documents with:
 * - Section title "最近の書類"
 * - List of documents (max 20)
 * - Empty state when no documents exist
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import type { DocumentWithTotals } from '../../types';
import { DocumentListItem } from './DocumentListItem';
import { EmptyDocumentList } from './EmptyDocumentList';

export interface RecentDocumentsSectionProps {
  /** Documents to display */
  documents: DocumentWithTotals[];
  /** Whether documents are loading */
  isLoading: boolean;
  /** Whether the list is filtered by search */
  isFiltered?: boolean;
  /** Callback when a document is pressed */
  onDocumentPress: (id: string) => void;
  /** Callback when delete is triggered */
  onDocumentDelete: (id: string, clientName: string) => void;
  /** Disable delete functionality */
  disableDelete?: boolean;
  /** Callback for pull-to-refresh */
  onRefresh?: () => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Section component for displaying recent documents
 */
export const RecentDocumentsSection: React.FC<RecentDocumentsSectionProps> = ({
  documents,
  isLoading,
  isFiltered = false,
  onDocumentPress,
  onDocumentDelete,
  disableDelete = false,
  onRefresh,
  testID,
}) => {
  const renderItem = useCallback(
    ({ item }: { item: DocumentWithTotals }) => (
      <DocumentListItem
        document={item}
        onPress={onDocumentPress}
        onDelete={onDocumentDelete}
        disableDelete={disableDelete}
      />
    ),
    [onDocumentPress, onDocumentDelete, disableDelete]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return <EmptyDocumentList isFiltered={isFiltered} />;
  }, [isLoading, isFiltered]);

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.sectionTitle}>最近の書類</Text>

      {isLoading && documents.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={documents}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          onRefresh={onRefresh}
          refreshing={isLoading}
          scrollEnabled={false}
          initialNumToRender={documents.length}
          windowSize={21}
        />
      )}
    </View>
  );
};

RecentDocumentsSection.displayName = 'RecentDocumentsSection';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 200,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
});
