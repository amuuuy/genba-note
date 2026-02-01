/**
 * Paywall Screen
 *
 * Displays subscription purchase/restore options.
 * Handles errors gracefully with user feedback.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { restorePurchases } from '@/subscription/subscriptionService';
import { getSubscriptionErrorMessage } from '@/constants/errorMessages';

type OperationType = 'purchase' | 'restore' | null;

export default function PaywallScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingOperation, setLoadingOperation] = useState<OperationType>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePurchase = useCallback(async () => {
    setIsLoading(true);
    setLoadingOperation('purchase');
    setError(null);

    try {
      // TODO: Implement actual RevenueCat purchase flow
      // For now, show a placeholder alert
      Alert.alert(
        '購入機能',
        'RevenueCat SDKとの統合が必要です。App Store Connectでのプロダクト設定後に実装されます。',
        [{ text: 'OK' }]
      );
    } catch (err) {
      setError('購入処理中にエラーが発生しました。後でもう一度お試しください。');
    } finally {
      setIsLoading(false);
      setLoadingOperation(null);
    }
  }, []);

  const handleRestore = useCallback(async () => {
    setIsLoading(true);
    setLoadingOperation('restore');
    setError(null);

    try {
      const result = await restorePurchases();

      if (result.success && result.data) {
        if (result.data.isProActive) {
          Alert.alert(
            '復元完了',
            'Proプランの購入が復元されました。',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } else {
          Alert.alert(
            '購入が見つかりません',
            '過去のProプラン購入が見つかりませんでした。',
            [{ text: 'OK' }]
          );
        }
      } else {
        const errorMessage = result.error?.code
          ? getSubscriptionErrorMessage(result.error.code)
          : '購入の復元に失敗しました。';
        setError(errorMessage);
      }
    } catch {
      setError('ネットワークエラーが発生しました。接続を確認して再度お試しください。');
    } finally {
      setIsLoading(false);
      setLoadingOperation(null);
    }
  }, []);

  const handleDismissError = useCallback(() => {
    setError(null);
  }, []);

  const isPurchaseLoading = isLoading && loadingOperation === 'purchase';
  const isRestoreLoading = isLoading && loadingOperation === 'restore';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Proプラン</Text>
      <Text style={styles.subtitle}>すべての機能を使い放題</Text>

      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>✓</Text>
          <Text style={styles.feature}>PDF出力・共有</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureIcon}>✓</Text>
          <Text style={styles.feature}>CSVエクスポート</Text>
        </View>
      </View>

      {/* Error display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={handleDismissError} style={styles.dismissButton}>
            <Text style={styles.dismissButtonText}>閉じる</Text>
          </Pressable>
        </View>
      )}

      {/* Purchase button */}
      <Pressable
        style={[styles.purchaseButton, isLoading && styles.buttonDisabled]}
        onPress={handlePurchase}
        disabled={isLoading}
        accessibilityLabel="購入する"
        accessibilityState={{ disabled: isLoading }}
      >
        {isPurchaseLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.purchaseButtonText}>購入する</Text>
        )}
      </Pressable>

      {/* Restore button */}
      <Pressable
        style={[styles.restoreButton, isLoading && styles.buttonDisabled]}
        onPress={handleRestore}
        disabled={isLoading}
        accessibilityLabel="購入を復元"
        accessibilityState={{ disabled: isLoading }}
      >
        {isRestoreLoading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <Text style={styles.restoreButtonText}>購入を復元</Text>
        )}
      </Pressable>

      {/* Close button */}
      <Pressable
        style={styles.closeButton}
        onPress={() => router.back()}
        disabled={isLoading}
        accessibilityLabel="閉じる"
      >
        <Text style={[styles.closeButtonText, isLoading && styles.textDisabled]}>
          閉じる
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  featureList: {
    marginBottom: 32,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureIcon: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: 'bold',
  },
  feature: {
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 14,
    color: '#C62828',
    flex: 1,
    marginRight: 8,
  },
  dismissButton: {
    padding: 4,
  },
  dismissButtonText: {
    fontSize: 12,
    color: '#C62828',
    fontWeight: '600',
  },
  purchaseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  restoreButton: {
    padding: 12,
    marginBottom: 16,
    minWidth: 100,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  closeButton: {
    padding: 12,
  },
  closeButtonText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  textDisabled: {
    opacity: 0.6,
  },
});
