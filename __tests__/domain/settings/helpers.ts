/**
 * Test helpers for settings domain tests
 */

import type { SettingsFormValues } from '../../../src/domain/settings/types';

/**
 * Creates valid settings form values for testing
 */
export function createValidSettingsFormValues(
  overrides: Partial<SettingsFormValues> = {}
): SettingsFormValues {
  return {
    // AsyncStorage fields
    companyName: '株式会社テスト建設',
    representativeName: '山田太郎',
    address: '東京都渋谷区1-2-3',
    phone: '03-1234-5678',
    fax: '',
    sealImageUri: null,
    estimatePrefix: 'EST-',
    invoicePrefix: 'INV-',
    invoiceTemplateType: 'ACCOUNTING',
    sealSize: 'MEDIUM',
    backgroundDesign: 'NONE',
    backgroundImageUri: null,
    defaultEstimateTemplateId: 'FORMAL_STANDARD',
    defaultInvoiceTemplateId: 'ACCOUNTING',
    // SecureStore fields
    invoiceNumber: 'T1234567890123',
    bankName: 'テスト銀行',
    branchName: '渋谷支店',
    accountType: '普通',
    accountNumber: '1234567',
    accountHolderName: 'カ）テストケンセツ',
    contactPerson: '',
    showContactPerson: true,
    email: '',
    ...overrides,
  };
}

/**
 * Creates empty settings form values for testing
 */
export function createEmptySettingsFormValues(): SettingsFormValues {
  return {
    companyName: '',
    representativeName: '',
    address: '',
    phone: '',
    fax: '',
    sealImageUri: null,
    estimatePrefix: 'EST-',
    invoicePrefix: 'INV-',
    invoiceTemplateType: 'ACCOUNTING',
    sealSize: 'MEDIUM',
    backgroundDesign: 'NONE',
    backgroundImageUri: null,
    defaultEstimateTemplateId: 'FORMAL_STANDARD',
    defaultInvoiceTemplateId: 'ACCOUNTING',
    invoiceNumber: '',
    bankName: '',
    branchName: '',
    accountType: '',
    accountNumber: '',
    accountHolderName: '',
    contactPerson: '',
    showContactPerson: true,
    email: '',
  };
}
