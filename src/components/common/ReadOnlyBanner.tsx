/**
 * ReadOnlyBanner Component
 *
 * A persistent banner displayed at the top of the screen when the app
 * is in read-only mode due to migration failure or database error.
 *
 * Features:
 * - Warning color scheme (amber/yellow)
 * - Retry button to attempt recovery
 * - Loading state during retry
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { getReadOnlyBannerConfig } from './readOnlyBannerConfig';

export interface ReadOnlyBannerProps {
  /** Whether the banner is visible */
  visible: boolean;
  /** Custom message to display (defaults to standard message) */
  message?: string;
  /** Callback when retry button is pressed */
  onRetry?: () => Promise<void>;
  /** Whether a retry is in progress */
  isRetrying?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Read-only mode banner with retry functionality
 */
export const ReadOnlyBanner: React.FC<ReadOnlyBannerProps> = ({
  visible,
  message,
  onRetry,
  isRetrying = false,
  testID,
}) => {
  if (!visible) {
    return null;
  }

  const config = getReadOnlyBannerConfig(message);
  const displayMessage = config.customMessage ?? config.defaultMessage;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          borderBottomColor: config.borderColor,
        },
      ]}
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.content}>
        <Text style={[styles.icon, { color: config.iconColor }]}>⚠️</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: config.textColor }]}>
            {config.title}
          </Text>
          <Text style={[styles.message, { color: config.textColor }]}>
            {displayMessage}
          </Text>
        </View>
        {onRetry && (
          <Pressable
            style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
            onPress={onRetry}
            disabled={isRetrying}
            accessibilityRole="button"
            accessibilityLabel={isRetrying ? config.retryingText : config.retryButtonText}
            accessibilityState={{ disabled: isRetrying }}
          >
            {isRetrying ? (
              <ActivityIndicator size="small" color={config.textColor} />
            ) : (
              <Text style={[styles.retryButtonText, { color: config.textColor }]}>
                {config.retryButtonText}
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
};

ReadOnlyBanner.displayName = 'ReadOnlyBanner';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(133, 100, 4, 0.3)',
    marginLeft: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  retryButtonDisabled: {
    opacity: 0.6,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
