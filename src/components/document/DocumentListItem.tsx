/**
 * DocumentListItem Component
 *
 * A list item for displaying a document with swipe-to-delete.
 * Shows: documentNo, clientName, issueDate, totalYen, status badge
 */

import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, type GestureResponderEvent } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import type { DocumentWithTotals, DocumentType } from '../../types';
import { DocumentStatusBadge } from './DocumentStatusBadge';

export interface DocumentListItemProps {
  /** Document to display */
  document: DocumentWithTotals;
  /** Callback when item is pressed */
  onPress: (id: string) => void;
  /** Callback when delete action is triggered */
  onDelete: (id: string, clientName: string) => void;
  /** Callback when photo icon is tapped (customerId passed) */
  onPhotoPress?: (customerId: string) => void;
  /** Disable swipe-to-delete (e.g., in read-only mode) */
  disableDelete?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Get document type label in Japanese
 */
function getTypeLabel(type: DocumentType): string {
  return type === 'estimate' ? '見積書' : '請求書';
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

/**
 * Document list item with swipe-to-delete
 */
export const DocumentListItem: React.FC<DocumentListItemProps> = React.memo(
  ({ document, onPress, onDelete, onPhotoPress, disableDelete, testID }) => {
    const swipeableRef = useRef<Swipeable>(null);

    const handlePress = useCallback(() => {
      onPress(document.id);
    }, [document.id, onPress]);

    const handleDelete = useCallback(() => {
      swipeableRef.current?.close();
      onDelete(document.id, document.clientName);
    }, [document.id, document.clientName, onDelete]);

    const handlePhotoPress = useCallback((e: GestureResponderEvent) => {
      e.stopPropagation();
      if (document.customerId && onPhotoPress) {
        onPhotoPress(document.customerId);
      }
    }, [document.customerId, onPhotoPress]);

    const renderRightActions = useCallback(
      (
        _progress: Animated.AnimatedInterpolation<number>,
        dragX: Animated.AnimatedInterpolation<number>
      ) => {
        const scale = dragX.interpolate({
          inputRange: [-80, 0],
          outputRange: [1, 0.5],
          extrapolate: 'clamp',
        });

        return (
          <Pressable
            style={styles.deleteAction}
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel="削除"
          >
            <Animated.View style={{ transform: [{ scale }] }}>
              <Ionicons name="trash-outline" size={24} color="#fff" />
            </Animated.View>
          </Pressable>
        );
      },
      [handleDelete]
    );

    return (
      <Swipeable
        ref={swipeableRef}
        renderRightActions={disableDelete ? undefined : renderRightActions}
        rightThreshold={40}
        overshootRight={false}
        enabled={!disableDelete}
      >
        <Pressable
          style={({ pressed }) => [
            styles.container,
            pressed && styles.containerPressed,
          ]}
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={`${getTypeLabel(document.type)} ${document.documentNo}, ${document.clientName}`}
          testID={testID}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.documentNo}>{document.documentNo}</Text>
              <Text style={styles.typeLabel}>{getTypeLabel(document.type)}</Text>
            </View>
            <DocumentStatusBadge status={document.status} />
          </View>

          <Text style={styles.clientName} numberOfLines={1}>
            {document.clientName}
          </Text>

          <View style={styles.footer}>
            <Text style={styles.issueDate}>{document.issueDate}</Text>
            {document.customerId && onPhotoPress && (
              <Pressable
                onPress={handlePhotoPress}
                style={styles.photoButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="施工写真を開く"
                accessibilityHint="現場写真を管理"
                accessibilityRole="button"
              >
                <Ionicons name="camera-outline" size={18} color="#8E8E93" />
              </Pressable>
            )}
            <Text style={styles.total}>{formatCurrency(document.totalYen)}</Text>
          </View>
        </Pressable>
      </Swipeable>
    );
  }
);

DocumentListItem.displayName = 'DocumentListItem';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  containerPressed: {
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentNo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  typeLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 8,
  },
  clientName: {
    fontSize: 16,
    color: '#333',
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  issueDate: {
    fontSize: 13,
    color: '#8E8E93',
  },
  photoButton: {
    padding: 4,
  },
  total: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
});
