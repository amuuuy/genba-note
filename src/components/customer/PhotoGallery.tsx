/**
 * PhotoGallery Component
 *
 * Displays a grid of customer photos (before/after work).
 * Includes "Add Photo" placeholder at the end.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CustomerPhoto, PhotoType } from '@/types/customerPhoto';

const COLUMNS = 3;
const SPACING = 8;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - 32 - SPACING * (COLUMNS - 1)) / COLUMNS;

export interface PhotoGalleryProps {
  /** Photos to display */
  photos: CustomerPhoto[];
  /** Photo type label */
  type: PhotoType;
  /** Callback when a photo is pressed */
  onPhotoPress: (photo: CustomerPhoto) => void;
  /** Callback when add button is pressed */
  onAddPress: () => void;
  /** Callback when delete is pressed for a photo */
  onDeletePress?: (photo: CustomerPhoto) => void;
  /** Whether editing is disabled */
  disabled?: boolean;
  /** Test ID */
  testID?: string;
}

/**
 * Get label for photo type
 */
function getTypeLabel(type: PhotoType): string {
  return type === 'before' ? '作業前' : '作業後';
}

/**
 * Photo gallery component
 */
export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  type,
  onPhotoPress,
  onAddPress,
  onDeletePress,
  disabled = false,
  testID,
}) => {
  const typeLabel = getTypeLabel(type);

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.title}>{typeLabel}</Text>

      <View style={styles.grid}>
        {photos.map((photo) => (
          <View key={photo.id} style={styles.photoWrapper}>
            <Pressable
              style={({ pressed }) => [
                styles.photoContainer,
                pressed && styles.photoPressed,
              ]}
              onPress={() => onPhotoPress(photo)}
              accessibilityRole="button"
              accessibilityLabel={`${typeLabel}の写真`}
            >
              <Image
                source={{ uri: photo.uri }}
                style={styles.photo}
                resizeMode="cover"
              />
            </Pressable>
            {!disabled && onDeletePress && (
              <Pressable
                style={styles.deleteButton}
                onPress={() => onDeletePress(photo)}
                accessibilityLabel="写真を削除"
                accessibilityRole="button"
                hitSlop={8}
              >
                <View style={styles.deleteIcon}>
                  <Ionicons name="close" size={12} color="#fff" />
                </View>
              </Pressable>
            )}
          </View>
        ))}

        {!disabled && (
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
            onPress={onAddPress}
            accessibilityRole="button"
            accessibilityLabel={`${typeLabel}の写真を追加`}
          >
            <Ionicons name="camera-outline" size={28} color="#007AFF" />
            <Text style={styles.addText}>追加</Text>
          </Pressable>
        )}
      </View>

      {photos.length === 0 && disabled && (
        <Text style={styles.emptyText}>写真がありません</Text>
      )}
    </View>
  );
};

PhotoGallery.displayName = 'PhotoGallery';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: SPACING,
  },
  photoWrapper: {
    position: 'relative',
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
  },
  photoContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
  },
  photoPressed: {
    opacity: 0.8,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  deleteIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#007AFF',
    backgroundColor: '#F2F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonPressed: {
    opacity: 0.7,
    backgroundColor: '#E8F4FF',
  },
  addText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
});
