/**
 * Settings Screen
 *
 * Manages company information, bank account, and document numbering settings.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { useSettingsEdit } from '@/hooks/useSettingsEdit';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import { useProStatus } from '@/hooks/useProStatus';
import {
  IssuerInfoSection,
  BankAccountSection,
  NumberingSettingsSection,
  SealImageSection,
  TemplateSelectionSection,
  SealSizeSection,
  BackgroundDesignSection,
} from '@/components/settings';
import type { SettingsFormValues } from '@/domain/settings/types';

export default function SettingsScreen() {
  const {
    state,
    updateField,
    updateSealImage,
    toggleShowContactPerson,
    updateSealSize,
    updateBackgroundDesign,
    updateBackgroundImageUri,
    updateDefaultEstimateTemplateId,
    updateDefaultInvoiceTemplateId,
    save,
    getFormattedNextNumber,
    reload,
  } = useSettingsEdit();

  // Read-only mode state
  const { isReadOnlyMode } = useReadOnlyMode();
  const { isPro } = useProStatus();

  // Form is disabled when saving or in read-only mode
  const isFormDisabled = state.isSaving || isReadOnlyMode;

  const handleSave = useCallback(async () => {
    const success = await save();
    if (success) {
      Alert.alert('保存完了', '設定を保存しました');
    }
  }, [save]);

  // Loading state
  if (state.isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  // Error state with retry
  if (state.errorMessage && !state.isDirty) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{state.errorMessage}</Text>
        <Pressable style={styles.retryButton} onPress={reload}>
          <Text style={styles.retryButtonText}>再読み込み</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Error message during editing */}
        {state.errorMessage && state.isDirty && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{state.errorMessage}</Text>
          </View>
        )}

        {/* Issuer Information Section */}
        <IssuerInfoSection
          companyName={state.values.companyName}
          representativeName={state.values.representativeName}
          address={state.values.address}
          phone={state.values.phone}
          fax={state.values.fax}
          email={state.values.email}
          invoiceNumber={state.values.invoiceNumber}
          contactPerson={state.values.contactPerson}
          showContactPerson={state.values.showContactPerson}
          errors={{
            invoiceNumber: state.errors.invoiceNumber,
          }}
          onChange={(field, value) => updateField(field as keyof SettingsFormValues, value)}
          onToggleShowContactPerson={toggleShowContactPerson}
          disabled={isFormDisabled}
        />

        {/* Seal Image Section */}
        <SealImageSection
          sealImageUri={state.values.sealImageUri}
          onImageChange={updateSealImage}
          disabled={isFormDisabled}
        />

        {/* Seal Size Section */}
        <SealSizeSection
          value={state.values.sealSize}
          onChange={updateSealSize}
          disabled={isFormDisabled}
        />

        {/* Background Design Section */}
        <BackgroundDesignSection
          value={state.values.backgroundDesign}
          onChange={updateBackgroundDesign}
          backgroundImageUri={state.values.backgroundImageUri}
          onBackgroundImageChange={updateBackgroundImageUri}
          disabled={isFormDisabled}
        />

        {/* Bank Account Section */}
        <BankAccountSection
          bankName={state.values.bankName}
          branchName={state.values.branchName}
          accountType={state.values.accountType}
          accountNumber={state.values.accountNumber}
          accountHolderName={state.values.accountHolderName}
          errors={{
            accountNumber: state.errors.accountNumber,
          }}
          onChange={(field, value) => updateField(field as keyof SettingsFormValues, value)}
          disabled={isFormDisabled}
        />

        {/* Numbering Settings Section */}
        <NumberingSettingsSection
          estimatePrefix={state.values.estimatePrefix}
          invoicePrefix={state.values.invoicePrefix}
          nextEstimateFormatted={getFormattedNextNumber('estimate')}
          nextInvoiceFormatted={getFormattedNextNumber('invoice')}
          errors={{
            estimatePrefix: state.errors.estimatePrefix,
            invoicePrefix: state.errors.invoicePrefix,
          }}
          onChange={(field, value) => updateField(field, value)}
          disabled={isFormDisabled}
        />

        {/* Template Selection Section (M21: per-doc-type template selection) */}
        <TemplateSelectionSection
          estimateTemplateId={state.values.defaultEstimateTemplateId}
          invoiceTemplateId={state.values.defaultInvoiceTemplateId}
          onEstimateChange={updateDefaultEstimateTemplateId}
          onInvoiceChange={updateDefaultInvoiceTemplateId}
          disabled={isFormDisabled}
          isPro={isPro}
        />

        {/* Save Button */}
        {state.isDirty && !isReadOnlyMode && (
          <Pressable
            style={[styles.saveButton, state.isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={state.isSaving}
          >
            {state.isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>保存</Text>
            )}
          </Pressable>
        )}

        {/* Links Section */}
        <View style={styles.linkContainer}>
          <Link href="/paywall" asChild>
            <Pressable style={styles.link}>
              <Text style={styles.linkText}>Proプランを見る</Text>
            </Pressable>
          </Link>

          <Link href="/data-handling" asChild>
            <Pressable style={styles.link}>
              <Text style={styles.linkText}>データ取扱説明</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  saveButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  linkContainer: {
    gap: 12,
    alignItems: 'center',
  },
  link: {
    padding: 12,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
  },
});
