/**
 * SearchBar Component
 *
 * A simple controlled search input with clear button.
 * Debouncing should be handled by the parent hook (e.g., useDocumentFilter).
 */

import React, { useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface SearchBarProps
  extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  /** Current search value */
  value: string;
  /** Callback when search value changes */
  onChangeText: (text: string) => void;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Search bar with icon and clear button (controlled input)
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = '検索...',
  testID,
  ...textInputProps
}) => {
  const handleClear = useCallback(() => {
    onChangeText('');
  }, [onChangeText]);

  return (
    <View style={styles.container} testID={testID}>
      <Ionicons
        name="search-outline"
        size={20}
        color="#8E8E93"
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8E8E93"
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel="検索入力"
        {...textInputProps}
      />
      {value.length > 0 && (
        <Pressable
          onPress={handleClear}
          style={styles.clearButton}
          accessibilityLabel="検索をクリア"
          accessibilityRole="button"
        >
          <Ionicons name="close-circle" size={20} color="#8E8E93" />
        </Pressable>
      )}
    </View>
  );
};

SearchBar.displayName = 'SearchBar';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 8,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
