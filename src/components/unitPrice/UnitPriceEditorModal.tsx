/**
 * UnitPriceEditorModal Component
 *
 * Modal for adding or editing a unit price.
 * Provides form fields for name, unit, price, tax rate, category, and notes.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import type { UnitPrice, TaxRate } from '@/types';
import type { UnitPriceInput } from '@/domain/unitPrice';
import { FormInput } from '@/components/common';

export interface UnitPriceEditorModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Existing unit price (null for new item) */
  unitPrice: UnitPrice | null;
  /** Callback when save is pressed */
  onSave: (input: UnitPriceInput) => void;
  /** Callback when cancel is pressed */
  onCancel: () => void;
  /** Test ID */
  testID?: string;
}

interface FormState {
  name: string;
  unit: string;
  defaultPrice: string;
  defaultTaxRate: TaxRate;
  category: string;
  notes: string;
}

interface FormErrors {
  name?: string;
  unit?: string;
  defaultPrice?: string;
}

/**
 * Validate form state and return errors
 */
function validateForm(state: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!state.name.trim()) {
    errors.name = '品名を入力してください';
  }

  if (!state.unit.trim()) {
    errors.unit = '単位を入力してください';
  }

  const price = parseInt(state.defaultPrice, 10);
  if (!state.defaultPrice || isNaN(price) || price < 0) {
    errors.defaultPrice = '単価を入力してください（0以上の整数）';
  } else if (price > 99999999) {
    errors.defaultPrice = '単価は99,999,999以下にしてください';
  }

  return errors;
}

/**
 * Modal for editing a unit price
 */
