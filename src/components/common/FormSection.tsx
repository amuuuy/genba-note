/**
 * FormSection Component
 *
 * A section container with title for grouping form fields.
 * Used to organize document edit forms into logical sections.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface FormSectionProps {
  /** Section title */
  title: string;
  /** Child components */
  children: React.ReactNode;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Form section container with title
 */
export const FormSection: React.FC<FormSectionProps> = ({
  title,
  children,
  testID,
}) => {
  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

FormSection.displayName = 'FormSection';

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    paddingLeft: 4,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});
