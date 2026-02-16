/**
 * SealSizeSection Component
 *
 * Form section for seal (stamp) size selection in PDF output.
 * Allows users to choose between SMALL, MEDIUM, and LARGE seal sizes.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FormSection } from '@/components/common/FormSection';
import { SEAL_SIZE_OPTIONS } from '@/constants/sealSizeOptions';
import type { SealSize } from '@/types/settings';

export interface SealSizeSectionProps {
  /** Current seal size */
  value: SealSize;
  /** Callback when seal size changes */
  onChange: (value: SealSize) => void;
  /** Whether selection is disabled */
  disabled?: boolean;
}

/**
 * Seal size selection section
 */
export const SealSizeSection: React.FC<SealSizeSectionProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <FormSection title="印鑑サイズ" testID="seal-size-section">
      {SEAL_SIZE_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <Pressable
            key={option.value}
            style={[
              styles.optionRow,
              isSelected && styles.optionRowSelected,
              disabled && styles.optionRowDisabled,
            ]}
            onPress={() => !disabled && onChange(option.value)}
            testID={`seal-size-option-${option.value.toLowerCase()}`}
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
        );
      })}
    </FormSection>
  );
};

SealSizeSection.displayName = 'SealSizeSection';

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
});
