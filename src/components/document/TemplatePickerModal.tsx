/**
 * TemplatePickerModal Component
 *
 * Modal for temporarily switching document template and seal size in preview screen.
 * Selection is immediate (no confirm button) and does not persist to settings.
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
import { TEMPLATE_OPTIONS } from '@/constants/templateOptions';
import { SEAL_SIZE_OPTIONS } from '@/constants/sealSizeOptions';
import type { DocumentTemplateId, SealSize } from '@/types/settings';

export interface TemplatePickerModalProps {
  visible: boolean;
  currentTemplateId: DocumentTemplateId;
  onSelect: (templateId: DocumentTemplateId) => void;
  onClose: () => void;
  currentSealSize?: SealSize;
  onSealSizeSelect?: (sealSize: SealSize) => void;
  testID?: string;
}

export const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  visible,
  currentTemplateId,
  onSelect,
  onClose,
  currentSealSize,
  onSealSizeSelect,
  testID,
}) => {
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
            {TEMPLATE_OPTIONS.map((option) => {
              const isSelected = currentTemplateId === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionRow,
                    isSelected && styles.optionRowSelected,
                  ]}
                  onPress={() => onSelect(option.value)}
                  testID={testID ? `${testID}-option-${option.value.toLowerCase()}` : undefined}
                >
                  <View style={styles.radioOuter}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
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
  optionDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
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
