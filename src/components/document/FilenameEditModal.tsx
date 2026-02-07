/**
 * FilenameEditModal Component (M19)
 *
 * Modal for customizing PDF filename before sharing.
 * Displays a TextInput pre-filled with the default filename.
 * Sanitization is applied at the service layer when the file is actually renamed.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export interface FilenameEditModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Default filename (without .pdf extension) */
  defaultFilename: string;
  /** Called when confirmed with the user-entered filename */
  onConfirm: (filename: string) => void;
  /** Called when cancelled */
  onCancel: () => void;
  /** Test ID */
  testID?: string;
}

/**
 * Modal for editing PDF filename before sharing
 */
export const FilenameEditModal: React.FC<FilenameEditModalProps> = ({
  visible,
  defaultFilename,
  onConfirm,
  onCancel,
  testID,
}) => {
  const [filename, setFilename] = useState(defaultFilename);

  // Reset when modal opens with new default
  useEffect(() => {
    if (visible) {
      setFilename(defaultFilename);
    }
  }, [visible, defaultFilename]);

  const handleConfirm = useCallback(() => {
    onConfirm(filename);
  }, [filename, onConfirm]);

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
          <Text style={styles.title}>ファイル名を編集</Text>
          <Text style={styles.description}>
            PDF共有時のファイル名を入力してください。{'\n'}
            .pdf拡張子は自動で付与されます。
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={filename}
              onChangeText={setFilename}
              placeholder="ファイル名"
              maxLength={100}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
              testID={testID ? `${testID}-input` : undefined}
            />
            <Text style={styles.extensionLabel}>.pdf</Text>
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
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
              accessibilityLabel="共有"
              accessibilityRole="button"
            >
              <Text style={styles.confirmButtonText}>共有</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    color: '#000',
  },
  extensionLabel: {
    fontSize: 16,
    color: '#8E8E93',
    marginLeft: 4,
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
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
