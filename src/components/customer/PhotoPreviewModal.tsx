/**
 * PhotoPreviewModal Component
 *
 * Full-screen modal for previewing a photo.
 * Supports pinch-to-zoom and delete action.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  Pressable,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CustomerPhoto } from '@/types/customerPhoto';

export interface PhotoPreviewModalProps {
  /** Whether modal is visible */
  visible: boolean;
  /** Photo to preview */
  photo: CustomerPhoto | null;
  /** Callback when close is pressed */
  onClose: () => void;
  /** Callback when delete is pressed (optional) */
  onDelete?: () => void;
  /** Test ID */
  testID?: string;
}

/**
 * Get label for photo type
 */
function getTypeLabel(type: 'before' | 'after'): string {
  return type === 'before' ? '作業前' : '作業後';
}

/**
 * Format timestamp to date string
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * Photo preview modal component
 */
export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  visible,
  photo,
  onClose,
  onDelete,
  testID,
}) => {
  const handleDelete = useCallback(() => {
    onDelete?.();
  }, [onDelete]);

  if (!photo) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      testID={testID}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.container}>
        {/* Header */}
        <SafeAreaView style={styles.header}>
          <Pressable
            style={styles.headerButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="閉じる"
            hitSlop={12}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{getTypeLabel(photo.type)}</Text>
            <Text style={styles.headerDate}>{formatDate(photo.takenAt)}</Text>
          </View>

          {onDelete ? (
            <Pressable
              style={styles.headerButton}
              onPress={handleDelete}
              accessibilityRole="button"
              accessibilityLabel="削除"
              hitSlop={12}
            >
              <Ionicons name="trash-outline" size={24} color="#FF3B30" />
            </Pressable>
          ) : (
            <View style={styles.headerButton} />
          )}
        </SafeAreaView>

        {/* Photo */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: photo.uri }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      </View>
    </Modal>
  );
};

PhotoPreviewModal.displayName = 'PhotoPreviewModal';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
