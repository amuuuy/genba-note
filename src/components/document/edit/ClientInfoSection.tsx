/**
 * ClientInfoSection Component
 *
 * Form section for client information (name and address).
 */

import React, { memo, useCallback } from 'react';
import { FormInput, FormSection } from '@/components/common';

export interface ClientInfoSectionProps {
  /** Client name value */
  clientName: string;
  /** Client address value */
  clientAddress: string;
  /** Error messages by field */
  errors: {
    clientName?: string;
    clientAddress?: string;
  };
  /** Callback when a field changes */
  onChange: (field: 'clientName' | 'clientAddress', value: string) => void;
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
  errors,
  onChange,
  disabled = false,
  testID,
}: ClientInfoSectionProps) {
  const handleClientNameChange = useCallback(
    (value: string) => onChange('clientName', value),
    [onChange]
  );

  const handleClientAddressChange = useCallback(
    (value: string) => onChange('clientAddress', value),
    [onChange]
  );

  return (
    <FormSection title="取引先情報" testID={testID}>
      <FormInput
        label="取引先名"
        value={clientName}
        onChangeText={handleClientNameChange}
        error={errors.clientName}
        disabled={disabled}
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
    </FormSection>
  );
}

export const ClientInfoSection = memo(ClientInfoSectionComponent);

ClientInfoSection.displayName = 'ClientInfoSection';
