/**
 * CreateDocumentCard Component
 *
 * Large tappable card button for creating new documents.
 * Used in the Creation Hub for estimate and invoice creation.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DocumentType } from '../../types';

export interface CreateDocumentCardProps {
  /** Document type this card creates */
  type: DocumentType;
  /** Title text displayed on the card */
  title: string;
  /** Icon name from Ionicons */
  icon: keyof typeof Ionicons.glyphMap;
  /** Background color of the card */
  backgroundColor: string;
  /** Callback when card is pressed */
  onPress: () => void;
  /** Whether the card is disabled */
  disabled?: boolean;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Card button component for document creation
 */
export const CreateDocumentCard: React.FC<CreateDocumentCardProps> = memo(
  ({ type, title, icon, backgroundColor, onPress, disabled = false, testID }) => {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor },
          pressed && !disabled && styles.cardPressed,
          disabled && styles.cardDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={`${title}${disabled ? '（無効）' : ''}`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        testID={testID}
      >
        <View style={styles.content}>
          <Ionicons name={icon} size={48} color="#fff" />
          <Text style={styles.title}>{title}</Text>
        </View>
      </Pressable>
    );
  }
);

CreateDocumentCard.displayName = 'CreateDocumentCard';

const styles = StyleSheet.create({
  card: {
    flex: 1,
    aspectRatio: 1.2,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  cardDisabled: {
    opacity: 0.5,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
  },
});
