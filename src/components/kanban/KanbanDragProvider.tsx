/**
 * KanbanDragProvider
 *
 * Context provider for managing drag-and-drop state across the kanban board.
 * Tracks the dragged document, ghost card position, and column hit-testing.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { Animated } from 'react-native';
import type { DocumentWithTotals } from '@/types/document';
import type { KanbanColumnId } from '@/types/kanban';

interface ColumnLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface KanbanDragContextValue {
  isDragging: boolean;
  draggedDoc: DocumentWithTotals | null;
  draggedDocRef: React.MutableRefObject<DocumentWithTotals | null>;
  sourceColumnId: KanbanColumnId | null;
  hoveredColumnId: KanbanColumnId | null;
  ghostX: Animated.Value;
  ghostY: Animated.Value;
  startDrag: (
    doc: DocumentWithTotals,
    sourceColumn: KanbanColumnId,
    pageX: number,
    pageY: number,
    cardWidth: number,
    cardHeight: number
  ) => void;
  updateDrag: (pageX: number, pageY: number) => void;
  endDrag: () => KanbanColumnId | null;
  cancelDrag: () => void;
  registerColumnLayout: (
    columnId: KanbanColumnId,
    layout: ColumnLayout
  ) => void;
  ghostCardSize: { width: number; height: number };
}

const KanbanDragContext = createContext<KanbanDragContextValue | null>(null);

export function useKanbanDrag(): KanbanDragContextValue {
  const ctx = useContext(KanbanDragContext);
  if (!ctx) {
    throw new Error('useKanbanDrag must be used within KanbanDragProvider');
  }
  return ctx;
}

interface KanbanDragProviderProps {
  children: React.ReactNode;
}

export const KanbanDragProvider: React.FC<KanbanDragProviderProps> = ({
  children,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedDoc, setDraggedDoc] = useState<DocumentWithTotals | null>(null);
  const [sourceColumnId, setSourceColumnId] = useState<KanbanColumnId | null>(
    null
  );
  const [hoveredColumnId, setHoveredColumnId] =
    useState<KanbanColumnId | null>(null);
  // Ref for synchronous reads (avoids stale closure in gesture callbacks)
  const hoveredColumnIdRef = useRef<KanbanColumnId | null>(null);
  const draggedDocRef = useRef<DocumentWithTotals | null>(null);
  const ghostCardSizeRef = useRef({ width: 0, height: 0 });
  const [ghostCardSize, setGhostCardSize] = useState({ width: 0, height: 0 });

  const ghostX = useRef(new Animated.Value(0)).current;
  const ghostY = useRef(new Animated.Value(0)).current;

  const columnLayoutsRef = useRef<Map<KanbanColumnId, ColumnLayout>>(
    new Map()
  );

  const registerColumnLayout = useCallback(
    (columnId: KanbanColumnId, layout: ColumnLayout) => {
      columnLayoutsRef.current.set(columnId, layout);
    },
    []
  );

  const hitTestColumn = useCallback(
    (pageX: number, pageY: number): KanbanColumnId | null => {
      for (const [colId, layout] of columnLayoutsRef.current.entries()) {
        if (
          pageX >= layout.x &&
          pageX <= layout.x + layout.width &&
          pageY >= layout.y &&
          pageY <= layout.y + layout.height
        ) {
          return colId;
        }
      }
      return null;
    },
    []
  );

  const startDrag = useCallback(
    (
      doc: DocumentWithTotals,
      sourceCol: KanbanColumnId,
      pageX: number,
      pageY: number,
      cardWidth: number,
      cardHeight: number
    ) => {
      // Set refs synchronously before React state (avoids stale reads in gesture callbacks)
      draggedDocRef.current = doc;
      ghostCardSizeRef.current = { width: cardWidth, height: cardHeight };
      setDraggedDoc(doc);
      setSourceColumnId(sourceCol);
      setGhostCardSize({ width: cardWidth, height: cardHeight });
      ghostX.setValue(pageX - cardWidth / 2);
      ghostY.setValue(pageY - cardHeight / 2);
      setIsDragging(true);
    },
    [ghostX, ghostY]
  );

  const updateDrag = useCallback(
    (pageX: number, pageY: number) => {
      // Read from ref to avoid stale closure on ghostCardSize state
      const size = ghostCardSizeRef.current;
      ghostX.setValue(pageX - size.width / 2);
      ghostY.setValue(pageY - size.height / 2);
      const hovered = hitTestColumn(pageX, pageY);
      hoveredColumnIdRef.current = hovered;
      setHoveredColumnId(hovered);
    },
    [ghostX, ghostY, hitTestColumn]
  );

  const endDrag = useCallback((): KanbanColumnId | null => {
    // Read from ref for synchronous accuracy (state may be stale in gesture callbacks)
    const target = hoveredColumnIdRef.current;
    setIsDragging(false);
    setDraggedDoc(null);
    setSourceColumnId(null);
    setHoveredColumnId(null);
    hoveredColumnIdRef.current = null;
    draggedDocRef.current = null;
    return target;
  }, []);

  const cancelDrag = useCallback(() => {
    setIsDragging(false);
    setDraggedDoc(null);
    setSourceColumnId(null);
    setHoveredColumnId(null);
    hoveredColumnIdRef.current = null;
    draggedDocRef.current = null;
  }, []);

  const contextValue = useMemo(
    () => ({
      isDragging,
      draggedDoc,
      draggedDocRef,
      sourceColumnId,
      hoveredColumnId,
      ghostX,
      ghostY,
      startDrag,
      updateDrag,
      endDrag,
      cancelDrag,
      registerColumnLayout,
      ghostCardSize,
    }),
    [
      isDragging,
      draggedDoc,
      sourceColumnId,
      hoveredColumnId,
      ghostX,
      ghostY,
      startDrag,
      updateDrag,
      endDrag,
      cancelDrag,
      registerColumnLayout,
      ghostCardSize,
    ]
  );

  return (
    <KanbanDragContext.Provider value={contextValue}>
      {children}
    </KanbanDragContext.Provider>
  );
};
