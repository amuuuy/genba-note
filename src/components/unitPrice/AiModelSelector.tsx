/**
 * AiModelSelector Component
 *
 * Segmented control for switching between Gemini Flash and Pro models.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { AiSearchModel } from '@/types/materialResearch';

export interface AiModelSelectorProps {
  /** Currently selected model */
  model: AiSearchModel;
  /** Callback when model changes */
  onChange: (model: AiSearchModel) => void;
  /** Whether selector is disabled (e.g., during search) */
  disabled?: boolean;
  /** Test ID */
  testID?: string;
}

export const AiModelSelector: React.FC<AiModelSelectorProps> = ({
  model,
  onChange,
  disabled = false,
  testID,
}) => {
  return (
    <View style={styles.container} testID={testID}>
      <Pressable
        style={[
          styles.option,
          model === 'FLASH' && styles.optionActive,
          disabled && styles.optionDisabled,
        ]}
        onPress={() => onChange('FLASH')}
        disabled={disabled}
        accessibilityLabel="Flash（高速モード）"
        accessibilityRole="button"
        accessibilityState={{ selected: model === 'FLASH' }}
      >
        <Text style={[styles.optionText, model === 'FLASH' && styles.optionTextActive]}>
          Flash
        </Text>
        <Text style={[styles.optionLabel, model === 'FLASH' && styles.optionLabelActive]}>
          高速
        </Text>
      </Pressable>

      <Pressable
        style={[
          styles.option,
          model === 'PRO' && styles.optionActivePro,
          disabled && styles.optionDisabled,
        ]}
        onPress={() => onChange('PRO')}
        disabled={disabled}
        accessibilityLabel="Pro（高精度モード）"
        accessibilityRole="button"
        accessibilityState={{ selected: model === 'PRO' }}
      >
        <Text style={[styles.optionText, model === 'PRO' && styles.optionTextActivePro]}>
          Pro
        </Text>
        <Text style={[styles.optionLabel, model === 'PRO' && styles.optionLabelActivePro]}>
          高精度
        </Text>
      </Pressable>
    </View>
  );
};

AiModelSelector.displayName = 'AiModelSelector';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 2,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  optionActive: {
    backgroundColor: '#007AFF',
  },
  optionActivePro: {
    backgroundColor: '#8B5CF6',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  optionTextActive: {
    color: '#fff',
  },
  optionTextActivePro: {
    color: '#fff',
  },
  optionLabel: {
    fontSize: 11,
    color: '#8E8E93',
  },
  optionLabelActive: {
    color: 'rgba(255,255,255,0.8)',
  },
  optionLabelActivePro: {
    color: 'rgba(255,255,255,0.8)',
  },
});
