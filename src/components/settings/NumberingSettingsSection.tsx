/**
 * NumberingSettingsSection Component
 *
 * Form section for document numbering settings.
 * Includes editable prefixes and read-only next numbers.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FormSection } from '@/components/common/FormSection';
import { FormInput } from '@/components/common/FormInput';

export interface NumberingSettingsSectionProps {
  /** Estimate prefix */
  estimatePrefix: string;
  /** Invoice prefix */
  invoicePrefix: string;
  /** Next estimate number (formatted, e.g., "EST-001") */
  nextEstimateFormatted: string;
  /** Next invoice number (formatted, e.g., "INV-001") */
  nextInvoiceFormatted: string;
  /** Field errors */
  errors: {
    estimatePrefix?: string;
    invoicePrefix?: string;
  };
  /** Callback when field value changes */
  onChange: (field: 'estimatePrefix' | 'invoicePrefix', value: string) => void;
  /** Whether fields are disabled */
  disabled?: boolean;
}

/**
 * Numbering settings form section
 */
export const NumberingSettingsSection: React.FC<NumberingSettingsSectionProps> = ({
  estimatePrefix,
  invoicePrefix,
  nextEstimateFormatted,
  nextInvoiceFormatted,
  errors,
  onChange,
  disabled = false,
}) => {
  return (
    <FormSection title="書類番号設定" testID="numbering-settings-section">
      <FormInput
        label="見積書プレフィックス"
        value={estimatePrefix}
        onChangeText={(value) => onChange('estimatePrefix', value)}
        error={errors.estimatePrefix}
        disabled={disabled}
        required
        placeholder="例: EST-"
        testID="input-estimate-prefix"
        autoCapitalize="characters"
      />

      <View style={styles.nextNumberContainer}>
        <Text style={styles.nextNumberLabel}>次の見積書番号</Text>
        <Text style={styles.nextNumberValue} testID="next-estimate-number">
          {nextEstimateFormatted}
        </Text>
      </View>

      <FormInput
        label="請求書プレフィックス"
        value={invoicePrefix}
        onChangeText={(value) => onChange('invoicePrefix', value)}
        error={errors.invoicePrefix}
        disabled={disabled}
        required
        placeholder="例: INV-"
        testID="input-invoice-prefix"
        autoCapitalize="characters"
      />

      <View style={styles.nextNumberContainer}>
        <Text style={styles.nextNumberLabel}>次の請求書番号</Text>
        <Text style={styles.nextNumberValue} testID="next-invoice-number">
          {nextInvoiceFormatted}
        </Text>
      </View>
    </FormSection>
  );
};

NumberingSettingsSection.displayName = 'NumberingSettingsSection';

const styles = StyleSheet.create({
  nextNumberContainer: {
    marginBottom: 16,
  },
  nextNumberLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  nextNumberValue: {
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#8E8E93',
    minHeight: 44,
    textAlignVertical: 'center',
  },
});
