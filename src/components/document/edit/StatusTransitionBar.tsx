/**
 * StatusTransitionBar Component
 *
 * Displays buttons for allowed status transitions.
 * Handles the special case of transitioning to 'paid' which requires paidAt.
 */

import React, { memo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DocumentType, DocumentStatus } from '@/types/document';
import { getAllowedTransitions } from '@/domain/document/statusTransitionService';
import { getStatusConfig } from '@/components/document/statusConfig';
import { WarningDialog } from '@/components/common';

export interface StatusTransitionBarProps {
  /** Document type */
  documentType: DocumentType;
  /** Current status */
  currentStatus: DocumentStatus;
  /** Callback when a transition is requested */
  onTransition: (newStatus: DocumentStatus) => void;
  /** Whether transitions are disabled (e.g., while saving) */
  disabled?: boolean;
  /** Test ID */
  testID?: string;
}

/**
 * Get label for status transition button
 */
function getTransitionLabel(targetStatus: DocumentStatus): string {
  switch (targetStatus) {
    case 'draft':
      return '下書きに戻す';
    case 'sent':
      return '送付済に変更';
    case 'paid':
      return '入金済に変更';
    case 'issued':
      return '発行済に変更';
    default:
      return targetStatus;
  }
}

/**
 * Get icon for status transition button
 */
function getTransitionIcon(
  targetStatus: DocumentStatus
): 'arrow-back-outline' | 'send-outline' | 'checkmark-circle-outline' | 'document-text-outline' {
  switch (targetStatus) {
    case 'draft':
      return 'arrow-back-outline';
    case 'sent':
      return 'send-outline';
    case 'paid':
      return 'checkmark-circle-outline';
    case 'issued':
      return 'document-text-outline';
    default:
      return 'send-outline';
  }
}

/**
 * Status transition bar
 */
function StatusTransitionBarComponent({
  documentType,
  currentStatus,
  onTransition,
  disabled = false,
  testID,
}: StatusTransitionBarProps) {
  const [showReversionWarning, setShowReversionWarning] = useState(false);
  const [pendingTargetStatus, setPendingTargetStatus] = useState<DocumentStatus | null>(null);

  const allowedTransitions = getAllowedTransitions(documentType, currentStatus);
  const currentConfig = getStatusConfig(currentStatus);

  const handleTransition = useCallback(
    (targetStatus: DocumentStatus) => {
      if (disabled) return;

      // Show warning when reverting from sent or issued to draft
      if ((currentStatus === 'sent' || currentStatus === 'issued') && targetStatus === 'draft') {
        setPendingTargetStatus(targetStatus);
        setShowReversionWarning(true);
        return;
      }

      onTransition(targetStatus);
    },
    [disabled, onTransition, currentStatus]
  );

  const handleReversionConfirm = useCallback(() => {
    setShowReversionWarning(false);
    if (pendingTargetStatus) {
      onTransition(pendingTargetStatus);
    }
    setPendingTargetStatus(null);
  }, [onTransition, pendingTargetStatus]);

  const handleReversionCancel = useCallback(() => {
    setShowReversionWarning(false);
    setPendingTargetStatus(null);
  }, []);

  if (allowedTransitions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} testID={testID}>
      {/* Current status display */}
      <View style={styles.currentStatus}>
        <Text style={styles.currentStatusLabel}>現在のステータス:</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: currentConfig.backgroundColor },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: currentConfig.textColor },
            ]}
          >
            {currentConfig.label}
          </Text>
        </View>
      </View>

      {/* Transition buttons */}
      <View style={styles.buttonsContainer}>
        {allowedTransitions.map((targetStatus) => {
          const targetConfig = getStatusConfig(targetStatus);
          const label = getTransitionLabel(targetStatus);
          const icon = getTransitionIcon(targetStatus);

          return (
            <Pressable
              key={targetStatus}
              style={[
                styles.transitionButton,
                disabled && styles.transitionButtonDisabled,
              ]}
              onPress={() => handleTransition(targetStatus)}
              disabled={disabled}
              accessibilityLabel={label}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
            >
              <Ionicons
                name={icon}
                size={20}
                color={disabled ? '#C7C7CC' : targetConfig.textColor}
              />
              <Text
                style={[
                  styles.transitionButtonText,
                  disabled && styles.transitionButtonTextDisabled,
                  { color: disabled ? '#C7C7CC' : targetConfig.textColor },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Reversion warning dialog */}
      <WarningDialog
        visible={showReversionWarning}
        title={currentStatus === 'issued' ? '発行済の書類を下書きに戻す' : '送付済の書類を下書きに戻す'}
        message={
          currentStatus === 'issued'
            ? '発行済の書類を下書きに戻すと、発行履歴との整合性が失われる可能性があります。本当に下書きに戻しますか？'
            : '送付済の書類を下書きに戻すと、送付履歴との整合性が失われる可能性があります。本当に下書きに戻しますか？'
        }
        continueText="下書きに戻す"
        cancelText="キャンセル"
        onContinue={handleReversionConfirm}
        onCancel={handleReversionCancel}
        testID="status-reversion-warning"
      />
    </View>
  );
}

export const StatusTransitionBar = memo(StatusTransitionBarComponent);

StatusTransitionBar.displayName = 'StatusTransitionBar';

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  currentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 4,
  },
  currentStatusLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  transitionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transitionButtonDisabled: {
    opacity: 0.6,
  },
  transitionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  transitionButtonTextDisabled: {
    color: '#C7C7CC',
  },
});
