/**
 * WorkLogEntrySection Component
 *
 * Displays a single work log entry with collapsible header and photo galleries.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WorkLogEntry } from '@/types/workLogEntry';
import type { CustomerPhoto, PhotoType } from '@/types/customerPhoto';
import { PhotoGallery } from './PhotoGallery';

export interface WorkLogEntrySectionProps {
  /** Work log entry data */
  entry: WorkLogEntry;
  /** Before photos for this entry */
  beforePhotos: CustomerPhoto[];
  /** After photos for this entry */
  afterPhotos: CustomerPhoto[];
  /** Callback when a photo is pressed */
  onPhotoPress: (photo: CustomerPhoto) => void;
  /** Callback when add photo button is pressed */
  onAddPhoto: (type: PhotoType) => void;
  /** Callback when delete photo button is pressed */
  onDeletePhoto: (photo: CustomerPhoto) => void;
  /** Callback when note is updated */
  onUpdateNote: (note: string | null) => void;
  /** Callback when entry delete button is pressed */
  onDeleteEntry: () => void;
  /** Whether editing is disabled */
  disabled?: boolean;
  /** Whether section is expanded by default */
  defaultExpanded?: boolean;
  /** Test ID */
  testID?: string;
}

/**
 * Format work date for display (YYYY-MM-DD -> YYYY/M/D)
 */
function formatWorkDate(workDate: string): string {
  const [year, month, day] = workDate.split('-');
  return `${year}/${parseInt(month, 10)}/${parseInt(day, 10)}`;
}

/**
 * Work log entry section component
 */
export const WorkLogEntrySection: React.FC<WorkLogEntrySectionProps> = ({
  entry,
  beforePhotos,
  afterPhotos,
  onPhotoPress,
  onAddPhoto,
  onDeletePhoto,
  onUpdateNote,
  onDeleteEntry,
  disabled = false,
  defaultExpanded = true,
  testID,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(entry.note ?? '');

  const totalPhotos = beforePhotos.length + afterPhotos.length;

  const handleToggleExpand = () => {
    setExpanded((prev) => !prev);
  };

  const handleSaveNote = () => {
    const trimmedNote = noteText.trim();
    onUpdateNote(trimmedNote || null);
    setIsEditingNote(false);
  };

  const handleCancelNote = () => {
    setNoteText(entry.note ?? '');
    setIsEditingNote(false);
  };

  return (
    <View style={styles.container} testID={testID}>
      {/* Header */}
      <Pressable
        style={({ pressed }) => [
          styles.header,
          pressed && styles.headerPressed,
        ]}
        onPress={handleToggleExpand}
        accessibilityRole="button"
        accessibilityLabel={`${formatWorkDate(entry.workDate)}の作業記録${expanded ? 'を折りたたむ' : 'を展開する'}`}
      >
        <View style={styles.headerLeft}>
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={20}
            color="#666"
          />
          <Text style={styles.dateText}>{formatWorkDate(entry.workDate)}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalPhotos}枚</Text>
          </View>
        </View>

        {!disabled && (
          <Pressable
            style={styles.deleteEntryButton}
            onPress={onDeleteEntry}
            accessibilityLabel="この作業日を削除"
            accessibilityRole="button"
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
          </Pressable>
        )}
      </Pressable>

      {/* Content (collapsible) */}
      {expanded && (
        <View style={styles.content}>
          {/* Note section */}
          <View style={styles.noteSection}>
            {isEditingNote ? (
              <View style={styles.noteEditContainer}>
                <TextInput
                  style={styles.noteInput}
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="メモを入力..."
                  multiline
                  autoFocus
                />
                <View style={styles.noteActions}>
                  <Pressable
                    style={styles.noteActionButton}
                    onPress={handleCancelNote}
                  >
                    <Text style={styles.noteCancelText}>キャンセル</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.noteActionButton, styles.noteSaveButton]}
                    onPress={handleSaveNote}
                  >
                    <Text style={styles.noteSaveText}>保存</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.noteDisplay}
                onPress={() => !disabled && setIsEditingNote(true)}
                disabled={disabled}
              >
                {entry.note ? (
                  <Text style={styles.noteText}>{entry.note}</Text>
                ) : (
                  <Text style={styles.notePlaceholder}>
                    {disabled ? 'メモなし' : 'メモを追加...'}
                  </Text>
                )}
                {!disabled && (
                  <Ionicons name="pencil" size={16} color="#007AFF" />
                )}
              </Pressable>
            )}
          </View>

          {/* Photo galleries */}
          <PhotoGallery
            photos={beforePhotos}
            type="before"
            onPhotoPress={onPhotoPress}
            onAddPress={() => onAddPhoto('before')}
            onDeletePress={onDeletePhoto}
            disabled={disabled}
          />

          <PhotoGallery
            photos={afterPhotos}
            type="after"
            onPhotoPress={onPhotoPress}
            onAddPress={() => onAddPhoto('after')}
            onDeletePress={onDeletePhoto}
            disabled={disabled}
          />
        </View>
      )}
    </View>
  );
};

WorkLogEntrySection.displayName = 'WorkLogEntrySection';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9F9F9',
  },
  headerPressed: {
    backgroundColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  badge: {
    backgroundColor: '#E5E5EA',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    color: '#666',
  },
  deleteEntryButton: {
    padding: 4,
  },
  content: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  noteSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  noteDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
  },
  noteText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  notePlaceholder: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
  },
  noteEditContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  noteInput: {
    fontSize: 14,
    color: '#333',
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 8,
  },
  noteActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  noteCancelText: {
    fontSize: 14,
    color: '#666',
  },
  noteSaveButton: {
    backgroundColor: '#007AFF',
  },
  noteSaveText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
});
