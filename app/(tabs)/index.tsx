/**
 * Document List Screen - Creation Hub
 *
 * Main screen with Creation Hub design:
 * - App branding header with collapsible search + view mode toggle
 * - Two large card buttons for document creation
 * - Status-grouped document sections (list view) or kanban board (kanban view)
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDocumentFilter } from '../../src/hooks/useDocumentFilter';
import { useDocumentList } from '../../src/hooks/useDocumentList';
import { useReadOnlyMode } from '../../src/hooks/useReadOnlyMode';
import {
  CreationHubHeader,
  CreateDocumentCardGroup,
  StatusGroupedDocumentsSection,
} from '../../src/components/document';
import { ConfirmDialog } from '../../src/components/common';
import { KanbanBoard } from '../../src/components/kanban/KanbanBoard';

/**
 * Delete confirmation state
 */
interface DeleteConfirmState {
  id: string;
  clientName: string;
}

/**
 * Main document list screen with Creation Hub design
 */
export default function DocumentListScreen() {
  // View mode state
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Search state
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Filter state (only using search text, not type/status filters)
  const {
    filterState,
    filter,
    isFiltered,
    setSearchText,
  } = useDocumentFilter();

  // Document list state
  const { documents, isLoading, error, refresh, deleteDocument } =
    useDocumentList(filter);

  // Read-only mode state
  const { isReadOnlyMode } = useReadOnlyMode();

  // Delete confirmation dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(
    null
  );

  // Handle document press
  const handleDocumentPress = useCallback((id: string) => {
    router.push(`/document/${id}`);
  }, []);

  // Handle delete trigger (from swipe)
  const handleDeleteTrigger = useCallback((id: string, clientName: string) => {
    setDeleteConfirm({ id, clientName });
  }, []);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (deleteConfirm) {
      await deleteDocument(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, deleteDocument]);

  // Handle delete cancel
  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  // Handle create estimate
  const handleCreateEstimate = useCallback(() => {
    router.push('/document/new?type=estimate');
  }, []);

  // Handle create invoice
  const handleCreateInvoice = useCallback(() => {
    router.push('/document/new?type=invoice');
  }, []);

  // Handle photo icon press - navigate to customer detail (photo management)
  const handlePhotoPress = useCallback((customerId: string) => {
    router.push(`/customer/${customerId}`);
  }, []);

  // Handle search toggle
  const handleSearchPress = useCallback(() => {
    setShowSearchBar(true);
  }, []);

  // Handle search close
  const handleSearchClose = useCallback(() => {
    setShowSearchBar(false);
    setSearchText('');
  }, [setSearchText]);

  // Handle view mode toggle
  const handleViewModeToggle = useCallback(() => {
    setViewMode((prev) => (prev === 'list' ? 'kanban' : 'list'));
  }, []);

  // Show error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
        <Pressable style={styles.retryButton} onPress={refresh}>
          <Ionicons name="refresh" size={20} color="#fff" />
        </Pressable>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {viewMode === 'list' ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <CreationHubHeader
            showSearchBar={showSearchBar}
            onSearchPress={handleSearchPress}
            searchText={filterState.searchText}
            onSearchTextChange={setSearchText}
            onSearchClose={handleSearchClose}
            viewMode={viewMode}
            onViewModeToggle={handleViewModeToggle}
          />

          <CreateDocumentCardGroup
            onCreateEstimate={handleCreateEstimate}
            onCreateInvoice={handleCreateInvoice}
            disabled={isReadOnlyMode}
          />

          <StatusGroupedDocumentsSection
            documents={documents}
            isLoading={isLoading}
            isFiltered={isFiltered}
            onDocumentPress={handleDocumentPress}
            onDocumentDelete={handleDeleteTrigger}
            onPhotoPress={handlePhotoPress}
            disableDelete={isReadOnlyMode}
            onRefresh={refresh}
          />
        </ScrollView>
      ) : (
        <View style={styles.kanbanContainer}>
          <CreationHubHeader
            showSearchBar={showSearchBar}
            onSearchPress={handleSearchPress}
            searchText={filterState.searchText}
            onSearchTextChange={setSearchText}
            onSearchClose={handleSearchClose}
            viewMode={viewMode}
            onViewModeToggle={handleViewModeToggle}
          />

          <CreateDocumentCardGroup
            onCreateEstimate={handleCreateEstimate}
            onCreateInvoice={handleCreateInvoice}
            disabled={isReadOnlyMode}
          />

          <KanbanBoard
            documents={documents}
            isLoading={isLoading}
            onDocumentPress={handleDocumentPress}
            onRefresh={refresh}
            disabled={isReadOnlyMode}
          />
        </View>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        visible={deleteConfirm !== null}
        title="書類を削除"
        message={`「${deleteConfirm?.clientName ?? ''}」の書類を削除しますか？\nこの操作は取り消せません。`}
        confirmText="削除"
        cancelText="キャンセル"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  kanbanContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
});
