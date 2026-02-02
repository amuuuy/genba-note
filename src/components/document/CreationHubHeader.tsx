/**
 * CreationHubHeader Component
 *
 * Header component for the Creation Hub screen displaying:
 * - App name and sub-copy
 * - Collapsible search bar with icon toggle
 */

import React, { useCallback, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '../common';

export interface CreationHubHeaderProps {
  /** App name to display */
  appName: string;
  /** Sub-copy text below app name */
  subCopy: string;
  /** Whether search bar is expanded */
  showSearchBar: boolean;
  /** Callback when search icon is pressed */
  onSearchPress: () => void;
  /** Current search text */
  searchText: string;
  /** Callback when search text changes */
  onSearchTextChange: (text: string) => void;
  /** Callback to close search bar */
  onSearchClose: () => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Header component with branding and collapsible search
 */
export const CreationHubHeader: React.FC<CreationHubHeaderProps> = ({
  appName,
  subCopy,
  showSearchBar,
  onSearchPress,
  searchText,
  onSearchTextChange,
  onSearchClose,
  testID,
}) => {
  const animatedHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: showSearchBar ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [showSearchBar, animatedHeight]);

  const handleCloseSearch = useCallback(() => {
    onSearchTextChange('');
    onSearchClose();
  }, [onSearchTextChange, onSearchClose]);

  const searchBarHeight = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 52],
  });

  const searchBarOpacity = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.headerRow}>
        <View style={styles.brandingContainer}>
          <Text style={styles.appName}>{appName}</Text>
          <Text style={styles.subCopy}>{subCopy}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.searchIconButton,
            pressed && styles.searchIconButtonPressed,
          ]}
          onPress={showSearchBar ? handleCloseSearch : onSearchPress}
          accessibilityLabel={showSearchBar ? '検索を閉じる' : '書類を検索'}
          accessibilityRole="button"
        >
          <Ionicons
            name={showSearchBar ? 'close' : 'search'}
            size={24}
            color="#8E8E93"
          />
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.searchBarContainer,
          {
            height: searchBarHeight,
            opacity: searchBarOpacity,
          },
        ]}
      >
        {showSearchBar && (
          <SearchBar
            value={searchText}
            onChangeText={onSearchTextChange}
            placeholder="書類を検索..."
            autoFocus
            testID="creation-hub-search-bar"
          />
        )}
      </Animated.View>
    </View>
  );
};

CreationHubHeader.displayName = 'CreationHubHeader';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandingContainer: {
    flex: 1,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  subCopy: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  searchIconButton: {
    padding: 8,
    marginLeft: 12,
    borderRadius: 8,
  },
  searchIconButtonPressed: {
    backgroundColor: '#F2F2F7',
  },
  searchBarContainer: {
    overflow: 'hidden',
    marginTop: 12,
  },
});
