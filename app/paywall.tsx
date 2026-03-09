/**
 * Paywall Screen
 *
 * Displays subscription offerings from RevenueCat, handles purchase/restore,
 * and includes Apple/Google required subscription disclosure text.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import Purchases, {
  type PurchasesPackage,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { restorePurchases } from '@/subscription/subscriptionService';
import { getSubscriptionErrorMessage } from '@/constants/errorMessages';
import {
  FREE_DOCUMENT_LIMIT,
  FREE_CUSTOMER_LIMIT,
  FREE_UNIT_PRICE_LIMIT,
  FREE_PHOTOS_PER_CUSTOMER_LIMIT,
  FREE_AI_SEARCH_DAILY_LIMIT,
} from '@/subscription/freeTierLimitsService';
import { openTermsOfService, openPrivacyPolicy } from '@/utils/legalLinkHandlers';

type OperationType = 'purchase' | 'restore' | null;
type PlanType = 'monthly' | 'annual';

/** Pro feature descriptions shown in the paywall */
const PRO_FEATURES = [
  { icon: '✓', text: '書類作成 無制限', free: `無料: ${FREE_DOCUMENT_LIMIT}件まで` },
  { icon: '✓', text: '顧客登録 無制限', free: `無料: ${FREE_CUSTOMER_LIMIT}件まで` },
  { icon: '✓', text: '単価マスタ 無制限', free: `無料: ${FREE_UNIT_PRICE_LIMIT}件まで` },
  { icon: '✓', text: '作業写真 無制限', free: `無料: ${FREE_PHOTOS_PER_CUSTOMER_LIMIT}枚/顧客` },
  { icon: '✓', text: 'AI価格調査 無制限', free: `無料: ${FREE_AI_SEARCH_DAILY_LIMIT}回/日` },
  { icon: '✓', text: '全テンプレート利用可能', free: '無料: 3テンプレート' },
  { icon: '✓', text: 'PDF出力（透かしなし）', free: '無料: SAMPLE透かし付き' },
  { icon: '✓', text: 'CSVエクスポート', free: '無料: 利用不可' },
  { icon: '✓', text: '収支管理（入力・分析）', free: '無料: 閲覧のみ' },
] as const;

