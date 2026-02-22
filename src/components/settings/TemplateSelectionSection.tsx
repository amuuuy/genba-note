/**
 * TemplateSelectionSection Component
 *
 * Form section for per-document-type PDF template selection (M21).
 * Two radio groups: estimate template (6 options) + invoice template (6 options).
 * Pro templates are shown with a PRO badge and disabled for free users.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FormSection } from '@/components/common/FormSection';
import { getSelectableTemplateOptions } from '@/constants/templateOptions';
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
  /** Whether selection is disabled (e.g. during save) */
  disabled?: boolean;
  /** Whether the user has Pro access (defaults to false) */
  isPro?: boolean;
}

function TemplateRadioGroup({
  value,
  onChange,
  disabled,
  isPro,
  testIDPrefix,
}: {
  value: DocumentTemplateId;
  onChange: (value: DocumentTemplateId) => void;
  disabled: boolean;
  isPro: boolean;
  testIDPrefix: string;
}) {
  const selectableOptions = getSelectableTemplateOptions(isPro);

  return (
    <>
      {selectableOptions.map((option) => {
        const isSelected = value === option.value;
        const isOptionDisabled = disabled || option.disabled;
        return (
          <Pressable
            key={option.value}
            style={[
              styles.optionRow,
              isSelected && styles.optionRowSelected,
              isOptionDisabled && styles.optionRowDisabled,
            ]}
            onPress={() => !isOptionDisabled && onChange(option.value)}
            testID={`${testIDPrefix}-${option.value.toLowerCase()}`}
            disabled={isOptionDisabled}
          >
            <View style={styles.radioOuter}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
            <View style={styles.optionContent}>
              <View style={styles.labelRow}>
                <Text
                  style={[styles.optionLabel, isOptionDisabled && styles.optionLabelDisabled]}
                >
                  {option.label}
                </Text>
                {option.requiresPro && (
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.optionDescription,
                  isOptionDisabled && styles.optionDescriptionDisabled,
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
  isPro = false,
}) => {
  return (
    <>
      <FormSection title="見積書PDFテンプレート" testID="estimate-template-section">
        <TemplateRadioGroup
          value={estimateTemplateId}
          onChange={onEstimateChange}
          disabled={disabled}
          isPro={isPro}
          testIDPrefix="estimate-template"
        />
      </FormSection>
      <FormSection title="請求書PDFテンプレート" testID="invoice-template-section">
        <TemplateRadioGroup
          value={invoiceTemplateId}
          onChange={onInvoiceChange}
          disabled={disabled}
          isPro={isPro}
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
});
