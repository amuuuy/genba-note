/**
 * TemplatePickerModal Component
 *
 * Modal for temporarily switching document template and seal size in preview screen.
 * Selection is immediate (no confirm button) and does not persist to settings.
 * Pro templates are shown with a PRO badge and disabled for free users.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { getSelectableTemplateOptions } from '@/constants/templateOptions';
import { SEAL_SIZE_OPTIONS } from '@/constants/sealSizeOptions';
import type { DocumentTemplateId, SealSize } from '@/types/settings';

export interface TemplatePickerModalProps {
  visible: boolean;
  currentTemplateId: DocumentTemplateId;
  onSelect: (templateId: DocumentTemplateId) => void;
  onClose: () => void;
  currentSealSize?: SealSize;
  onSealSizeSelect?: (sealSize: SealSize) => void;
  /** Whether the user has Pro access (defaults to false) */
  isPro?: boolean;
  testID?: string;
}

export const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  visible,
  currentTemplateId,
  onSelect,
  onClose,
  currentSealSize,
  onSealSizeSelect,
  isPro = false,
  testID,
}) => {
  const selectableOptions = getSelectableTemplateOptions(isPro);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      testID={testID}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.dialog} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>スタイルを選択</Text>
          <ScrollView style={styles.optionsList}>
            {selectableOptions.map((option) => {
              const isSelected = currentTemplateId === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionRow,
                    isSelected && styles.optionRowSelected,
                    option.disabled && styles.optionRowDisabled,
                  ]}
                  onPress={() => !option.disabled && onSelect(option.value)}
                  disabled={option.disabled}
                  testID={testID ? `${testID}-option-${option.value.toLowerCase()}` : undefined}
                >
                  <View style={styles.radioOuter}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.optionContent}>
                    <View style={styles.labelRow}>
                      <Text style={[
                        styles.optionLabel,
                        option.disabled && styles.textDisabled,
                      ]}>
                        {option.label}
                      </Text>
                      {option.requiresPro && (
                        <View style={styles.proBadge}>
                          <Text style={styles.proBadgeText}>PRO</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[
                      styles.optionDescription,
                      option.disabled && styles.textDisabled,
                    ]}>
                      {option.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            {/* Seal Size Section */}
            {currentSealSize != null && onSealSizeSelect && (
              <>
                <View style={styles.sectionDivider} />
                <Text style={styles.sectionTitle}>印鑑サイズ</Text>
                <View style={styles.sealSizeRow}>
                  {SEAL_SIZE_OPTIONS.map((option) => {
                    const isSelected = currentSealSize === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        style={[
                          styles.sealSizeChip,
                          isSelected && styles.sealSizeChipSelected,
                        ]}
                        onPress={() => onSealSizeSelect(option.value)}
                        testID={testID ? `${testID}-seal-${option.value.toLowerCase()}` : undefined}
                      >
                        <Text
                          style={[
                            styles.sealSizeChipLabel,
                            isSelected && styles.sealSizeChipLabelSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.sealSizeChipDescription,
                            isSelected && styles.sealSizeChipDescriptionSelected,
                          ]}
                        >
                          {option.description}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>閉じる</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    width: '90%',
    maxWidth: 380,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  optionsList: {
    flexGrow: 0,
  },
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  textDisabled: {
    color: '#999',
  },
  proBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  sealSizeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sealSizeChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  sealSizeChipSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  sealSizeChipLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  sealSizeChipLabelSelected: {
    color: '#007AFF',
  },
  sealSizeChipDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  sealSizeChipDescriptionSelected: {
    color: '#007AFF',
  },
  closeButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});
