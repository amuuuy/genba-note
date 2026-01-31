/**
 * BankAccountSection Component
 *
 * Form section for bank account information.
 * All fields are stored in SecureStore (sensitive data).
 */

import React from 'react';
import { FormSection } from '@/components/common/FormSection';
import { FormInput } from '@/components/common/FormInput';
import { AccountTypePicker } from './AccountTypePicker';

export interface BankAccountSectionProps {
  /** Bank name */
  bankName: string;
  /** Branch name */
  branchName: string;
  /** Account type */
  accountType: '普通' | '当座' | '';
  /** Account number (7 digits) */
  accountNumber: string;
  /** Account holder name */
  accountHolderName: string;
  /** Field errors */
  errors: {
    bankName?: string;
    branchName?: string;
    accountType?: string;
    accountNumber?: string;
    accountHolderName?: string;
  };
  /** Callback when field value changes */
  onChange: (field: string, value: string) => void;
  /** Whether fields are disabled */
  disabled?: boolean;
}

/**
 * Bank account form section
 */
export const BankAccountSection: React.FC<BankAccountSectionProps> = ({
  bankName,
  branchName,
  accountType,
  accountNumber,
  accountHolderName,
  errors,
  onChange,
  disabled = false,
}) => {
  return (
    <FormSection title="振込先口座" testID="bank-account-section">
      <FormInput
        label="銀行名"
        value={bankName}
        onChangeText={(value) => onChange('bankName', value)}
        error={errors.bankName}
        disabled={disabled}
        placeholder="例: 〇〇銀行"
        testID="input-bank-name"
        autoCapitalize="none"
      />

      <FormInput
        label="支店名"
        value={branchName}
        onChangeText={(value) => onChange('branchName', value)}
        error={errors.branchName}
        disabled={disabled}
        placeholder="例: 渋谷支店"
        testID="input-branch-name"
        autoCapitalize="none"
      />

      <AccountTypePicker
        value={accountType}
        onChange={(value) => onChange('accountType', value)}
        error={errors.accountType}
        disabled={disabled}
      />

      <FormInput
        label="口座番号"
        value={accountNumber}
        onChangeText={(value) => onChange('accountNumber', value)}
        error={errors.accountNumber}
        disabled={disabled}
        placeholder="例: 1234567"
        keyboardType="number-pad"
        maxLength={7}
        testID="input-account-number"
      />

      <FormInput
        label="口座名義"
        value={accountHolderName}
        onChangeText={(value) => onChange('accountHolderName', value)}
        error={errors.accountHolderName}
        disabled={disabled}
        placeholder="例: カ）〇〇ケンセツ"
        testID="input-account-holder-name"
        autoCapitalize="none"
      />
    </FormSection>
  );
};

BankAccountSection.displayName = 'BankAccountSection';
