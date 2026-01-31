import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';

export default function PaywallScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Proプラン</Text>
      <Text style={styles.subtitle}>すべての機能を使い放題</Text>

      <View style={styles.featureList}>
        <Text style={styles.feature}>PDF出力・共有</Text>
        <Text style={styles.feature}>CSVエクスポート</Text>
      </View>

      <Pressable style={styles.purchaseButton}>
        <Text style={styles.purchaseButtonText}>購入する</Text>
      </Pressable>

      <Pressable style={styles.restoreButton}>
        <Text style={styles.restoreButtonText}>購入を復元</Text>
      </Pressable>

      <Pressable style={styles.closeButton} onPress={() => router.back()}>
        <Text style={styles.closeButtonText}>閉じる</Text>
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
    gap: 8,
  },
  feature: {
    fontSize: 16,
    color: '#333',
  },
  purchaseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  restoreButton: {
    padding: 12,
    marginBottom: 16,
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
});
