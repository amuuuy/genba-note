/**
 * TemplateSelectionSection Component
 *
 * Form section for per-document-type PDF template selection (M21).
 * Two radio groups: estimate template (5 options) + invoice template (5 options).
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FormSection } from '@/components/common/FormSection';
import { TEMPLATE_OPTIONS } from '@/constants/templateOptions';
import type { DocumentTemplateId } from '@/types/settings';

export interface TemplateSelectionSectionProps {
  /** Current estimate template ID */
  estimateTemplateId: DocumentTemplateId;
  /** Current invoice template ID */
  invoiceTemplateId: DocumentTemplateId;
  /** Callback when estimate template changes */
  onEstimateChange: (value: DocumentTemplateId) => void;
  /** Callback when invoice template changes */
  onInvoiceChange: (value: DocumentTemplateId) => void;
  /** Whether selection is disabled */
  disabled?: boolean;
}

function TemplateRadioGroup({
  value,
  onChange,
  disabled,
  testIDPrefix,
}: {
  value: DocumentTemplateId;
  onChange: (value: DocumentTemplateId) => void;
  disabled: boolean;
  testIDPrefix: string;
}) {
  return (
    <>
      {TEMPLATE_OPTIONS.map((option) => {
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
            testID={`${testIDPrefix}-${option.value.toLowerCase()}`}
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
    </>
  );
}

/**
 * Template selection section with estimate + invoice template pickers
 */
export const TemplateSelectionSection: React.FC<TemplateSelectionSectionProps> = ({
  estimateTemplateId,
  invoiceTemplateId,
  onEstimateChange,
  onInvoiceChange,
  disabled = false,
}) => {
  return (
    <>
      <FormSection title="見積書PDFテンプレート" testID="estimate-template-section">
        <TemplateRadioGroup
          value={estimateTemplateId}
          onChange={onEstimateChange}
          disabled={disabled}
          testIDPrefix="estimate-template"
        />
      </FormSection>
      <FormSection title="請求書PDFテンプレート" testID="invoice-template-section">
        <TemplateRadioGroup
          value={invoiceTemplateId}
          onChange={onInvoiceChange}
          disabled={disabled}
          testIDPrefix="invoice-template"
        />
      </FormSection>
    </>
  );
};

TemplateSelectionSection.displayName = 'TemplateSelectionSection';

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
