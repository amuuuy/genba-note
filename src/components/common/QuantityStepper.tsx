/**
 * QuantityStepper Component
 *
 * A stepper control for adjusting quantity values.
 * Displays "−" / quantity / "＋" buttons for inline editing.
 */

import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MILLI_MULTIPLIER, MIN_QUANTITY_MILLI, MAX_QUANTITY_MILLI } from '@/utils/constants';
import { fromQuantityMilli } from '@/domain/lineItem';

export interface QuantityStepperProps {
  /** Current quantity value (quantityMilli format: 1000 = 1.0) */
  value: number;
  /** Callback when quantity changes */
  onChange: (newValue: number) => void;
  /** Callback when quantity would become 0 (for delete confirmation) */
  onZeroReached?: () => void;
  /** Unit display (shown after quantity) */
  unit?: string;
  /** Whether the stepper is disabled */
  disabled?: boolean;
  /** Test ID */
  testID?: string;
}

/**
 * Format quantity for display (remove trailing zeros)
 */
function formatQuantity(quantityMilli: number): string {
  const quantity = fromQuantityMilli(quantityMilli);
  return quantity.toString();
}

/**
 * Quantity stepper with decrement/increment buttons
 */
function QuantityStepperComponent({
  value,
  onChange,
  onZeroReached,
  unit,
  disabled = false,
  testID,
}: QuantityStepperProps) {
  // Step value: 1.0 (integer increments)
  const step = MILLI_MULTIPLIER;

  const handleDecrement = useCallback(() => {
    if (disabled) return;

    const newValue = value - step;
    if (newValue < MIN_QUANTITY_MILLI) {
      // Would become 0 or negative - trigger delete confirmation
      onZeroReached?.();
    } else {
      onChange(newValue);
    }
  }, [value, step, disabled, onChange, onZeroReached]);

  const handleIncrement = useCallback(() => {
    if (disabled) return;

    const newValue = Math.min(value + step, MAX_QUANTITY_MILLI);
    onChange(newValue);
  }, [value, step, disabled, onChange]);

  const isAtMax = value >= MAX_QUANTITY_MILLI;

  return (
    <View style={styles.container} testID={testID}>
      {/* Decrement button */}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.decrementButton,
          disabled && styles.buttonDisabled,
          pressed && !disabled && styles.buttonPressed,
        ]}
        onPress={handleDecrement}
        disabled={disabled}
        accessibilityLabel="数量を減らす"
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        testID={testID ? `${testID}-decrement` : undefined}
      >
        <Ionicons
          name="remove"
          size={20}
          color={disabled ? '#C7C7CC' : '#FF3B30'}
        />
      </Pressable>

      {/* Quantity display */}
      <View style={styles.valueContainer}>
        <Text
          style={[styles.valueText, disabled && styles.valueTextDisabled]}
          testID={testID ? `${testID}-value` : undefined}
        >
          {formatQuantity(value)}
          {unit && <Text style={styles.unitText}>{unit}</Text>}
        </Text>
      </View>

      {/* Increment button */}
      <Pressable
        style={({ pressed }) => [
          styles.button,
          styles.incrementButton,
          (disabled || isAtMax) && styles.buttonDisabled,
          pressed && !disabled && !isAtMax && styles.buttonPressed,
        ]}
        onPress={handleIncrement}
        disabled={disabled || isAtMax}
        accessibilityLabel="数量を増やす"
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || isAtMax }}
        testID={testID ? `${testID}-increment` : undefined}
      >
        <Ionicons
          name="add"
          size={20}
          color={disabled || isAtMax ? '#C7C7CC' : '#007AFF'}
        />
      </Pressable>
    </View>
  );
}

export const QuantityStepper = memo(QuantityStepperComponent);

QuantityStepper.displayName = 'QuantityStepper';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 2,
  },
  button: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  decrementButton: {
    // Decrement specific styles
  },
  incrementButton: {
    // Increment specific styles
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  valueContainer: {
    minWidth: 48,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  valueText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  valueTextDisabled: {
    color: '#8E8E93',
  },
  unitText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666',
  },
});
