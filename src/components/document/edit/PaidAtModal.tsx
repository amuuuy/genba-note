/**
 * PaidAtModal Component
 *
 * Modal for entering payment date when transitioning to 'paid' status.
 * Validates that paidAt is >= issueDate and <= today.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { DatePickerInput } from '@/components/common';
import { getTodayString, isDateOnOrAfter, isDateOnOrBefore } from '@/utils/dateUtils';

export interface PaidAtModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Issue date (for validation) */
  issueDate: string;
  /** Callback when confirmed with valid date */
  onConfirm: (paidAt: string) => void;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Test ID */
  testID?: string;
}

/**
 * Modal for entering paidAt date
 */
export const PaidAtModal: React.FC<PaidAtModalProps> = ({
  visible,
  issueDate,
  onConfirm,
  onCancel,
  testID,
}) => {
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setPaidAt(getTodayString());
      setError(null);
    }
  }, [visible]);

  const handleDateChange = useCallback(
    (date: string | null) => {
      setPaidAt(date);
      setError(null);

      // Validate
      if (date) {
        const today = getTodayString();
        if (!isDateOnOrAfter(date, issueDate)) {
          setError('入金日は発行日以降の日付を入力してください');
        } else if (!isDateOnOrBefore(date, today)) {
          setError('入金日は今日以前の日付を入力してください');
        }
      }
    },
    [issueDate]
  );

  const handleConfirm = useCallback(() => {
    if (!paidAt) {
      setError('入金日を入力してください');
      return;
    }

    const today = getTodayString();
    if (!isDateOnOrAfter(paidAt, issueDate)) {
      setError('入金日は発行日以降の日付を入力してください');
      return;
    }
    if (!isDateOnOrBefore(paidAt, today)) {
      setError('入金日は今日以前の日付を入力してください');
      return;
    }

    onConfirm(paidAt);
  }, [paidAt, issueDate, onConfirm]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onCancel}
      testID={testID}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.overlayBackground} onPress={onCancel} />
        <View style={styles.dialog}>
          <Text style={styles.title}>入金日を入力</Text>
          <Text style={styles.description}>
            入金済に変更するには入金日を入力してください。
          </Text>

          <View style={styles.inputContainer}>
            <DatePickerInput
              value={paidAt}
              onChange={handleDateChange}
              label="入金日"
              error={error}
              required
            />
          </View>

          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              accessibilityLabel="キャンセル"
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                styles.confirmButton,
                (!paidAt || error) && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!paidAt || !!error}
              accessibilityLabel="確定"
              accessibilityRole="button"
            >
              <Text style={styles.confirmButtonText}>確定</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

PaidAtModal.displayName = 'PaidAtModal';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    width: '90%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  confirmButton: {
    backgroundColor: '#34C759',
  },
  confirmButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
