/**
 * SealImageSection Component
 *
 * Form section for company seal (inkan) image upload.
 * Allows users to select, preview, and remove seal images.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FormSection } from '@/components/common/FormSection';
import { copyImageToPermanentStorage, deleteStoredImage } from '@/utils/imageUtils';

export interface SealImageSectionProps {
  /** Current seal image URI */
  sealImageUri: string | null;
  /** Callback when seal image changes */
  onImageChange: (uri: string | null) => void;
  /** Whether fields are disabled */
  disabled?: boolean;
}

/**
 * Seal image form section
 */
export const SealImageSection: React.FC<SealImageSectionProps> = ({
  sealImageUri,
  onImageChange,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectImage = useCallback(async () => {
    if (disabled || isLoading) return;

    try {
      // Request media library permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          '権限エラー',
          '画像を選択するには写真ライブラリへのアクセスを許可してください。'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      setIsLoading(true);

      const sourceUri = result.assets[0].uri;

      // Delete old image if exists
      if (sealImageUri) {
        await deleteStoredImage(sealImageUri);
      }

      // Copy to permanent storage
      const permanentUri = await copyImageToPermanentStorage(sourceUri);

      if (permanentUri) {
        onImageChange(permanentUri);
      } else {
        Alert.alert('エラー', '画像の保存に失敗しました。');
      }
    } catch (error) {
      if (__DEV__) console.error('Error selecting image:', error);
      Alert.alert('エラー', '画像の選択に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [disabled, isLoading, sealImageUri, onImageChange]);

  const handleRemoveImage = useCallback(async () => {
    if (disabled || isLoading || !sealImageUri) return;

    Alert.alert(
      '印影を削除',
      '印影画像を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await deleteStoredImage(sealImageUri);
              onImageChange(null);
            } catch (error) {
              if (__DEV__) console.error('Error removing image:', error);
              Alert.alert('エラー', '画像の削除に失敗しました。');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }, [disabled, isLoading, sealImageUri, onImageChange]);

  return (
    <FormSection title="印影設定" testID="seal-image-section">
      <Text style={styles.description}>
        PDFに表示する会社印（角印）の画像を設定できます。
        {'\n'}推奨: 正方形、透過PNG、200KB以下
      </Text>

      <View style={styles.imageContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : sealImageUri ? (
          <Image source={{ uri: sealImageUri }} style={styles.sealImage} resizeMode="contain" />
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>画像未設定</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, styles.selectButton, disabled && styles.buttonDisabled]}
          onPress={handleSelectImage}
          disabled={disabled || isLoading}
        >
          <Text style={styles.selectButtonText}>
            {sealImageUri ? '画像を変更' : '画像を選択'}
          </Text>
        </Pressable>

        {sealImageUri && (
          <Pressable
            style={[styles.button, styles.removeButton, disabled && styles.buttonDisabled]}
            onPress={handleRemoveImage}
            disabled={disabled || isLoading}
          >
            <Text style={styles.removeButtonText}>削除</Text>
          </Pressable>
        )}
      </View>
    </FormSection>
  );
};

SealImageSection.displayName = 'SealImageSection';

const styles = StyleSheet.create({
  description: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 16,
  },
  imageContainer: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: '#999',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  selectButton: {
    backgroundColor: '#007AFF',
  },
  removeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  removeButtonText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '600',
  },
});
