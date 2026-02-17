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
  Switch,
} from 'react-native';
import type { UnitPrice, TaxRate } from '@/types';
import type { UnitPriceInput } from '@/domain/unitPrice';
import { FormInput } from '@/components/common';

export interface UnitPriceEditorModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Existing unit price (null for new item) */
  unitPrice: UnitPrice | null;
  /** Pre-populated input for new items (e.g. from material research) */
  initialInput?: UnitPriceInput | null;
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
  usePackInput: boolean;
  packQty: string;
  packPrice: string;
}

interface FormErrors {
  name?: string;
  unit?: string;
  defaultPrice?: string;
  packQty?: string;
  packPrice?: string;
}

/**
 * Check if a string represents a valid integer (digits only, no decimals or commas)
 */
function isValidIntegerString(value: string): boolean {
  // Must be non-empty and contain only digits (optionally with leading zeros)
  return /^[0-9]+$/.test(value);
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

  // Validate pack input fields when pack input mode is ON
  if (state.usePackInput) {
    const qtyStr = state.packQty.trim();
    if (!qtyStr) {
      errors.packQty = 'パック数量を入力してください';
    } else if (!isValidIntegerString(qtyStr)) {
      errors.packQty = 'パック数量は整数で入力してください';
    } else {
      const qty = Number(qtyStr);
      if (qty < 1) {
        errors.packQty = 'パック数量は1以上で入力してください';
      }
    }

    const packPriceStr = state.packPrice.trim();
    if (!packPriceStr) {
      errors.packPrice = 'パック価格を入力してください';
    } else if (!isValidIntegerString(packPriceStr)) {
      errors.packPrice = 'パック価格は整数で入力してください';
    } else {
      const packPrice = Number(packPriceStr);
      if (packPrice < 0) {
        errors.packPrice = 'パック価格は0以上で入力してください';
      } else if (packPrice > 99999999) {
        errors.packPrice = 'パック価格は99,999,999以下にしてください';
      }
    }
  } else {
    // Validate price as integer string (only when pack input is OFF)
    const priceStr = state.defaultPrice.trim();
    if (!priceStr) {
      errors.defaultPrice = '単価を入力してください';
    } else if (!isValidIntegerString(priceStr)) {
      errors.defaultPrice = '単価は整数で入力してください（カンマや小数点は使用できません）';
    } else {
      const price = Number(priceStr);
      if (!Number.isInteger(price) || price < 0) {
        errors.defaultPrice = '単価を入力してください（0以上の整数）';
      } else if (price > 99999999) {
        errors.defaultPrice = '単価は99,999,999以下にしてください';
      }
    }
  }

  return errors;
}

/**
 * Modal for editing a unit price
 */
export const UnitPriceEditorModal: React.FC<UnitPriceEditorModalProps> = ({
  visible,
  unitPrice,
  initialInput,
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
    usePackInput: false,
    packQty: '',
    packPrice: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Reset form when modal opens/closes or unitPrice changes
  useEffect(() => {
    if (visible) {
      if (unitPrice) {
        // Check for pack data using typeof to handle undefined from legacy data
        const hasPackData =
          typeof unitPrice.packQty === 'number' && typeof unitPrice.packPrice === 'number';
        setForm({
          name: unitPrice.name,
          unit: unitPrice.unit,
          defaultPrice: unitPrice.defaultPrice.toString(),
          defaultTaxRate: unitPrice.defaultTaxRate,
          category: unitPrice.category ?? '',
          notes: unitPrice.notes ?? '',
          usePackInput: hasPackData,
          packQty: unitPrice.packQty?.toString() ?? '',
          packPrice: unitPrice.packPrice?.toString() ?? '',
        });
      } else if (initialInput) {
        // Pre-populate from research result (new item with initial values)
        setForm({
          name: initialInput.name,
          unit: initialInput.unit,
          defaultPrice: initialInput.defaultPrice.toString(),
          defaultTaxRate: initialInput.defaultTaxRate,
          category: initialInput.category ?? '',
          notes: initialInput.notes ?? '',
          usePackInput: false,
          packQty: '',
          packPrice: '',
        });
      } else {
        setForm({
          name: '',
          unit: '式',
          defaultPrice: '',
          defaultTaxRate: 10,
          category: '',
          notes: '',
          usePackInput: false,
          packQty: '',
          packPrice: '',
        });
      }
      setErrors({});
    }
  }, [visible, unitPrice, initialInput]);

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

    // Calculate defaultPrice from pack input if pack input mode is ON
    let defaultPrice: number;
    let packQty: number | null = null;
    let packPrice: number | null = null;

    if (form.usePackInput) {
      packQty = Number(form.packQty.trim());
      packPrice = Number(form.packPrice.trim());
      defaultPrice = Math.floor(packPrice / packQty);
    } else {
      defaultPrice = Number(form.defaultPrice.trim());
    }

    const input: UnitPriceInput = {
      name: form.name.trim(),
      unit: form.unit.trim(),
      defaultPrice,
      defaultTaxRate: form.defaultTaxRate,
      category: form.category.trim() || null,
      notes: form.notes.trim() || null,
      packQty,
      packPrice,
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

          {/* Pack input toggle */}
          <View style={styles.packInputToggle}>
            <Text style={styles.packInputLabel}>パック入力</Text>
            <Switch
              value={form.usePackInput}
              onValueChange={(value) => {
                updateField('usePackInput', value);
                if (!value) {
                  // When turning OFF, clear pack fields
                  updateField('packQty', '');
                  updateField('packPrice', '');
                }
              }}
              accessibilityLabel="パック入力を使用"
              testID="unit-price-pack-input-toggle"
            />
          </View>

          {/* Pack input fields (shown when toggle is ON) */}
          {form.usePackInput ? (
            <View style={styles.packInputSection}>
              <FormInput
                label="パック数量"
                value={form.packQty}
                onChangeText={(text) => updateField('packQty', text)}
                error={errors.packQty}
                required
                keyboardType="number-pad"
                placeholder="10"
                testID="unit-price-pack-qty"
              />
              <FormInput
                label="パック価格（円）"
                value={form.packPrice}
                onChangeText={(text) => updateField('packPrice', text)}
                error={errors.packPrice}
                required
                keyboardType="number-pad"
                placeholder="3000"
                testID="unit-price-pack-price"
              />
              {/* Calculated price preview */}
              <View style={styles.calculatedPreview}>
                <Text style={styles.calculatedLabel}>計算結果（単価）</Text>
                <Text style={styles.calculatedValue}>
                  {(() => {
                    const qty = parseInt(form.packQty, 10);
                    const price = parseInt(form.packPrice, 10);
                    if (!isNaN(qty) && !isNaN(price) && qty > 0) {
                      const calculated = Math.floor(price / qty);
                      return `${calculated.toLocaleString()}円/${form.unit || '単位'}`;
                    }
                    return '---';
                  })()}
                </Text>
              </View>
            </View>
          ) : (
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
          )}

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
                  accessibilityRole="radio"
                  accessibilityState={{ selected: form.unit === unit }}
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
                accessibilityLabel="備考"
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
  packInputToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  packInputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  packInputSection: {
    marginBottom: 8,
  },
  calculatedPreview: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  calculatedLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  calculatedValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
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
