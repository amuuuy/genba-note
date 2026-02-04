/**
 * Balance Screen
 *
 * Displays income/expense management interface.
 * Allows users to add income and expense entries.
 */

import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CreateFinanceCardGroup, FinanceEntryModal } from '@/components/finance';
import { saveFinanceEntry, type FinanceEntry, type FinanceType } from '@/domain/finance';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';

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

  const handleModalSave = useCallback(async (entry: FinanceEntry) => {
    const result = await saveFinanceEntry(entry);

    if (result.success) {
      setModalVisible(false);
      const typeLabel = entry.type === 'income' ? '収入' : '支出';
      Alert.alert('保存完了', `${typeLabel}を保存しました`);
    } else {
      Alert.alert('エラー', result.error?.message ?? '保存に失敗しました');
    }
  }, []);

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
