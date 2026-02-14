/**
 * Balance Screen
 *
 * Displays income/expense management interface with chart visualization.
 * Allows users to add income and expense entries and view trends.
 */

import { useState, useCallback } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import {
  CreateFinanceCardGroup,
  FinanceEntryModal,
  ChartPeriodSelector,
  FinanceSummaryCard,
  FinanceLineChart,
} from '@/components/finance';
import {
  saveFinanceEntry,
  addFinancePhotoRecord,
  type FinanceEntry,
  type FinanceType,
  type ChartPeriod,
} from '@/domain/finance';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import { useProStatus } from '@/hooks/useProStatus';
import { useFinanceChart } from '@/hooks/useFinanceChart';
import { deleteStoredImage } from '@/utils/imageUtils';
import { canCreateFinanceEntry } from '@/subscription/freeTierLimitsService';

export default function BalanceScreen() {
  const { isReadOnlyMode } = useReadOnlyMode();
  const { isPro } = useProStatus();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<FinanceType>('income');
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('monthly');

  // Chart data hook
  const { chartData, isLoading, error, refresh } = useFinanceChart(chartPeriod);

  const handleCreateIncome = useCallback(() => {
    const check = canCreateFinanceEntry(isPro);
    if (!check.allowed) {
      Alert.alert(
        '収支入力はProプラン限定です',
        '無料プランでは収支データの閲覧のみ可能です。\nProプランにアップグレードすると収支の入力ができます。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: 'Proプランを見る', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }
    setModalType('income');
    setModalVisible(true);
  }, [isPro]);

  const handleCreateExpense = useCallback(() => {
    const check = canCreateFinanceEntry(isPro);
    if (!check.allowed) {
      Alert.alert(
        '収支入力はProプラン限定です',
        '無料プランでは収支データの閲覧のみ可能です。\nProプランにアップグレードすると収支の入力ができます。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: 'Proプランを見る', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }
    setModalType('expense');
    setModalVisible(true);
  }, [isPro]);

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

      // Refresh chart data after saving
      await refresh();

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
    [refresh]
  );

  const handlePeriodChange = useCallback((period: ChartPeriod) => {
    setChartPeriod(period);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Create Income/Expense Cards */}
        <CreateFinanceCardGroup
          onCreateIncome={handleCreateIncome}
          onCreateExpense={handleCreateExpense}
          disabled={isReadOnlyMode}
          testID="create-finance-card-group"
        />

        {/* Summary Card */}
        <FinanceSummaryCard
          totalIncome={chartData?.totalIncome ?? 0}
          totalExpense={chartData?.totalExpense ?? 0}
          currentBalance={chartData?.currentBalance ?? 0}
          testID="finance-summary-card"
        />

        {/* Period Selector */}
        <ChartPeriodSelector
          selectedPeriod={chartPeriod}
          onPeriodChange={handlePeriodChange}
          testID="chart-period-selector"
        />

        {/* Line Chart */}
        <FinanceLineChart
          data={chartData}
          isLoading={isLoading}
          error={error}
          testID="finance-line-chart"
        />
      </ScrollView>

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
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});
