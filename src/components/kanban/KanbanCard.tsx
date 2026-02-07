/**
 * KanbanCard Component
 *
 * A compact card for the kanban board displaying document summary.
 * Long press (300ms) initiates drag. Tap navigates to document detail.
 */

import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import type { DocumentWithTotals, DocumentType } from '@/types/document';
import { DocumentStatusBadge } from '@/components/document/DocumentStatusBadge';

export interface KanbanCardProps {
  document: DocumentWithTotals;
  onPress: (id: string) => void;
  onLongPressStart: (
    doc: DocumentWithTotals,
    pageX: number,
    pageY: number,
    width: number,
    height: number
  ) => void;
  onPressOut?: () => void;
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
  ({ document, onPress, onLongPressStart, onPressOut, isDragged, disabled }) => {
    const cardRef = useRef<View>(null);

    const handlePress = useCallback(() => {
      onPress(document.id);
    }, [onPress, document.id]);

    const handleLongPress = useCallback(
      (e: { nativeEvent: { pageX: number; pageY: number } }) => {
        if (disabled) return;
        cardRef.current?.measure((_x, _y, width, height, _pageX, _pageY) => {
          onLongPressStart(
            document,
            e.nativeEvent.pageX,
            e.nativeEvent.pageY,
            width,
            height
          );
        });
      },
      [document, onLongPressStart, disabled]
    );

    return (
      <View ref={cardRef} collapsable={false}>
        <Pressable
          style={({ pressed }) => [
            styles.card,
            pressed && !isDragged && styles.cardPressed,
            isDragged && styles.cardDragged,
          ]}
          onPress={handlePress}
          onLongPress={handleLongPress}
          onPressOut={onPressOut}
          delayLongPress={300}
          disabled={isDragged}
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
        </Pressable>
      </View>
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