export const UnitPriceEditorModal: React.FC<UnitPriceEditorModalProps> = ({
  visible,
  unitPrice,
  onSave,
  onCancel,
  testID,
}) => {
  const isEditing = unitPrice !== null;

  const [form, setForm] = useState<FormState>({
    name: '',
    unit: '式',
    defaultPrice: '',
    defaultTaxRate: 10,
    category: '',
    notes: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Reset form when modal opens/closes or unitPrice changes
  useEffect(() => {
    if (visible) {
      if (unitPrice) {
        setForm({
          name: unitPrice.name,
          unit: unitPrice.unit,
          defaultPrice: unitPrice.defaultPrice.toString(),
          defaultTaxRate: unitPrice.defaultTaxRate,
          category: unitPrice.category ?? '',
          notes: unitPrice.notes ?? '',
        });
      } else {
        setForm({
          name: '',
          unit: '式',
          defaultPrice: '',
          defaultTaxRate: 10,
          category: '',
          notes: '',
        });
      }
      setErrors({});
    }
  }, [visible, unitPrice]);

  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      // Clear error for this field
      if (field in errors) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  const handleSave = useCallback(() => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const defaultPrice = parseInt(form.defaultPrice, 10);

    const input: UnitPriceInput = {
      name: form.name.trim(),
      unit: form.unit.trim(),
      defaultPrice,
      defaultTaxRate: form.defaultTaxRate,
      category: form.category.trim() || null,
      notes: form.notes.trim() || null,
    };

    onSave(input);
  }, [form, onSave]);

  const handleTaxRateChange = useCallback((rate: TaxRate) => {
    updateField('defaultTaxRate', rate);
  }, [updateField]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
      testID={testID}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={onCancel}
            style={styles.headerButton}
            accessibilityLabel="キャンセル"
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>キャンセル</Text>
          </Pressable>
          <Text style={styles.headerTitle}>
            {isEditing ? '単価を編集' : '単価を追加'}
          </Text>
          <Pressable
            onPress={handleSave}
            style={styles.headerButton}
            accessibilityLabel="保存"
            accessibilityRole="button"
          >
            <Text style={styles.saveText}>保存</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Form fields */}
          <FormInput
            label="品名"
            value={form.name}
            onChangeText={(text) => updateField('name', text)}
            error={errors.name}
            required
            placeholder="例: 外壁塗装工事"
            testID="unit-price-name"
          />

          <FormInput
            label="単価（円）"
            value={form.defaultPrice}
            onChangeText={(text) => updateField('defaultPrice', text)}
            error={errors.defaultPrice}
            required
            keyboardType="number-pad"
            placeholder="0"
            testID="unit-price-default-price"
          />

          <FormInput
            label="単位"
            value={form.unit}
            onChangeText={(text) => updateField('unit', text)}
            error={errors.unit}
            required
            placeholder="式"
            testID="unit-price-unit"
          />

          {/* Tax rate selector */}
          <View style={styles.taxRateContainer}>
            <Text style={styles.taxRateLabel}>税率</Text>
            <View style={styles.taxRateButtons}>
              <Pressable
                style={[
                  styles.taxRateButton,
                  form.defaultTaxRate === 10 && styles.taxRateButtonSelected,
                ]}
                onPress={() => handleTaxRateChange(10)}
                accessibilityLabel="10%"
                accessibilityRole="radio"
                accessibilityState={{ selected: form.defaultTaxRate === 10 }}
              >
                <Text
                  style={[
                    styles.taxRateButtonText,
                    form.defaultTaxRate === 10 && styles.taxRateButtonTextSelected,
                  ]}
                >
                  10%
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.taxRateButton,
                  form.defaultTaxRate === 0 && styles.taxRateButtonSelected,
                ]}
                onPress={() => handleTaxRateChange(0)}
                accessibilityLabel="非課税"
                accessibilityRole="radio"
                accessibilityState={{ selected: form.defaultTaxRate === 0 }}
              >
                <Text
                  style={[
                    styles.taxRateButtonText,
                    form.defaultTaxRate === 0 && styles.taxRateButtonTextSelected,
                  ]}
                >
                  非課税
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Common units quick select */}
          <View style={styles.quickSelectContainer}>
            <Text style={styles.quickSelectLabel}>よく使う単位</Text>
            <View style={styles.quickSelectButtons}>
              {['式', 'm', 'm²', 'm³', '人工', '台', '本', '枚'].map((unit) => (
                <Pressable
                  key={unit}
                  style={[
                    styles.quickSelectButton,
                    form.unit === unit && styles.quickSelectButtonSelected,
                  ]}
                  onPress={() => updateField('unit', unit)}
                  accessibilityLabel={unit}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.quickSelectButtonText,
                      form.unit === unit && styles.quickSelectButtonTextSelected,
                    ]}
                  >
                    {unit}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Optional fields */}
          <View style={styles.optionalSection}>
            <Text style={styles.sectionTitle}>任意項目</Text>

            <FormInput
              label="カテゴリ"
              value={form.category}
              onChangeText={(text) => updateField('category', text)}
              placeholder="例: 塗装, 電気, 設備"
              testID="unit-price-category"
            />

            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>備考</Text>
              <TextInput
                style={styles.notesInput}
                value={form.notes}
                onChangeText={(text) => updateField('notes', text)}
                placeholder="メモや補足情報"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                testID="unit-price-notes"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

UnitPriceEditorModal.displayName = 'UnitPriceEditorModal';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  cancelText: {
    fontSize: 17,
    color: '#007AFF',
  },
  saveText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  taxRateContainer: {
    marginBottom: 16,
  },
  taxRateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  taxRateButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  taxRateButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
  },
  taxRateButtonSelected: {
    backgroundColor: '#007AFF',
  },
  taxRateButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  taxRateButtonTextSelected: {
    color: '#fff',
  },
  quickSelectContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  quickSelectLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  quickSelectButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickSelectButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  quickSelectButtonSelected: {
    backgroundColor: '#E3F2FD',
  },
  quickSelectButtonText: {
    fontSize: 14,
    color: '#333',
  },
  quickSelectButtonTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  optionalSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  notesContainer: {
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    color: '#333',
  },
});
