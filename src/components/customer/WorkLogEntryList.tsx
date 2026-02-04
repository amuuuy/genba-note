/**
 * WorkLogEntryList Component
 *
 * Displays a list of work log entries grouped by date.
 * Includes a button to add new entries.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WorkLogEntry } from '@/types/workLogEntry';
import type { CustomerPhoto, PhotoType } from '@/types/customerPhoto';
import { WorkLogEntrySection } from './WorkLogEntrySection';

export interface WorkLogEntryListProps {
  /** All work log entries (sorted by date descending) */
  entries: WorkLogEntry[];
  /** Function to get photos for an entry */
  getPhotosByEntry: (entryId: string) => { before: CustomerPhoto[]; after: CustomerPhoto[] };
  /** Callback when a photo is pressed */
  onPhotoPress: (photo: CustomerPhoto) => void;
  /** Callback when add photo button is pressed */
  onAddPhoto: (entryId: string, type: PhotoType) => void;
  /** Callback when delete photo button is pressed */
  onDeletePhoto: (photo: CustomerPhoto) => void;
  /** Callback when add entry button is pressed */
  onAddEntry: () => void;
  /** Callback when entry note is updated */
  onUpdateEntryNote: (entryId: string, note: string | null) => void;
  /** Callback when entry is deleted */
  onDeleteEntry: (entry: WorkLogEntry) => void;
  /** Whether editing is disabled */
  disabled?: boolean;
  /** Test ID */
  testID?: string;
}

/**
 * Work log entry list component
 */
export const WorkLogEntryList: React.FC<WorkLogEntryListProps> = ({
  entries,
  getPhotosByEntry,
  onPhotoPress,
  onAddPhoto,
  onDeletePhoto,
  onAddEntry,
  onUpdateEntryNote,
  onDeleteEntry,
  disabled = false,
  testID,
}) => {
  const isEmpty = entries.length === 0;

  return (
    <View style={styles.container} testID={testID}>
      {/* Add entry button */}
      {!disabled && (
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
          onPress={onAddEntry}
          accessibilityRole="button"
          accessibilityLabel="作業日を追加"
        >
          <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
          <Text style={styles.addButtonText}>作業日を追加</Text>
        </Pressable>
      )}

      {/* Empty state */}
      {isEmpty && (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={48} color="#C7C7CC" />
          <Text style={styles.emptyText}>
            作業記録がありません
          </Text>
          {!disabled && (
            <Text style={styles.emptyHint}>
              「作業日を追加」から記録を開始してください
            </Text>
          )}
        </View>
      )}

      {/* Entry list */}
      {entries.map((entry) => {
        const photos = getPhotosByEntry(entry.id);
        return (
          <WorkLogEntrySection
            key={entry.id}
            entry={entry}
            beforePhotos={photos.before}
            afterPhotos={photos.after}
            onPhotoPress={onPhotoPress}
            onAddPhoto={(type) => onAddPhoto(entry.id, type)}
            onDeletePhoto={onDeletePhoto}
            onUpdateNote={(note) => onUpdateEntryNote(entry.id, note)}
            onDeleteEntry={() => onDeleteEntry(entry)}
            disabled={disabled}
            defaultExpanded={entries.length === 1}
          />
        );
      })}

    </View>
  );
};

WorkLogEntryList.displayName = 'WorkLogEntryList';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F8FF',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#007AFF',
    paddingVertical: 14,
    marginBottom: 16,
  },
  addButtonPressed: {
    backgroundColor: '#E8F4FF',
    opacity: 0.8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
    textAlign: 'center',
  },
});
