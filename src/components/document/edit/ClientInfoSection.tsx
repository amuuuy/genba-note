/**
 * ClientInfoSection Component
 *
 * Form section for client information (name and address).
 * Supports customer selection from master data.
 */

import React, { memo, useCallback, useState } from 'react';
import { FormInput, FormSection } from '@/components/common';
import { CustomerAutoComplete, CustomerSearchModal } from '@/components/customer';
import type { Customer } from '@/types/customer';

export interface ClientInfoSectionProps {
  /** Client name value */
  clientName: string;
  /** Client address value */
  clientAddress: string;
  /** Selected customer ID (null if not linked) */
  customerId: string | null;
  /** Error messages by field */
  errors: {
    clientName?: string;
    clientAddress?: string;
  };
  /** Callback when a field changes */
  onChange: (field: 'clientName' | 'clientAddress', value: string) => void;
  /** Callback when a customer is selected from master */
  onCustomerSelect: (customer: Customer | null) => void;
  /** Whether editing is disabled */
  disabled?: boolean;
  /** Test ID */
  testID?: string;
}

/**
 * Client information form section
 */
function ClientInfoSectionComponent({
  clientName,
  clientAddress,
  customerId,
  errors,
  onChange,
  onCustomerSelect,
  disabled = false,
  testID,
}: ClientInfoSectionProps) {
  const [showSearchModal, setShowSearchModal] = useState(false);

  const handleClientNameChange = useCallback(
    (value: string) => {
      // If user manually types, clear customer link
      if (customerId) {
        onCustomerSelect(null);
      }
      onChange('clientName', value);
    },
    [onChange, customerId, onCustomerSelect]
  );

  const handleClientAddressChange = useCallback(
    (value: string) => {
      // If user manually types, clear customer link
      if (customerId) {
        onCustomerSelect(null);
      }
      onChange('clientAddress', value);
    },
    [onChange, customerId, onCustomerSelect]
  );

  const handleSelectCustomer = useCallback(
    (customer: Customer) => {
      // Update name and address from customer
      onChange('clientName', customer.name);
      onChange('clientAddress', customer.address ?? '');
      onCustomerSelect(customer);
      setShowSearchModal(false);
    },
    [onChange, onCustomerSelect]
  );

  const handleOpenModal = useCallback(() => {
    setShowSearchModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowSearchModal(false);
  }, []);

  return (
    <FormSection title="取引先情報" testID={testID}>
      <CustomerAutoComplete
        value={clientName}
        onChangeText={handleClientNameChange}
        onSelectCustomer={handleSelectCustomer}
        onOpenModal={handleOpenModal}
        disabled={disabled}
        error={errors.clientName}
        required
        placeholder="例: 株式会社○○建設"
        testID="client-name-input"
      />
      <FormInput
        label="取引先住所"
        value={clientAddress}
        onChangeText={handleClientAddressChange}
        error={errors.clientAddress}
        disabled={disabled}
        placeholder="例: 東京都渋谷区○○1-2-3"
        testID="client-address-input"
      />

      <CustomerSearchModal
        visible={showSearchModal}
        onSelect={handleSelectCustomer}
        onCancel={handleCloseModal}
        testID="customer-search-modal"
      />
    </FormSection>
  );
}

export const ClientInfoSection = memo(ClientInfoSectionComponent);

ClientInfoSection.displayName = 'ClientInfoSection';
