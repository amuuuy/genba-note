/**
 * IssuerInfoSection Component
 *
 * Form section for company/issuer information.
 * Includes both public (AsyncStorage) and sensitive (SecureStore) fields.
 */

import React from 'react';
import { FormSection } from '@/components/common/FormSection';
import { FormInput } from '@/components/common/FormInput';

export interface IssuerInfoSectionProps {
  /** Company name */
  companyName: string;
  /** Representative name */
  representativeName: string;
  /** Address */
  address: string;
  /** Phone number */
  phone: string;
  /** Invoice registration number (T + 13 digits) */
  invoiceNumber: string;
  /** Field errors */
  errors: {
    companyName?: string;
    representativeName?: string;
    address?: string;
    phone?: string;
    invoiceNumber?: string;
  };
  /** Callback when field value changes */
  onChange: (field: string, value: string) => void;
  /** Whether fields are disabled */
  disabled?: boolean;
}

/**
 * Issuer information form section
 */
export const IssuerInfoSection: React.FC<IssuerInfoSectionProps> = ({
  companyName,
  representativeName,
  address,
  phone,
  invoiceNumber,
  errors,
  onChange,
  disabled = false,
}) => {
  return (
    <FormSection title="会社情報" testID="issuer-info-section">
      <FormInput
        label="会社名"
        value={companyName}
        onChangeText={(value) => onChange('companyName', value)}
        error={errors.companyName}
        disabled={disabled}
        placeholder="例: 株式会社〇〇建設"
        testID="input-company-name"
        autoCapitalize="none"
      />

      <FormInput
        label="代表者名"
        value={representativeName}
        onChangeText={(value) => onChange('representativeName', value)}
        error={errors.representativeName}
        disabled={disabled}
        placeholder="例: 山田太郎"
        testID="input-representative-name"
        autoCapitalize="none"
      />

      <FormInput
        label="住所"
        value={address}
        onChangeText={(value) => onChange('address', value)}
        error={errors.address}
        disabled={disabled}
        placeholder="例: 東京都渋谷区〇〇1-2-3"
        multiline
        testID="input-address"
      />

      <FormInput
        label="電話番号"
        value={phone}
        onChangeText={(value) => onChange('phone', value)}
        error={errors.phone}
        disabled={disabled}
        placeholder="例: 03-1234-5678"
        keyboardType="phone-pad"
        testID="input-phone"
      />

      <FormInput
        label="インボイス番号"
        value={invoiceNumber}
        onChangeText={(value) => onChange('invoiceNumber', value)}
        error={errors.invoiceNumber}
        disabled={disabled}
        placeholder="例: T1234567890123"
        testID="input-invoice-number"
        autoCapitalize="characters"
      />
    </FormSection>
  );
};

IssuerInfoSection.displayName = 'IssuerInfoSection';
