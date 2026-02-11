/**
 * KanbanColumn Component
 *
 * A single kanban column with a colored header, document count badge,
 * and a scrollable list of KanbanCards.
 * Registers its layout for drag-and-drop hit-testing.
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import type { DocumentWithTotals } from '@/types/document';
import type { KanbanColumnUIDef } from '@/types/kanban';
import { KanbanCard } from './KanbanCard';
import { useKanbanDrag } from './KanbanDragProvider';

export interface KanbanColumnProps {
  columnDef: KanbanColumnUIDef;
  documents: DocumentWithTotals[];
  onDocumentPress: (id: string) => void;
  onDragStart: (
    doc: DocumentWithTotals,
    absoluteX: number,
    absoluteY: number,
    width: number,
    height: number
  ) => void;
  onDragUpdate: (absoluteX: number, absoluteY: number) => void;
  onDragEnd: (absoluteX: number, absoluteY: number) => void;
  onDragCancel: () => void;
  disabled?: boolean;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = React.memo(
  ({
    columnDef,
    documents,
    onDocumentPress,
    onDragStart,
    onDragUpdate,
    onDragEnd,
    onDragCancel,
    disabled,
  }) => {
    const columnRef = useRef<View>(null);
    const { isDragging, draggedDoc, hoveredColumnId, registerColumnLayout } =
      useKanbanDrag();

    const isDropTarget = hoveredColumnId === columnDef.id && isDragging;

    // Register column layout after mount and on layout changes
    const handleLayout = useCallback(() => {
      columnRef.current?.measureInWindow((x, y, width, height) => {
        registerColumnLayout(columnDef.id, { x, y, width, height });
      });
    }, [columnDef.id, registerColumnLayout]);

    // Re-measure when dragging starts (scrolling may have changed positions)
    useEffect(() => {
      if (isDragging) {
        handleLayout();
      }
    }, [isDragging, handleLayout]);

    const renderCard = useCallback(
      ({ item }: { item: DocumentWithTotals }) => (
        <KanbanCard
          document={item}
          onPress={onDocumentPress}
          onDragStart={onDragStart}
          onDragUpdate={onDragUpdate}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
          isDragged={draggedDoc?.id === item.id}
          disabled={disabled}
        />
      ),
      [
        onDocumentPress,
        onDragStart,
        onDragUpdate,
        onDragEnd,
        onDragCancel,
        draggedDoc?.id,
        disabled,
      ]
    );

    const keyExtractor = useCallback(
      (item: DocumentWithTotals) => item.id,
      []
    );

    return (
      <View
        ref={columnRef}
        style={[styles.column, isDropTarget && styles.columnDropTarget]}
        onLayout={handleLayout}
        collapsable={false}
      >
        <View
          style={[
            styles.header,
            { backgroundColor: columnDef.headerBgColor },
          ]}
        >
          <View
            style={[
              styles.headerColorBar,
              { backgroundColor: columnDef.headerColor },
            ]}
          />
          <Text
            style={[styles.headerTitle, { color: columnDef.headerColor }]}
            numberOfLines={1}
          >
            {columnDef.title}
          </Text>
          <View
            style={[
              styles.countBadge,
              { backgroundColor: columnDef.headerColor },
            ]}
          >
            <Text style={styles.countText}>{documents.length}</Text>
          </View>
        </View>

        <FlatList
          data={documents}
          renderItem={renderCard}
          keyExtractor={keyExtractor}
          style={styles.cardList}
          contentContainerStyle={styles.cardListContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isDragging}
        />

        {documents.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>書類なし</Text>
          </View>
        )}
      </View>
    );
  }
);

KanbanColumn.displayName = 'KanbanColumn';

const styles = StyleSheet.create({
  column: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    overflow: 'hidden',
  },
  columnDropTarget: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  headerColorBar: {
    width: 4,
    height: 16,
    borderRadius: 2,
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  countBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  cardList: {
    flex: 1,
  },
  cardListContent: {
    paddingHorizontal: 6,
    paddingBottom: 8,
  },
  emptyState: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
