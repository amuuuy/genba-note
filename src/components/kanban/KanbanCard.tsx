/**
 * KanbanCard Component
 *
 * A compact card for the kanban board displaying document summary.
 * Long press (300ms) via RNGH Gesture.Pan activates drag.
 * Tap navigates to document detail.
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { DocumentWithTotals, DocumentType } from '@/types/document';
import { DocumentStatusBadge } from '@/components/document/DocumentStatusBadge';

export interface KanbanCardProps {
  document: DocumentWithTotals;
  onPress: (id: string) => void;
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
  isDragged?: boolean;
  disabled?: boolean;
}

function getTypeLabel(type: DocumentType): string {
  return type === 'estimate' ? '見積' : '請求';
}

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

export const KanbanCard: React.FC<KanbanCardProps> = React.memo(
  ({
    document,
    onPress,
    onDragStart,
    onDragUpdate,
    onDragEnd,
    onDragCancel,
    isDragged,
    disabled,
  }) => {
    const [isPressed, setIsPressed] = useState(false);
    const cardSizeRef = React.useRef({ width: 0, height: 0 });

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      cardSizeRef.current = { width, height };
    }, []);

    const handlePress = useCallback(() => {
      onPress(document.id);
    }, [onPress, document.id]);

    const panGesture = useMemo(
      () =>
        Gesture.Pan()
          .activateAfterLongPress(300)
          .onStart((e) => {
            onDragStart(
              document,
              e.absoluteX,
              e.absoluteY,
              cardSizeRef.current.width,
              cardSizeRef.current.height
            );
          })
          .onUpdate((e) => {
            onDragUpdate(e.absoluteX, e.absoluteY);
          })
          .onEnd((e, success) => {
            if (success) {
              onDragEnd(e.absoluteX, e.absoluteY);
            }
          })
          .onFinalize((_e, success) => {
            if (!success) {
              onDragCancel();
            }
          })
          .enabled(!disabled),
      [document, disabled, onDragStart, onDragUpdate, onDragEnd, onDragCancel]
    );

    // Tap is always enabled — disabled only controls drag, not navigation
    const tapGesture = useMemo(
      () =>
        Gesture.Tap()
          .onBegin(() => {
            setIsPressed(true);
          })
          .onEnd(() => {
            handlePress();
          })
          .onFinalize(() => {
            setIsPressed(false);
          }),
      [handlePress]
    );

    const composedGesture = useMemo(
      () => Gesture.Exclusive(panGesture, tapGesture),
      [panGesture, tapGesture]
    );

    return (
      <GestureDetector gesture={composedGesture}>
        <View
          collapsable={false}
          onLayout={handleLayout}
          style={[
            styles.card,
            isPressed && !isDragged && styles.cardPressed,
            isDragged && styles.cardDragged,
          ]}
        >
          <View style={styles.topRow}>
            <Text style={styles.typeLabel}>{getTypeLabel(document.type)}</Text>
            <DocumentStatusBadge status={document.status} />
          </View>
          <Text style={styles.docNo} numberOfLines={1}>
            {document.documentNo}
          </Text>
          <Text style={styles.clientName} numberOfLines={1}>
            {document.clientName}
          </Text>
          <Text style={styles.amount}>
            {formatCurrency(document.totalYen)}
          </Text>
        </View>
      </GestureDetector>
    );
  }
);

KanbanCard.displayName = 'KanbanCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardPressed: {
    backgroundColor: '#F2F2F7',
  },
  cardDragged: {
    opacity: 0.3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  typeLabel: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '600',
  },
  docNo: {
    fontSize: 11,
    color: '#333',
    fontWeight: '600',
    marginBottom: 1,
  },
  clientName: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  amount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    textAlign: 'right',
  },
});
