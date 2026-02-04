/**
 * FinancePhotoSection Component
 *
 * Photo gallery section for finance entries.
 * Displays photos in a 3-column grid with add/delete functionality.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { TempFinancePhotoInfo } from '@/types/financePhoto';

// Photo grid configuration
const COLUMNS = 3;
const SPACING = 8;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - 64 - SPACING * (COLUMNS - 1)) / COLUMNS;

export interface FinancePhotoSectionProps {
  /** Current photos */
  photos: TempFinancePhotoInfo[];
  /** Callback when photo is added */
  onAddPhoto: () => void;
  /** Callback when photo is deleted */
  onDeletePhoto: (tempId: string) => void;
  /** Whether adding photo is in progress */
  isAddingPhoto: boolean;
  /** Whether section is disabled */
  disabled?: boolean;
  /** Test ID */
  testID?: string;
}

/**
 * Photo gallery section for finance entries
 */
export const FinancePhotoSection: React.FC<FinancePhotoSectionProps> = ({
  photos,
  onAddPhoto,
  onDeletePhoto,
  isAddingPhoto,
  disabled = false,
  testID,
}) => {
  const isDisabled = disabled || isAddingPhoto;

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.label}>添付画像</Text>
      <View style={styles.photoGrid}>
        {photos.map((photo) => (
          <View key={photo.tempId} style={styles.photoWrapper}>
            <Image
              source={{ uri: photo.permanentUri }}
              style={styles.photo}
              resizeMode="cover"
            />
            <Pressable
              style={styles.deleteButton}
              onPress={() => onDeletePhoto(photo.tempId)}
              accessibilityLabel="写真を削除"
              accessibilityRole="button"
              hitSlop={8}
              disabled={isDisabled}
            >
              <View style={styles.deleteIcon}>
                <Ionicons name="close" size={12} color="#fff" />
              </View>
            </Pressable>
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
            isDisabled && styles.addButtonDisabled,
          ]}
          onPress={onAddPhoto}
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityLabel="写真を追加"
        >
          {isAddingPhoto ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={28} color="#007AFF" />
              <Text style={styles.addText}>追加</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
};

FinancePhotoSection.displayName = 'FinancePhotoSection';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING,
  },
  photoWrapper: {
    position: 'relative',
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
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
  addButtonDisabled: {
    opacity: 0.5,
  },
  addText: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
});
