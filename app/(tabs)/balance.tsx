/**
 * Balance Screen
 *
 * Displays income/expense management interface.
 * Allows users to add income and expense entries.
 */

import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CreateFinanceCardGroup, FinanceEntryModal } from '@/components/finance';
import {
  saveFinanceEntry,
  addFinancePhotoRecord,
  type FinanceEntry,
  type FinanceType,
} from '@/domain/finance';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import { deleteStoredImage } from '@/utils/imageUtils';

export default function BalanceScreen() {
  const { isReadOnlyMode } = useReadOnlyMode();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<FinanceType>('income');

  const handleCreateIncome = useCallback(() => {
    setModalType('income');
    setModalVisible(true);
  }, []);

  const handleCreateExpense = useCallback(() => {
    setModalType('expense');
    setModalVisible(true);
  }, []);

  const handleModalCancel = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleModalSave = useCallback(
    async (
      entry: FinanceEntry,
      photos: Array<{ uri: string; originalFilename: string | null }>
    ) => {
      // Save the finance entry first
      const photoIds: string[] = [];
      const entryWithPhotos: FinanceEntry = {
        ...entry,
        photoIds: [], // Will be updated after saving photos
      };

      const result = await saveFinanceEntry(entryWithPhotos);

      if (!result.success) {
        // Clean up temporary photos if entry save failed
        for (const photo of photos) {
          await deleteStoredImage(photo.uri);
        }
        Alert.alert('エラー', result.error?.message ?? '保存に失敗しました');
        return;
      }

      // Save photo records - track failed photos for cleanup
      const failedPhotos: Array<{ uri: string }> = [];
      let photoSaveError: string | null = null;

      for (const photo of photos) {
        const photoResult = await addFinancePhotoRecord({
          financeEntryId: entry.id,
          uri: photo.uri,
          originalFilename: photo.originalFilename,
          addedAt: Date.now(),
        });

        if (photoResult.success && photoResult.data) {
          photoIds.push(photoResult.data.id);
        } else {
          // Track failed photo and error message
          failedPhotos.push({ uri: photo.uri });
          if (!photoSaveError && photoResult.error?.message) {
            photoSaveError = photoResult.error.message;
          }
        }
      }

      // If some photos failed, clean up remaining temp files
      for (const failedPhoto of failedPhotos) {
        await deleteStoredImage(failedPhoto.uri);
      }

      // Update entry with photo IDs if photos were added
      if (photoIds.length > 0) {
        const updatedEntry: FinanceEntry = {
          ...result.data!,
          photoIds,
        };
        await saveFinanceEntry(updatedEntry);
      }

      setModalVisible(false);
      const typeLabel = entry.type === 'income' ? '収入' : '支出';

      // Show appropriate message based on photo save results
      if (failedPhotos.length > 0 && photoIds.length > 0) {
        Alert.alert(
          '一部保存完了',
          `${typeLabel}を保存しましたが、${failedPhotos.length}枚の写真の保存に失敗しました。\n${photoSaveError ?? ''}`
        );
      } else if (failedPhotos.length > 0 && photoIds.length === 0) {
        Alert.alert(
          '保存完了（写真なし）',
          `${typeLabel}を保存しましたが、写真の保存に失敗しました。\n${photoSaveError ?? ''}`
        );
      } else {
        Alert.alert('保存完了', `${typeLabel}を保存しました`);
      }
    },
    []
  );

  return (
    <View style={styles.container}>
      {/* Create Income/Expense Cards */}
      <CreateFinanceCardGroup
        onCreateIncome={handleCreateIncome}
        onCreateExpense={handleCreateExpense}
        disabled={isReadOnlyMode}
        testID="create-finance-card-group"
      />

      {/* Placeholder for future features */}
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>収支管理画面</Text>
        <Text style={styles.hint}>ここに売上集計と入金状況が表示されます</Text>
      </View>

      {/* Finance Entry Modal */}
      <FinanceEntryModal
        visible={modalVisible}
        type={modalType}
        onCancel={handleModalCancel}
        onSave={handleModalSave}
        testID="finance-entry-modal"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
