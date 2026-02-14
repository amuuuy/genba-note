/**
 * KanbanBoard Component
 *
 * Main kanban board component that orchestrates:
 * - 3-column horizontal layout
 * - Drag-and-drop via RNGH gestures (per-card Gesture.Pan)
 * - Ghost card rendering during drag
 * - PaidAt modal for paid transitions
 * - Error toast for invalid transitions
 */

import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import type { DocumentWithTotals } from '@/types/document';
import type { KanbanColumnId } from '@/types/kanban';
import { KANBAN_COLUMNS } from '@/domain/kanban/kanbanService';
import { useKanbanBoard } from '@/hooks/useKanbanBoard';
import { KanbanDragProvider, useKanbanDrag } from './KanbanDragProvider';
import { KanbanColumn } from './KanbanColumn';
import { KANBAN_UI_COLUMNS } from './kanbanColumnConfig';
import { KanbanCard } from './KanbanCard';
import { PaidAtModal } from '@/components/document/edit/PaidAtModal';

export interface KanbanBoardProps {
  documents: DocumentWithTotals[];
  isLoading: boolean;
  onDocumentPress: (id: string) => void;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

/**
 * Inner board component that has access to KanbanDragProvider context
 */
const KanbanBoardInner: React.FC<KanbanBoardProps> = ({
  documents,
  isLoading,
  onDocumentPress,
  onRefresh,
  disabled,
}) => {
  const {
    columns,
    handleDrop,
    isTransitioning,
    transitionError,
    showPaidAtModal,
    paidAtIssueDate,
    onPaidAtConfirm,
    onPaidAtCancel,
  } = useKanbanBoard(documents, onRefresh);

  const dragCtx = useKanbanDrag();

  // Store latest references to avoid stale closures in gesture callbacks
  const dragCtxRef = useRef(dragCtx);
  const handleDropRef = useRef(handleDrop);
  dragCtxRef.current = dragCtx;
  handleDropRef.current = handleDrop;

  const handleDragStart = useCallback(
    (
      doc: DocumentWithTotals,
      absoluteX: number,
      absoluteY: number,
      width: number,
      height: number
    ) => {
      if (disabled || isTransitioning) return;
      const columnId = KANBAN_COLUMNS.find((col) =>
        col.statuses.includes(doc.status)
      )?.id;
      if (!columnId) return;
      dragCtx.startDrag(doc, columnId, absoluteX, absoluteY, width, height);
    },
    [dragCtx, disabled, isTransitioning]
  );

  const handleDragUpdate = useCallback(
    (absoluteX: number, absoluteY: number) => {
      dragCtxRef.current.updateDrag(absoluteX, absoluteY);
    },
    []
  );

  const handleDragEnd = useCallback(
    (absoluteX: number, absoluteY: number) => {
      const ctx = dragCtxRef.current;
      // Read from synchronous ref before endDrag clears state
      const draggedDoc = ctx.draggedDocRef.current;
      // Final hit-test with onEnd coordinates (last onUpdate may be stale on fast drags)
      ctx.updateDrag(absoluteX, absoluteY);
      const targetColumn = ctx.endDrag();
      if (targetColumn && draggedDoc) {
        handleDropRef.current(draggedDoc.id, targetColumn);
      }
    },
    []
  );

  const handleDragCancel = useCallback(() => {
    dragCtxRef.current.cancelDrag();
  }, []);

  if (isLoading && documents.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.columnsContainer}>
        {KANBAN_UI_COLUMNS.map((colDef) => (
          <KanbanColumn
            key={colDef.id}
            columnDef={colDef}
            documents={columns[colDef.id]}
            onDocumentPress={onDocumentPress}
            onDragStart={handleDragStart}
            onDragUpdate={handleDragUpdate}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            disabled={disabled || isTransitioning}
          />
        ))}
      </View>

      {/* Ghost card during drag */}
      {dragCtx.isDragging && dragCtx.draggedDoc && (
        <Animated.View
          style={[
            styles.ghostCard,
            {
              width: dragCtx.ghostCardSize.width,
              transform: [
                { translateX: dragCtx.ghostX },
                { translateY: dragCtx.ghostY },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <KanbanCard
            document={dragCtx.draggedDoc}
            onPress={() => {}}
            onDragStart={() => {}}
            onDragUpdate={() => {}}
            onDragEnd={() => {}}
            onDragCancel={() => {}}
            disabled
          />
        </Animated.View>
      )}

      {/* Error toast */}
      {transitionError && (
        <View style={styles.errorToast}>
          <Text style={styles.errorText}>{transitionError}</Text>
        </View>
      )}

      {/* Transitioning overlay */}
      {isTransitioning && (
        <View style={styles.transitionOverlay}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      )}

      {/* PaidAt modal */}
      <PaidAtModal
        visible={showPaidAtModal}
        issueDate={paidAtIssueDate}
        onConfirm={onPaidAtConfirm}
        onCancel={onPaidAtCancel}
      />
    </View>
  );
};

/**
 * KanbanBoard wraps the inner board with the drag provider
 */
export const KanbanBoard: React.FC<KanbanBoardProps> = (props) => (
  <KanbanDragProvider>
    <KanbanBoardInner {...props} />
  </KanbanDragProvider>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  columnsContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0.9,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  errorToast: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  transitionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
