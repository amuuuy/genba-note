/**
 * DocumentEditForm Component
 *
 * Main form container for document editing.
 * Composes all form sections and handles disabled state based on status.
 */

import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import type { DocumentType, DocumentStatus, LineItem } from '@/types/document';
import type { LineItemInput } from '@/domain/lineItem/lineItemService';
import type { DocumentFormValues } from '@/hooks/useDocumentEdit';
import type { Customer } from '@/types/customer';
import { FormInput, FormSection } from '@/components/common';
import { ClientInfoSection } from './ClientInfoSection';
import { DocumentDatesSection } from './DocumentDatesSection';
import { LineItemList } from './LineItemList';
import { DocumentTotalsDisplay } from './DocumentTotalsDisplay';
import { StatusTransitionBar } from './StatusTransitionBar';
import { PaidAtModal } from './PaidAtModal';

export interface DocumentEditFormProps {
  /** Form values */
  values: DocumentFormValues;
  /** Line items */
  lineItems: LineItem[];
  /** Current status */
  status: DocumentStatus;
  /** Selected customer ID (null if not linked) */
  customerId: string | null;
  /** Validation errors by field */
  errors: Record<string, string>;
  /** Whether the document is saved (has ID) */
  isSaved: boolean;
  /** Callback when a form field changes */
  onFieldChange: (field: keyof DocumentFormValues, value: string) => void;
  /** Callback when a customer is selected from master */
  onCustomerSelect: (customer: Customer | null) => void;
  /** Callback to add a line item */
  onLineItemAdd: (input: LineItemInput) => boolean;
  /** Callback to update a line item */
  onLineItemUpdate: (id: string, updates: Partial<LineItemInput>) => boolean;
  /** Callback to remove a line item */
  onLineItemRemove: (id: string) => boolean;
  /** Callback when status transition is requested */
  onStatusTransition: (newStatus: DocumentStatus, paidAt?: string) => void;
  /** Callback to register a line item to the unit price list */
  onRegisterToUnitPrice?: (input: LineItemInput) => void | Promise<void>;
  /** Whether form is disabled (e.g., while saving) */
  disabled?: boolean;
  /** Test ID */
  testID?: string;
}

/**
 * Document edit form
 */
