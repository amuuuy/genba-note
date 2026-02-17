/**
 * LineItemEditorModal Component
 *
 * Modal for adding or editing a single line item.
 * Provides form fields for name, quantity, unit, price, and tax rate.
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LineItem, TaxRate } from '@/types/document';
import type { LineItemInput } from '@/domain/lineItem/lineItemService';
import { toQuantityMilli, fromQuantityMilli } from '@/domain/lineItem';
import { FormInput } from '@/components/common';

export interface LineItemEditorModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Existing line item (null for new item) */
  lineItem: LineItem | null;
  /** Pre-populated input for new items (e.g. from material research) */
  initialInput?: LineItemInput | null;
  /** Callback when save is pressed */
  onSave: (input: LineItemInput) => void;
  /** Callback when cancel is pressed */
  onCancel: () => void;
  /** Callback to open unit price picker */
  onOpenUnitPricePicker?: () => void;
  /** Test ID */
  testID?: string;
}

interface FormState {
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  taxRate: TaxRate;
}

interface FormErrors {
  name?: string;
  quantity?: string;
  unit?: string;
  unitPrice?: string;
}

/**
 * Validate form state and return errors
 */
function validateForm(state: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!state.name.trim()) {
    errors.name = '品名を入力してください';
  }

  const quantity = parseFloat(state.quantity);
  if (!state.quantity || isNaN(quantity) || quantity <= 0) {
    errors.quantity = '数量を入力してください（0より大きい値）';
  } else if (quantity > 99999.999) {
    errors.quantity = '数量は99999.999以下にしてください';
  }

  if (!state.unit.trim()) {
    errors.unit = '単位を入力してください';
  }

  const unitPrice = parseInt(state.unitPrice, 10);
  if (!state.unitPrice || isNaN(unitPrice) || unitPrice < 0) {
    errors.unitPrice = '単価を入力してください（0以上の整数）';
  } else if (unitPrice > 99999999) {
    errors.unitPrice = '単価は99,999,999以下にしてください';
  }

  return errors;
}

/**
 * Modal for editing a line item
 */
export const LineItemEditorModal: React.FC<LineItemEditorModalProps> = ({
  visible,
  lineItem,
  initialInput,
  onSave,
  onCancel,
  onOpenUnitPricePicker,
  testID,
}) => {
  const isEditing = lineItem !== null;

  const [form, setForm] = useState<FormState>({
    name: '',
    quantity: '1',
    unit: '式',
    unitPrice: '',
    taxRate: 10,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Reset form when modal opens/closes or lineItem changes
  useEffect(() => {
    if (visible) {
      if (lineItem) {
        setForm({
          name: lineItem.name,
          quantity: fromQuantityMilli(lineItem.quantityMilli).toString(),
          unit: lineItem.unit,
          unitPrice: lineItem.unitPrice.toString(),
          taxRate: lineItem.taxRate,
        });
      } else if (initialInput) {
        // Pre-populate from research result (new item with initial values)
        setForm({
          name: initialInput.name,
          quantity: fromQuantityMilli(initialInput.quantityMilli).toString(),
          unit: initialInput.unit,
          unitPrice: initialInput.unitPrice.toString(),
          taxRate: initialInput.taxRate,
        });
      } else {
        setForm({
          name: '',
          quantity: '1',
          unit: '式',
          unitPrice: '',
          taxRate: 10,
        });
      }
      setErrors({});
    }
  }, [visible, lineItem, initialInput]);

  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      // Clear error for this field
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    []
  );

  const handleSave = useCallback(() => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const quantity = parseFloat(form.quantity);
    const unitPrice = parseInt(form.unitPrice, 10);

    const input: LineItemInput = {
      name: form.name.trim(),
      quantityMilli: toQuantityMilli(quantity),
      unit: form.unit.trim(),
      unitPrice,
      taxRate: form.taxRate,
    };

    onSave(input);
  }, [form, onSave]);

  const handleTaxRateChange = useCallback((rate: TaxRate) => {
    updateField('taxRate', rate);
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
            {isEditing ? '明細を編集' : '明細を追加'}
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
          {/* Unit price picker button */}
          {onOpenUnitPricePicker && !isEditing && (
            <Pressable
              style={styles.unitPricePickerButton}
              onPress={onOpenUnitPricePicker}
              accessibilityLabel="単価表から選択"
              accessibilityRole="button"
            >
              <Ionicons name="list-outline" size={20} color="#007AFF" />
              <Text style={styles.unitPricePickerText}>単価表から選択</Text>
            </Pressable>
          )}

          {/* Form fields */}
          <FormInput
            label="品名"
            value={form.name}
            onChangeText={(text) => updateField('name', text)}
            error={errors.name}
            required
            placeholder="例: 外壁塗装工事"
            testID="line-item-name"
          />

          <FormInput
            label="単価（円）"
            value={form.unitPrice}
            onChangeText={(text) => updateField('unitPrice', text)}
            error={errors.unitPrice}
            required
            keyboardType="number-pad"
            placeholder="0"
            testID="line-item-unit-price"
          />

          <View style={styles.row}>
            <View style={styles.quantityContainer}>
              <FormInput
                label="数量"
                value={form.quantity}
                onChangeText={(text) => updateField('quantity', text)}
                error={errors.quantity}
                required
                keyboardType="decimal-pad"
                placeholder="1"
                testID="line-item-quantity"
              />
            </View>
            <View style={styles.unitContainer}>
              <FormInput
                label="単位"
                value={form.unit}
                onChangeText={(text) => updateField('unit', text)}
                error={errors.unit}
                required
                placeholder="式"
                testID="line-item-unit"
              />
            </View>
          </View>

          {/* Tax rate selector */}
          <View style={styles.taxRateContainer}>
            <Text style={styles.taxRateLabel}>税率</Text>
            <View style={styles.taxRateButtons}>
              <Pressable
                style={[
                  styles.taxRateButton,
                  form.taxRate === 10 && styles.taxRateButtonSelected,
                ]}
                onPress={() => handleTaxRateChange(10)}
                accessibilityLabel="10%"
                accessibilityRole="radio"
                accessibilityState={{ selected: form.taxRate === 10 }}
              >
                <Text
                  style={[
                    styles.taxRateButtonText,
                    form.taxRate === 10 && styles.taxRateButtonTextSelected,
                  ]}
                >
                  10%
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.taxRateButton,
                  form.taxRate === 0 && styles.taxRateButtonSelected,
                ]}
                onPress={() => handleTaxRateChange(0)}
                accessibilityLabel="非課税"
                accessibilityRole="radio"
                accessibilityState={{ selected: form.taxRate === 0 }}
              >
                <Text
                  style={[
                    styles.taxRateButtonText,
                    form.taxRate === 0 && styles.taxRateButtonTextSelected,
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

        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

LineItemEditorModal.displayName = 'LineItemEditorModal';

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
  unitPricePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  unitPricePickerText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  quantityContainer: {
    flex: 1,
  },
  unitContainer: {
    width: 100,
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
});
