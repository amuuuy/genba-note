/**
 * Root Layout
 *
 * Main app layout that:
 * - Initializes Sentry crash reporting at module level
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
import { initializeAuth } from '@/domain/auth';
import { cleanupOrphanedPdfCache } from '@/pdf/pdfGenerationService';
import {
  initializeSentry,
  captureException,
  wrapRootComponent,
} from '@/monitoring';

// Initialize Sentry at module level (before any React rendering)
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (sentryDsn) {
  initializeSentry(sentryDsn);
}

/**
 * Inner layout component that uses ReadOnlyMode context
 */
function RootLayoutContent() {
  const { isReadOnlyMode, isInitialized, migrationError, retryMigrations } =
    useReadOnlyModeContext();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isRevenueCatReady, setIsRevenueCatReady] = useState(false);

  // Cleanup orphaned PDF cache files from previous app crashes
  useEffect(() => {
    cleanupOrphanedPdfCache();
  }, []);

  // Initialize Supabase Anonymous Auth (non-blocking — failure only affects search)
  useEffect(() => {
    if (!isInitialized) return;
    initializeAuth().then((result) => {
      if (!result.success && __DEV__) {
        console.error('Auth init failed:', result.error);
      }
    });
  }, [isInitialized]);

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
  if (__DEV__ && migrationError) {
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
 * Handle errors caught by ErrorBoundary — forward to Sentry
 */
function handleErrorBoundaryError(error: Error, componentStack: string) {
  captureException(error, { componentStack });
}

/**
 * Root layout with ReadOnlyModeProvider
 */
function RootLayout() {
  return (
    <ErrorBoundary onError={handleErrorBoundaryError}>
      <ReadOnlyModeProvider>
        <RootLayoutContent />
      </ReadOnlyModeProvider>
    </ErrorBoundary>
  );
}

export default wrapRootComponent(RootLayout);

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
