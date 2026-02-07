/**
 * KanbanBoard Component
 *
 * Main kanban board component that orchestrates:
 * - 3-column horizontal layout
 * - Drag-and-drop via PanResponder
 * - Ghost card rendering during drag
 * - PaidAt modal for paid transitions
 * - Error toast for invalid transitions
 */

import React, { useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
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
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  // Store latest references to avoid stale closures in PanResponder
  const dragCtxRef = useRef(dragCtx);
  const handleDropRef = useRef(handleDrop);
  isDraggingRef.current = dragCtx.isDragging;
  dragCtxRef.current = dragCtx;
  handleDropRef.current = handleDrop;

  // Track PanResponder lifecycle to coordinate with Pressable's onPressOut.
  // "granted" means PanResponder took over the responder — it will handle release/terminate.
  // If PanResponder was never granted (long press → release without move), onPressOut failsafe fires.
  const panResponderGrantedRef = useRef(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Use capture phase to ensure PanResponder takes over when dragging
        onStartShouldSetPanResponderCapture: () => isDraggingRef.current,
        onMoveShouldSetPanResponderCapture: () => isDraggingRef.current,
        onStartShouldSetPanResponder: () => isDraggingRef.current,
        onMoveShouldSetPanResponder: () => isDraggingRef.current,
        onPanResponderGrant: () => {
          panResponderGrantedRef.current = true;
        },
        onPanResponderMove: (_evt, gestureState) => {
          if (!isDraggingRef.current) return;
          const pageX = startXRef.current + gestureState.dx;
          const pageY = startYRef.current + gestureState.dy;
          dragCtxRef.current.updateDrag(pageX, pageY);
        },
        onPanResponderRelease: () => {
          if (!isDraggingRef.current) return;
          const ctx = dragCtxRef.current;
          const draggedDoc = ctx.draggedDoc;
          const targetColumn = ctx.endDrag();
          if (targetColumn && draggedDoc) {
            handleDropRef.current(draggedDoc.id, targetColumn);
          }
        },
        onPanResponderTerminate: () => {
          dragCtxRef.current.cancelDrag();
        },
      }),
    []
  );

  // Failsafe: if PanResponder never acquired the responder (e.g., long press
  // then release without moving), cancel drag on Pressable's onPressOut
  const handlePressOut = useCallback(() => {
    if (isDraggingRef.current && !panResponderGrantedRef.current) {
      dragCtxRef.current.cancelDrag();
    }
  }, []);

  const handleLongPressStart = useCallback(
    (
      doc: DocumentWithTotals,
      pageX: number,
      pageY: number,
      width: number,
      height: number
    ) => {
      if (disabled || isTransitioning) return;
      const columnId = KANBAN_COLUMNS.find((col) =>
        col.statuses.includes(doc.status)
      )?.id;
      if (!columnId) return;
      panResponderGrantedRef.current = false;
      startXRef.current = pageX;
      startYRef.current = pageY;
      dragCtx.startDrag(doc, columnId, pageX, pageY, width, height);
    },
    [dragCtx, disabled, isTransitioning]
  );

  if (isLoading && documents.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.columnsContainer}>
        {KANBAN_UI_COLUMNS.map((colDef) => (
          <KanbanColumn
            key={colDef.id}
            columnDef={colDef}
            documents={columns[colDef.id]}
            onDocumentPress={onDocumentPress}
            onLongPressStart={handleLongPressStart}
            onPressOut={handlePressOut}
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
            onLongPressStart={() => {}}
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
