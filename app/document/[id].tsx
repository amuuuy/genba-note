/**
 * Document Edit Screen
 *
 * Creates or edits a document (estimate or invoice).
 * Handles:
 * - id='new' with type query parameter for new documents
 * - id=UUID for editing existing documents
 *
 * Full implementation in Milestone 9.
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { DocumentType } from '../../src/types';

/**
 * Get display name for document type
 */
function getTypeLabel(type: DocumentType | undefined): string {
  if (type === 'estimate') return '見積書';
  if (type === 'invoice') return '請求書';
  return '書類';
}

export default function DocumentEditScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: DocumentType }>();

  const isNewDocument = id === 'new';
  const documentType = type as DocumentType | undefined;
  const typeLabel = getTypeLabel(documentType);

  return (
    <View style={styles.container}>
      {isNewDocument && documentType && (
        <View style={styles.typeBadge}>
          <Ionicons
            name={documentType === 'estimate' ? 'document-text-outline' : 'receipt-outline'}
            size={20}
            color={documentType === 'estimate' ? '#007AFF' : '#FF9500'}
          />
          <Text
            style={[
              styles.typeBadgeText,
              { color: documentType === 'estimate' ? '#007AFF' : '#FF9500' },
            ]}
          >
            {typeLabel}
          </Text>
        </View>
      )}

      <Text style={styles.placeholder}>
        {isNewDocument ? `新規${typeLabel}作成` : '書類編集画面'}
      </Text>
      <Text style={styles.hint}>
        {isNewDocument
          ? `ここで${typeLabel}を作成します\n（Milestone 9で完全実装予定）`
          : `書類ID: ${id}`}
      </Text>

      <Link href={{ pathname: '/document/preview', params: { id: id ?? 'new' } }} asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>プレビュー</Text>
        </Pressable>
      </Link>

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>戻る</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    gap: 8,
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  placeholder: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  hint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    padding: 12,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});
