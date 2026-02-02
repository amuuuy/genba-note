/**
 * ActionSheetModal Component
 *
 * A bottom sheet style modal for presenting multiple action options.
 * Follows iOS ActionSheet pattern with support for icons and Pro badges.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Individual action option
 */
export interface ActionSheetOption {
  /** Unique identifier for the option */
  id: string;
  /** Main label text */
  label: string;
  /** Optional sublabel/description */
  sublabel?: string;
  /** Ionicons icon name */
  icon: keyof typeof Ionicons.glyphMap;
  /** Icon color (default: #007AFF) */
  iconColor?: string;
  /** Whether the option is disabled */
  disabled?: boolean;
  /** Show Pro badge */
  isPro?: boolean;
}

export interface ActionSheetModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Optional title at the top */
  title?: string;
  /** Array of action options */
  options: ActionSheetOption[];
  /** Called when an option is selected */
  onSelect: (optionId: string) => void;
  /** Called when modal is dismissed */
  onClose: () => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * ActionSheet-style modal for presenting action options
 */
export const ActionSheetModal: React.FC<ActionSheetModalProps> = ({
  visible,
  title,
  options,
  onSelect,
  onClose,
  testID,
}) => {
  const handleOptionPress = (option: ActionSheetOption) => {
    if (!option.disabled) {
      onSelect(option.id);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {title && <Text style={styles.title}>{title}</Text>}

            <View style={styles.optionsContainer}>
              {options.map((option, index) => (
                <Pressable
                  key={option.id}
                  style={[
                    styles.option,
                    option.disabled && styles.optionDisabled,
                    index < options.length - 1 && styles.optionBorder,
                  ]}
                  onPress={() => handleOptionPress(option)}
                  disabled={option.disabled}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ disabled: option.disabled }}
                  testID={`${testID}-option-${option.id}`}
                >
                  <View style={styles.iconContainer}>
                    <Ionicons
                      name={option.icon}
                      size={24}
                      color={option.disabled ? '#C7C7CC' : (option.iconColor || '#007AFF')}
                    />
                  </View>

                  <View style={styles.textContainer}>
                    <View style={styles.labelRow}>
                      <Text
                        style={[
                          styles.label,
                          option.disabled && styles.labelDisabled,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {option.isPro && (
                        <View style={styles.proBadge}>
                          <Text style={styles.proBadgeText}>Pro</Text>
                        </View>
                      )}
                    </View>
                    {option.sublabel && (
                      <Text
                        style={[
                          styles.sublabel,
                          option.disabled && styles.sublabelDisabled,
                        ]}
                      >
                        {option.sublabel}
                      </Text>
                    )}
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={option.disabled ? '#C7C7CC' : '#C7C7CC'}
                  />
                </Pressable>
              ))}
            </View>

            <Pressable
              style={styles.cancelButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="キャンセル"
              testID={`${testID}-cancel`}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </Pressable>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

ActionSheetModal.displayName = 'ActionSheetModal';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  sheet: {
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  optionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 8,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 17,
    fontWeight: '400',
    color: '#000',
  },
  labelDisabled: {
    color: '#8E8E93',
  },
  sublabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  sublabelDisabled: {
    color: '#C7C7CC',
  },
  proBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
});
