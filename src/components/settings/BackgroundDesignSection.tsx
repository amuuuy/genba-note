/**
 * BackgroundDesignSection Component
 *
 * Form section for background design selection in PDF output (M20).
 * Allows users to choose between NONE, STRIPE, WAVE, GRID, DOTS, and IMAGE patterns.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FormSection } from '@/components/common/FormSection';
import type { BackgroundDesign } from '@/types/settings';
import { copyBackgroundImageToPermanentStorage } from '@/utils/imageUtils';

export interface BackgroundDesignSectionProps {
  /** Current background design */
  value: BackgroundDesign;
  /** Callback when design changes */
  onChange: (value: BackgroundDesign) => void;
  /** Background image URI for IMAGE design */
  backgroundImageUri: string | null;
  /** Callback when background image changes */
  onBackgroundImageChange: (uri: string | null) => void;
  /** Whether selection is disabled */
  disabled?: boolean;
}

interface DesignOption {
  value: BackgroundDesign;
  label: string;
  description: string;
}

const designOptions: DesignOption[] = [
  {
    value: 'NONE',
    label: 'なし',
    description: '背景パターンなし（デフォルト）',
  },
  {
    value: 'STRIPE',
    label: 'ストライプ',
    description: '斜めストライプ模様',
  },
  {
    value: 'WAVE',
    label: 'ウェーブ',
    description: '波模様',
  },
  {
    value: 'GRID',
    label: 'グリッド',
    description: '格子模様',
  },
  {
    value: 'DOTS',
    label: 'ドット',
    description: 'ドットパターン',
  },
  {
    value: 'IMAGE',
    label: 'カスタム画像',
    description: '選んだ画像を透かし背景として表示',
  },
];

/**
 * Background design selection section with radio options
 */
export const BackgroundDesignSection: React.FC<BackgroundDesignSectionProps> = ({
  value,
  onChange,
  backgroundImageUri,
  onBackgroundImageChange,
  disabled = false,
}) => {
  const [isImageLoading, setIsImageLoading] = useState(false);

  const handleSelectImage = useCallback(async () => {
    if (disabled || isImageLoading) return;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          '権限エラー',
          '画像を選択するには写真ライブラリへのアクセスを許可してください。'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      setIsImageLoading(true);

      const sourceUri = result.assets[0].uri;

      // Copy to permanent storage (old image cleanup deferred to save)
      const permanentUri = await copyBackgroundImageToPermanentStorage(sourceUri);

      if (permanentUri) {
        onBackgroundImageChange(permanentUri);
      } else {
        Alert.alert('エラー', '画像の保存に失敗しました。');
      }
    } catch (error) {
      if (__DEV__) console.error('Error selecting background image:', error);
      Alert.alert('エラー', '画像の選択に失敗しました。');
    } finally {
      setIsImageLoading(false);
    }
  }, [disabled, isImageLoading, onBackgroundImageChange]);

  const handleRemoveImage = useCallback(async () => {
    if (disabled || isImageLoading || !backgroundImageUri) return;

    Alert.alert(
      '背景画像を削除',
      '背景画像を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            // Only clear URI; actual file cleanup deferred to save success
            onBackgroundImageChange(null);
          },
        },
      ]
    );
  }, [disabled, isImageLoading, backgroundImageUri, onBackgroundImageChange]);

  return (
    <FormSection title="背景デザイン" testID="background-design-section">
      {designOptions.map((option) => {
        const isSelected = value === option.value;
        return (
          <View key={option.value}>
            <Pressable
              style={[
                styles.optionRow,
                isSelected && styles.optionRowSelected,
                disabled && styles.optionRowDisabled,
              ]}
              onPress={() => !disabled && onChange(option.value)}
              testID={`background-design-option-${option.value.toLowerCase()}`}
              disabled={disabled}
            >
              <View style={styles.radioOuter}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
              <View style={styles.optionContent}>
                <Text
                  style={[styles.optionLabel, disabled && styles.optionLabelDisabled]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.optionDescription,
                    disabled && styles.optionDescriptionDisabled,
                  ]}
                >
                  {option.description}
                </Text>
              </View>
            </Pressable>

            {/* Image picker UI shown when IMAGE is selected */}
            {option.value === 'IMAGE' && isSelected && (
              <View style={styles.imageSection}>
                <View style={styles.imagePreviewContainer}>
                  {isImageLoading ? (
                    <View style={styles.imagePlaceholder}>
                      <ActivityIndicator size="large" color="#007AFF" />
                    </View>
                  ) : backgroundImageUri ? (
                    <Image
                      source={{ uri: backgroundImageUri }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>画像未設定</Text>
                    </View>
                  )}
                </View>

                <View style={styles.imageButtonContainer}>
                  <Pressable
                    style={[styles.imageButton, styles.selectButton, disabled && styles.buttonDisabled]}
                    onPress={handleSelectImage}
                    disabled={disabled || isImageLoading}
                  >
                    <Text style={styles.selectButtonText}>
                      {backgroundImageUri ? '画像を変更' : '画像を選択'}
                    </Text>
                  </Pressable>

                  {backgroundImageUri && (
                    <Pressable
                      style={[styles.imageButton, styles.removeButton, disabled && styles.buttonDisabled]}
                      onPress={handleRemoveImage}
                      disabled={disabled || isImageLoading}
                    >
                      <Text style={styles.removeButtonText}>削除</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </View>
        );
      })}
    </FormSection>
  );
};

BackgroundDesignSection.displayName = 'BackgroundDesignSection';

const styles = StyleSheet.create({
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  optionRowSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  optionRowDisabled: {
    opacity: 0.5,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionLabelDisabled: {
    color: '#8E8E93',
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  optionDescriptionDisabled: {
    color: '#AEAEB2',
  },
  imageSection: {
    marginTop: -4,
    marginBottom: 8,
    marginHorizontal: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9F9FB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  imagePreviewContainer: {
    width: 160,
    height: 100,
    alignSelf: 'center',
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 13,
    color: '#999',
  },
  imageButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  imageButton: {
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
