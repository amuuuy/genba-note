/**
 * BackgroundDesignSection Component
 *
 * Form section for background design selection in PDF output (M20).
 * Allows users to choose between NONE, STRIPE, WAVE, GRID, and DOTS patterns.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FormSection } from '@/components/common/FormSection';
import type { BackgroundDesign } from '@/types/settings';

export interface BackgroundDesignSectionProps {
  /** Current background design */
  value: BackgroundDesign;
  /** Callback when design changes */
  onChange: (value: BackgroundDesign) => void;
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
];

/**
 * Background design selection section with radio options
 */
export const BackgroundDesignSection: React.FC<BackgroundDesignSectionProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <FormSection title="背景デザイン" testID="background-design-section">
      {designOptions.map((option) => {
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
});
