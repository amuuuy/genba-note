/**
 * StatusGroupedDocumentsSection Component
 *
 * Replaces the single "最近の書類" section with three status-grouped sections:
 * - 入金済み (paid)
 * - 請求中 (sent + issued)
 * - 作業中 (draft)
 *
 * Each section has a colored header with count badge and renders
 * DocumentListItem cards with swipe-to-delete.
 */

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DocumentWithTotals } from '../../types';
import { groupDocumentsByStatus } from '../../domain/document/statusGroupService';
import { STATUS_GROUP_UI_CONFIGS } from './statusGroupConfig';
import type { StatusGroupUIConfig } from './statusGroupConfig';
import { DocumentListItem } from './DocumentListItem';
import { EmptyDocumentList } from './EmptyDocumentList';

export interface StatusGroupedDocumentsSectionProps {
  documents: DocumentWithTotals[];
  isLoading: boolean;
  isFiltered?: boolean;
  onDocumentPress: (id: string) => void;
  onDocumentDelete: (id: string, clientName: string) => void;
  /** Callback when photo icon is tapped (customerId passed) */
  onPhotoPress?: (customerId: string) => void;
  disableDelete?: boolean;
  onRefresh?: () => void;
  testID?: string;
}

/** Section header with colored accent bar, icon, title, and count badge */
const StatusGroupHeader: React.FC<{
  config: StatusGroupUIConfig;
  count: number;
}> = React.memo(({ config, count }) => (
  <View style={[sectionStyles.header, { backgroundColor: config.headerBgColor }]}>
    <View
      style={[sectionStyles.accentBar, { backgroundColor: config.accentColor }]}
    />
    <Ionicons
      name={config.iconName as keyof typeof Ionicons.glyphMap}
      size={18}
      color={config.accentColor}
      style={sectionStyles.headerIcon}
    />
    <Text style={[sectionStyles.headerTitle, { color: config.accentColor }]}>
      {config.title}
    </Text>
    <View
      style={[sectionStyles.countBadge, { backgroundColor: config.accentColor }]}
    >
      <Text style={sectionStyles.countText}>{count}</Text>
    </View>
  </View>
));

StatusGroupHeader.displayName = 'StatusGroupHeader';

/** Single status group section with header + document list */
const StatusGroupSection: React.FC<{
  config: StatusGroupUIConfig;
  documents: DocumentWithTotals[];
  onDocumentPress: (id: string) => void;
  onDocumentDelete: (id: string, clientName: string) => void;
  onPhotoPress?: (customerId: string) => void;
  disableDelete: boolean;
}> = React.memo(
  ({ config, documents, onDocumentPress, onDocumentDelete, onPhotoPress, disableDelete }) => {
    const renderItem = useCallback(
      ({ item }: { item: DocumentWithTotals }) => (
        <DocumentListItem
          document={item}
          onPress={onDocumentPress}
          onDelete={onDocumentDelete}
          onPhotoPress={onPhotoPress}
          disableDelete={disableDelete}
        />
      ),
      [onDocumentPress, onDocumentDelete, onPhotoPress, disableDelete]
    );

    return (
      <View style={sectionStyles.section} testID={`status-group-${config.id}`}>
        <StatusGroupHeader config={config} count={documents.length} />
        <FlatList
          data={documents}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          initialNumToRender={documents.length}
          windowSize={21}
        />
      </View>
    );
  }
);

StatusGroupSection.displayName = 'StatusGroupSection';

/**
 * Main component: renders status-grouped document sections
 */
export const StatusGroupedDocumentsSection: React.FC<
  StatusGroupedDocumentsSectionProps
> = ({
  documents,
  isLoading,
  isFiltered = false,
  onDocumentPress,
  onDocumentDelete,
  onPhotoPress,
  disableDelete = false,
  testID,
}) => {
  const grouped = useMemo(() => groupDocumentsByStatus(documents), [documents]);

  const visibleSections = useMemo(
    () =>
      STATUS_GROUP_UI_CONFIGS.filter((config) => grouped[config.id].length > 0),
    [grouped]
  );

  if (isLoading && documents.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (visibleSections.length === 0) {
    return (
      <View style={styles.container} testID={testID}>
        <EmptyDocumentList isFiltered={isFiltered} />
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      {visibleSections.map((config) => (
        <StatusGroupSection
          key={config.id}
          config={config}
          documents={grouped[config.id]}
          onDocumentPress={onDocumentPress}
          onDocumentDelete={onDocumentDelete}
          onPhotoPress={onPhotoPress}
          disableDelete={disableDelete}
        />
      ))}
    </View>
  );
};

StatusGroupedDocumentsSection.displayName = 'StatusGroupedDocumentsSection';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 200,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
});

const sectionStyles = StyleSheet.create({
  section: {
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  headerIcon: {
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