function DocumentEditFormComponent({
  values,
  lineItems,
  status,
  customerId,
  errors,
  isSaved,
  onFieldChange,
  onCustomerSelect,
  onLineItemAdd,
  onLineItemUpdate,
  onLineItemRemove,
  onStatusTransition,
  onRegisterToUnitPrice,
  disabled = false,
  testID,
}: DocumentEditFormProps) {
  // Check if paid status - some fields become read-only
  const isPaid = status === 'paid';
  const isFieldsDisabled = disabled || isPaid;

  // PaidAt modal state
  const [showPaidAtModal, setShowPaidAtModal] = React.useState(false);
  const [pendingTransition, setPendingTransition] = React.useState<DocumentStatus | null>(null);

  const handleClientFieldChange = useCallback(
    (field: 'clientName' | 'clientAddress', value: string) => {
      onFieldChange(field, value);
    },
    [onFieldChange]
  );

  const handleDateFieldChange = useCallback(
    (field: 'issueDate' | 'validUntil' | 'dueDate' | 'paidAt', value: string) => {
      onFieldChange(field, value);
    },
    [onFieldChange]
  );

  const handleStatusTransition = useCallback(
    (newStatus: DocumentStatus) => {
      // If transitioning to paid, show paidAt modal first
      if (newStatus === 'paid') {
        setPendingTransition(newStatus);
        setShowPaidAtModal(true);
      } else {
        onStatusTransition(newStatus);
      }
    },
    [onStatusTransition]
  );

  const handlePaidAtConfirm = useCallback(
    (paidAt: string) => {
      setShowPaidAtModal(false);
      if (pendingTransition) {
        onStatusTransition(pendingTransition, paidAt);
        setPendingTransition(null);
      }
    },
    [pendingTransition, onStatusTransition]
  );

  const handlePaidAtCancel = useCallback(() => {
    setShowPaidAtModal(false);
    setPendingTransition(null);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      testID={testID}
    >
      {/* Document type indicator */}
      <View style={styles.typeIndicator}>
        <Text style={styles.typeLabel}>
          {values.type === 'estimate' ? '見積書' : '請求書'}
        </Text>
      </View>

      {/* Paid status notice */}
      {isPaid && (
        <View style={styles.paidNotice}>
          <Text style={styles.paidNoticeText}>
            入金済の書類は編集できません。編集するには下書きまたは送付済に戻してください。
          </Text>
        </View>
      )}

      {/* Client Information */}
      <ClientInfoSection
        clientName={values.clientName}
        clientAddress={values.clientAddress}
        customerId={customerId}
        errors={{
          clientName: errors.clientName,
          clientAddress: errors.clientAddress,
        }}
        onChange={handleClientFieldChange}
        onCustomerSelect={onCustomerSelect}
        disabled={isFieldsDisabled}
      />

      {/* Subject */}
      <FormSection title="件名">
        <FormInput
          label="件名"
          value={values.subject}
          onChangeText={(value) => onFieldChange('subject', value)}
          error={errors.subject}
          disabled={isFieldsDisabled}
          placeholder="例: ○○邸 外壁塗装工事"
        />
      </FormSection>

      {/* Dates */}
      <DocumentDatesSection
        documentType={values.type}
        status={status}
        issueDate={values.issueDate}
        validUntil={values.validUntil}
        dueDate={values.dueDate}
        paidAt={values.paidAt}
        errors={{
          issueDate: errors.issueDate,
          validUntil: errors.validUntil,
          dueDate: errors.dueDate,
          paidAt: errors.paidAt,
        }}
        onChange={handleDateFieldChange}
        disabled={isFieldsDisabled}
      />

      {/* Carried Forward Amount (Invoice only) */}
      {values.type === 'invoice' && (
        <FormSection title="繰越金額">
          <FormInput
            label="繰越金額"
            value={values.carriedForwardAmount}
            onChangeText={(value) => onFieldChange('carriedForwardAmount', value)}
            error={errors.carriedForwardAmount}
            disabled={isFieldsDisabled}
            placeholder="0"
            keyboardType="numeric"
          />
        </FormSection>
      )}

      {/* Line Items */}
      <LineItemList
        lineItems={lineItems}
        onAdd={onLineItemAdd}
        onUpdate={onLineItemUpdate}
        onRemove={onLineItemRemove}
        disabled={isFieldsDisabled}
        error={errors.lineItems}
        onRegisterToUnitPrice={onRegisterToUnitPrice}
      />

      {/* Totals */}
      <DocumentTotalsDisplay
        lineItems={lineItems}
        carriedForwardAmount={
          values.carriedForwardAmount
            ? parseInt(values.carriedForwardAmount, 10)
            : null
        }
      />

      {/* Notes */}
      <FormSection title="備考">
        <FormInput
          label="備考"
          value={values.notes}
          onChangeText={(value) => onFieldChange('notes', value)}
          error={errors.notes}
          disabled={isFieldsDisabled}
          multiline
          placeholder="備考を入力..."
        />
      </FormSection>

      {/* Status Transition (only for saved documents) */}
      {isSaved && (
        <StatusTransitionBar
          documentType={values.type}
          currentStatus={status}
          onTransition={handleStatusTransition}
          disabled={disabled}
        />
      )}

      {/* PaidAt Modal */}
      <PaidAtModal
        visible={showPaidAtModal}
        issueDate={values.issueDate}
        onConfirm={handlePaidAtConfirm}
        onCancel={handlePaidAtCancel}
      />
    </ScrollView>
  );
}

export const DocumentEditForm = memo(DocumentEditFormComponent);

DocumentEditForm.displayName = 'DocumentEditForm';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  typeIndicator: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    marginBottom: 16,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  paidNotice: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  paidNoticeText: {
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
  },
});
