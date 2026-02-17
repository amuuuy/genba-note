/**
 * CustomerAutoComplete Component
 *
 * Form input with autocomplete suggestions from customer master.
 * Shows dropdown suggestions as user types.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Customer } from '@/types/customer';
import { listCustomers } from '@/domain/customer';

const MAX_SUGGESTIONS = 5;
const MIN_SEARCH_LENGTH = 1;

export interface CustomerAutoCompleteProps {
  /** Current input value */
  value: string;
  /** Callback when input text changes */
  onChangeText: (text: string) => void;
  /** Callback when a customer is selected from suggestions */
  onSelectCustomer: (customer: Customer) => void;
  /** Callback when "Search more" is pressed */
  onOpenModal: () => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Whether this field is required */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Test ID */
  testID?: string;
}

/**
 * Customer autocomplete input component
 */
export const CustomerAutoComplete: React.FC<CustomerAutoCompleteProps> = ({
  value,
  onChangeText,
  onSelectCustomer,
  onOpenModal,
  disabled = false,
  error,
  required = false,
  placeholder = '取引先名を入力',
  testID,
}) => {
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear blur timer on unmount
  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  // Fetch suggestions when value changes
  useEffect(() => {
    if (!value || value.trim().length < MIN_SEARCH_LENGTH) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      const result = await listCustomers({ searchText: value });
      if (result.success && result.data) {
        setSuggestions(result.data.slice(0, MAX_SUGGESTIONS));
      } else {
        setSuggestions([]);
      }
    };

    // Debounce the fetch
    const timer = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(timer);
  }, [value]);

  // Show suggestions when focused and has suggestions
  useEffect(() => {
    if (isFocused && suggestions.length > 0 && value.trim().length >= MIN_SEARCH_LENGTH) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [isFocused, suggestions.length, value]);

  const handleFocus = useCallback(() => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    // Clear any pending blur timer before creating a new one
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
    }
    // Delay hiding suggestions to allow item press to register
    blurTimerRef.current = setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
      blurTimerRef.current = null;
    }, 200);
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeText(text);
    },
    [onChangeText]
  );

  const handleSelectCustomer = useCallback(
    (customer: Customer) => {
      setShowSuggestions(false);
      onSelectCustomer(customer);
    },
    [onSelectCustomer]
  );

  const handleOpenModal = useCallback(() => {
    setShowSuggestions(false);
    inputRef.current?.blur();
    onOpenModal();
  }, [onOpenModal]);

  return (
    <View style={styles.container} testID={testID}>
      {/* Label */}
      <View style={styles.labelContainer}>
        <Text style={styles.label}>取引先名</Text>
        {required && <Text style={styles.required}>必須</Text>}
      </View>

      {/* Input with button */}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            disabled && styles.inputDisabled,
            error && styles.inputError,
          ]}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#999"
          editable={!disabled}
          testID={`${testID}-input`}
        />
        <Pressable
          style={[styles.searchButton, disabled && styles.searchButtonDisabled]}
          onPress={handleOpenModal}
          disabled={disabled}
          accessibilityLabel="顧客を検索"
          accessibilityRole="button"
        >
          <Ionicons
            name="search"
            size={20}
            color={disabled ? '#C7C7CC' : '#007AFF'}
          />
        </Pressable>
      </View>

      {/* Error message */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((customer) => (
            <Pressable
              key={customer.id}
              style={styles.suggestionItem}
              onPress={() => handleSelectCustomer(customer)}
              accessibilityRole="button"
              accessibilityLabel={customer.name}
            >
              <View style={styles.suggestionIcon}>
                <Ionicons name="person-outline" size={16} color="#666" />
              </View>
              <View style={styles.suggestionText}>
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {customer.name}
                </Text>
                {customer.address && (
                  <Text style={styles.suggestionAddress} numberOfLines={1}>
                    {customer.address}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
          <Pressable
            style={styles.moreButton}
            onPress={handleOpenModal}
            accessibilityRole="button"
            accessibilityLabel="もっと見る"
          >
            <Text style={styles.moreText}>もっと見る...</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

CustomerAutoComplete.displayName = 'CustomerAutoComplete';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  required: {
    fontSize: 12,
    color: '#FF3B30',
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  inputDisabled: {
    backgroundColor: '#F2F2F7',
    color: '#8E8E93',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  searchButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 52, // Account for search button
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  suggestionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  suggestionAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  moreButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  moreText: {
    fontSize: 14,
    color: '#007AFF',
  },
});
