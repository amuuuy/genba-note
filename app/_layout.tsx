/**
 * Root Layout
 *
 * Main app layout that:
 * - Wraps app with ReadOnlyModeProvider for migration error handling
 * - Shows ReadOnlyBanner when in read-only mode
 * - Defines navigation stack
 */

import { useState, useCallback, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import {
  ReadOnlyModeProvider,
  useReadOnlyModeContext,
} from '@/contexts/ReadOnlyModeContext';
import { ReadOnlyBanner, ErrorBoundary } from '@/components/common';
import { configureRevenueCat } from '@/subscription';

/**
 * Inner layout component that uses ReadOnlyMode context
 */
function RootLayoutContent() {
  const { isReadOnlyMode, isInitialized, migrationError, retryMigrations } =
    useReadOnlyModeContext();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isRevenueCatReady, setIsRevenueCatReady] = useState(false);

  // Initialize RevenueCat SDK once after migrations complete.
  // Must complete before Stack mounts to prevent child useEffect race conditions.
  useEffect(() => {
    if (!isInitialized || isRevenueCatReady) return;
    const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_PUBLIC_KEY;
    if (!apiKey) {
      setIsRevenueCatReady(true);
      return;
    }
    configureRevenueCat(apiKey).then((result) => {
      if (!result.success && __DEV__) {
        console.error('RevenueCat init failed:', result.error?.code);
      }
      setIsRevenueCatReady(true);
    });
  }, [isInitialized, isRevenueCatReady]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      await retryMigrations();
    } finally {
      setIsRetrying(false);
    }
  }, [retryMigrations]);

  // Show loading while migrations are running or RevenueCat is initializing
  if (!isInitialized || !isRevenueCatReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Log migration error for debugging (not shown to user)
  if (migrationError) {
    console.error('[Migration Error]', migrationError.code, migrationError.message);
  }

  return (
    <View style={styles.container}>
      <ReadOnlyBanner
        visible={isReadOnlyMode}
        onRetry={handleRetry}
        isRetrying={isRetrying}
        testID="read-only-banner"
      />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="document/[id]"
          options={{
            title: '書類編集',
            headerBackTitle: '戻る',
          }}
        />
        <Stack.Screen
          name="document/preview"
          options={{
            title: 'プレビュー',
            headerBackTitle: '戻る',
          }}
        />
        <Stack.Screen
          name="paywall"
          options={{
            title: 'Proプラン',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="data-handling"
          options={{
            title: 'データ取扱説明',
            presentation: 'modal',
          }}
        />
      </Stack>
    </View>
  );
}

/**
 * Root layout with ReadOnlyModeProvider
 */
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ReadOnlyModeProvider>
        <RootLayoutContent />
      </ReadOnlyModeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
