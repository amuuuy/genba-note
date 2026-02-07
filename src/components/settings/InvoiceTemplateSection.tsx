/**
 * InvoiceTemplateSection Component
 *
 * Form section for invoice PDF template selection.
 * Allows users to choose between ACCOUNTING (traditional) and SIMPLE layouts.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FormSection } from '@/components/common/FormSection';
import type { InvoiceTemplateType } from '@/types/settings';

export interface InvoiceTemplateSectionProps {
  /** Current template type */
  value: InvoiceTemplateType;
  /** Callback when template changes */
  onChange: (value: InvoiceTemplateType) => void;
  /** Whether selection is disabled */
  disabled?: boolean;
}

interface TemplateOption {
  value: InvoiceTemplateType;
  label: string;
  description: string;
}

const templateOptions: TemplateOption[] = [
  {
    value: 'ACCOUNTING',
    label: '会計帳票型',
    description: '黒背景ラベル・合計大枠・担当印鑑横並びの日本式会計帳票',
  },
  {
    value: 'SIMPLE',
    label: 'シンプル',
    description: '見積書と同様のシンプルなレイアウト',
  },
];

/**
 * Invoice template selection section
 */
export const InvoiceTemplateSection: React.FC<InvoiceTemplateSectionProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <FormSection title="請求書PDFテンプレート" testID="invoice-template-section">
      {templateOptions.map((option) => {
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
            testID={`template-option-${option.value.toLowerCase()}`}
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

InvoiceTemplateSection.displayName = 'InvoiceTemplateSection';

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
