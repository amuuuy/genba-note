/**
 * DocumentDatesSection Component
 *
 * Form section for document dates.
 * Shows different fields based on document type:
 * - Estimate: issueDate, validUntil
 * - Invoice: issueDate, dueDate, (paidAt when status=paid)
 */

import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { DocumentType, DocumentStatus } from '@/types/document';
import { DatePickerInput, FormSection } from '@/components/common';
import { formatDateForDisplay } from '@/components/common/dateInputHelpers';

export interface DocumentDatesSectionProps {
  /** Document type */
  documentType: DocumentType;
  /** Current status */
  status: DocumentStatus;
  /** Issue date value */
  issueDate: string;
  /** Valid until date (estimate only) */
  validUntil: string;
  /** Due date (invoice only) */
  dueDate: string;
  /** Paid at date (invoice, paid status only) */
  paidAt: string;
  /** Error messages by field */
  errors: {
    issueDate?: string;
    validUntil?: string;
    dueDate?: string;
    paidAt?: string;
  };
  /** Callback when a field changes */
  onChange: (field: 'issueDate' | 'validUntil' | 'dueDate' | 'paidAt', value: string) => void;
  /** Whether editing is disabled */
  disabled?: boolean;
  /** Test ID */
  testID?: string;
}

/**
 * Document dates form section
 */
function DocumentDatesSectionComponent({
  documentType,
  status,
  issueDate,
  validUntil,
  dueDate,
  paidAt,
  errors,
  onChange,
  disabled = false,
  testID,
}: DocumentDatesSectionProps) {
  const handleIssueDateChange = useCallback(
    (date: string | null) => onChange('issueDate', date ?? ''),
    [onChange]
  );

  const handleValidUntilChange = useCallback(
    (date: string | null) => onChange('validUntil', date ?? ''),
    [onChange]
  );

  const handleDueDateChange = useCallback(
    (date: string | null) => onChange('dueDate', date ?? ''),
    [onChange]
  );

  const isEstimate = documentType === 'estimate';
  const isPaid = status === 'paid';

  return (
    <FormSection title="日付" testID={testID}>
      <DatePickerInput
        label="発行日"
        value={issueDate || null}
        onChange={handleIssueDateChange}
        error={errors.issueDate}
        disabled={disabled}
        required
        testID="issue-date-input"
      />

      {isEstimate ? (
        <DatePickerInput
          label="有効期限"
          value={validUntil || null}
          onChange={handleValidUntilChange}
          error={errors.validUntil}
          disabled={disabled}
          testID="valid-until-input"
        />
      ) : (
        <>
          <DatePickerInput
            label="支払期限"
            value={dueDate || null}
            onChange={handleDueDateChange}
            error={errors.dueDate}
            disabled={disabled}
            required
            testID="due-date-input"
          />
          {isPaid && paidAt && (
            <View style={styles.paidAtDisplay}>
              <Text style={styles.paidAtLabel}>入金日</Text>
              <Text style={styles.paidAtValue}>
                {formatDateForDisplay(paidAt)}
              </Text>
            </View>
          )}
        </>
      )}
    </FormSection>
  );
}

export const DocumentDatesSection = memo(DocumentDatesSectionComponent);

DocumentDatesSection.displayName = 'DocumentDatesSection';

const styles = StyleSheet.create({
  paidAtDisplay: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
  },
  paidAtLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  paidAtValue: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: '500',
  },
});