export default function PaywallScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingOperation, setLoadingOperation] = useState<OperationType>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);

  // Fetch offerings from RevenueCat on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchOfferings() {
      try {
        const offerings = await Purchases.getOfferings();
        if (cancelled) return;

        const current = offerings.current;
        if (current) {
          setMonthlyPackage(current.monthly);
          setAnnualPackage(current.annual);
        }
      } catch {
        if (!cancelled) {
          setError('プラン情報の取得に失敗しました。ネットワーク接続を確認してください。');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOfferings(false);
        }
      }
    }

    fetchOfferings();
    return () => { cancelled = true; };
  }, []);

  const selectedPackage = selectedPlan === 'annual' ? annualPackage : monthlyPackage;

  const handlePurchase = useCallback(async () => {
    if (!selectedPackage) {
      setError('プランが選択されていません。');
      return;
    }

    setIsLoading(true);
    setLoadingOperation('purchase');
    setError(null);

    try {
      const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
      const isProActive = customerInfo.entitlements.active['pro']?.isActive === true;

      if (isProActive) {
        Alert.alert(
          '購入完了',
          'Proプランをご購入いただきありがとうございます！すべての機能をお使いいただけます。',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (err: unknown) {
      const purchaseError = err as { code?: PURCHASES_ERROR_CODE; userCancelled?: boolean };

      if (purchaseError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        // User cancelled - no error message needed
        return;
      }

      if (purchaseError.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
        setError('この商品は既に購入済みです。「購入を復元」をお試しください。');
        return;
      }

      if (purchaseError.code === PURCHASES_ERROR_CODE.NETWORK_ERROR) {
        setError('ネットワークエラーが発生しました。接続を確認して再度お試しください。');
        return;
      }

      if (purchaseError.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
        Alert.alert(
          '決済処理中',
          '決済の承認待ちです。承認後に自動的にProプランが有効になります。',
          [{ text: 'OK' }]
        );
        return;
      }

      setError('購入処理中にエラーが発生しました。後でもう一度お試しください。');
    } finally {
      setIsLoading(false);
      setLoadingOperation(null);
    }
  }, [selectedPackage]);

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

  const handleOpenTerms = useCallback(openTermsOfService, []);

  const handleOpenPrivacy = useCallback(openPrivacyPolicy, []);

  const isPurchaseLoading = isLoading && loadingOperation === 'purchase';
  const isRestoreLoading = isLoading && loadingOperation === 'restore';

  // Compute annual savings text
  const annualSavingsText = (() => {
    if (!monthlyPackage || !annualPackage) return null;
    const monthlyAnnualCost = monthlyPackage.product.price * 12;
    const annualCost = annualPackage.product.price;
    if (monthlyAnnualCost <= annualCost) return null;
    const savingsPercent = Math.round(((monthlyAnnualCost - annualCost) / monthlyAnnualCost) * 100);
    return `${savingsPercent}%お得`;
  })();

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ポチッと事務 Pro</Text>
        <Text style={styles.subtitle}>建設業務をもっと効率的に</Text>
      </View>

      {/* Pro Features */}
      <View style={styles.featureList}>
        {PRO_FEATURES.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Text style={styles.featureIcon}>{feature.icon}</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureText}>{feature.text}</Text>
              <Text style={styles.featureFreeText}>{feature.free}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Plan Selection */}
      {isLoadingOfferings ? (
        <View style={styles.offeringsLoading}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.offeringsLoadingText}>プラン情報を取得中...</Text>
        </View>
      ) : (
        <View style={styles.planSection}>
          {/* Annual Plan */}
          {annualPackage && (
            <Pressable
              style={[
                styles.planCard,
                selectedPlan === 'annual' && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan('annual')}
              accessibilityLabel={`年額プラン ${annualPackage.product.priceString}`}
              accessibilityState={{ selected: selectedPlan === 'annual' }}
            >
              <View style={styles.planCardHeader}>
                <View style={[
                  styles.planRadio,
                  selectedPlan === 'annual' && styles.planRadioSelected,
                ]}>
                  {selectedPlan === 'annual' && <View style={styles.planRadioDot} />}
                </View>
                <View style={styles.planInfo}>
                  <View style={styles.planTitleRow}>
                    <Text style={styles.planTitle}>年額プラン</Text>
                    {annualSavingsText && (
                      <View style={styles.savingsBadge}>
                        <Text style={styles.savingsText}>{annualSavingsText}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.planPrice}>{annualPackage.product.priceString}/年</Text>
                  {annualPackage.product.pricePerMonthString && (
                    <Text style={styles.planSubPrice}>
                      月あたり {annualPackage.product.pricePerMonthString}
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          )}

          {/* Monthly Plan */}
          {monthlyPackage && (
            <Pressable
              style={[
                styles.planCard,
                selectedPlan === 'monthly' && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan('monthly')}
              accessibilityLabel={`月額プラン ${monthlyPackage.product.priceString}`}
              accessibilityState={{ selected: selectedPlan === 'monthly' }}
            >
              <View style={styles.planCardHeader}>
                <View style={[
                  styles.planRadio,
                  selectedPlan === 'monthly' && styles.planRadioSelected,
                ]}>
                  {selectedPlan === 'monthly' && <View style={styles.planRadioDot} />}
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planTitle}>月額プラン</Text>
                  <Text style={styles.planPrice}>{monthlyPackage.product.priceString}/月</Text>
                </View>
              </View>
            </Pressable>
          )}

          {/* No offerings available */}
          {!annualPackage && !monthlyPackage && (
            <View style={styles.noOfferings}>
              <Text style={styles.noOfferingsText}>
                現在プラン情報を取得できません。{'\n'}ネットワーク接続を確認してください。
              </Text>
            </View>
          )}
        </View>
      )}

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
        style={[
          styles.purchaseButton,
          (isLoading || !selectedPackage) && styles.buttonDisabled,
        ]}
        onPress={handlePurchase}
        disabled={isLoading || !selectedPackage}
        accessibilityLabel="購入する"
        accessibilityState={{ disabled: isLoading || !selectedPackage }}
      >
        {isPurchaseLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.purchaseButtonText}>
            {selectedPackage
              ? `Proプランに登録（${selectedPackage.product.priceString}）`
              : '購入する'}
          </Text>
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

      {/* Subscription Disclosure (required by Apple/Google) */}
      <View style={styles.disclosureSection}>
        <Text style={styles.disclosureText}>
          {Platform.OS === 'ios'
            ? 'サブスクリプションは、確認時にお客様のiTunesアカウントに請求されます。'
            : 'サブスクリプションは、確認時にお客様のGoogle Playアカウントに請求されます。'}
          サブスクリプションは、現在の期間終了の24時間前までにキャンセルされない限り自動的に更新されます。
          アカウントには、現在の期間終了の24時間以内に更新料金が請求されます。
        </Text>
        <Text style={styles.disclosureText}>
          {Platform.OS === 'ios'
            ? 'サブスクリプションの管理・解約は、購入後にiPhoneの「設定」→「Apple ID」→「サブスクリプション」から行えます。'
            : 'サブスクリプションの管理・解約は、購入後にGoogle Playストアの「お支払いと定期購入」→「定期購入」から行えます。'}
        </Text>
      </View>

      {/* Legal links */}
      <View style={styles.legalLinks}>
        <Pressable onPress={handleOpenTerms} accessibilityRole="link">
          <Text style={styles.legalLinkText}>利用規約</Text>
        </Pressable>
        <Text style={styles.legalSeparator}>|</Text>
        <Pressable onPress={handleOpenPrivacy} accessibilityRole="link">
          <Text style={styles.legalLinkText}>プライバシーポリシー</Text>
        </Pressable>
      </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
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
  },
  featureList: {
    width: '100%',
    maxWidth: 360,
    marginBottom: 24,
    gap: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  featureIcon: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: 'bold',
    marginTop: 2,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  featureFreeText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  offeringsLoading: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  offeringsLoadingText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  planSection: {
    width: '100%',
    maxWidth: 360,
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 16,
  },
  planCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planRadioSelected: {
    borderColor: '#007AFF',
  },
  planRadioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  planInfo: {
    flex: 1,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  planSubPrice: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  savingsBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  noOfferings: {
    padding: 24,
    alignItems: 'center',
  },
  noOfferingsText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
    maxWidth: 360,
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
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  restoreButton: {
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
  disclosureSection: {
    width: '100%',
    maxWidth: 360,
    gap: 8,
    marginBottom: 16,
  },
  disclosureText: {
    fontSize: 11,
    color: '#8E8E93',
    lineHeight: 16,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  legalLinkText: {
    fontSize: 13,
    color: '#007AFF',
  },
  legalSeparator: {
    fontSize: 13,
    color: '#C7C7CC',
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
