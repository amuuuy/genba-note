/**
 * Document Preview Screen
 *
 * Displays HTML preview of documents (FREE for all users).
 * PDF generation and sharing is PRO only.
 *
 * Flow:
 * 1. Load document from storage
 * 2. Enrich with calculated totals
 * 3. Fetch sensitive issuer snapshot
 * 4. Generate HTML template
 * 5. Display in WebView
 * 6. On PDF share: check Pro status → generate/share or redirect to paywall
 */

import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';

import { getDocument } from '@/domain/document';
import { enrichDocumentWithTotals } from '@/domain/lineItem/calculationService';
import { getIssuerSnapshot } from '@/storage/secureStorageService';
// Import template service directly to avoid bundling expo-print/sharing dependencies in preview
import { generateHtmlTemplate } from '@/pdf/pdfTemplateService';
// Import PDF generation service for Pro feature
import { generateAndSharePdf } from '@/pdf/pdfGenerationService';
import type { DocumentWithTotals, SensitiveIssuerSnapshot } from '@/types/document';

type ScreenState = 'loading' | 'error' | 'ready';

export default function DocumentPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<ScreenState>('loading');
  const [html, setHtml] = useState<string>('');
  const [documentWithTotals, setDocumentWithTotals] = useState<DocumentWithTotals | null>(null);
  const [sensitiveSnapshot, setSensitiveSnapshot] = useState<SensitiveIssuerSnapshot | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load document and generate HTML preview
  useEffect(() => {
    async function loadPreview() {
      if (!id) {
        setErrorMessage('書類IDが見つかりません');
        setState('error');
        return;
      }

      try {
        // 1. Fetch document
        const docResult = await getDocument(id);
        if (!docResult.success || !docResult.data) {
          setErrorMessage('書類が見つかりません');
          setState('error');
          return;
        }

        // 2. Enrich with totals
        const enriched = enrichDocumentWithTotals(docResult.data);
        setDocumentWithTotals(enriched);

        // 3. Fetch sensitive snapshot
        const snapshotResult = await getIssuerSnapshot(id);
        const snapshot = snapshotResult.success && snapshotResult.data ? snapshotResult.data : null;
        setSensitiveSnapshot(snapshot);

        // 4. Generate HTML
        const templateResult = generateHtmlTemplate({
          document: enriched,
          sensitiveSnapshot: snapshot,
        });
        setHtml(templateResult.html);

        setState('ready');
      } catch (error) {
        setErrorMessage('プレビューの読み込みに失敗しました');
        setState('error');
      }
    }

    loadPreview();
  }, [id]);

  // Handle PDF share button
  const handleSharePdf = useCallback(async () => {
    if (!documentWithTotals) return;

    // Generate and share PDF (Pro check is enforced at service layer)
    setIsGenerating(true);
    try {
      const result = await generateAndSharePdf({
        document: documentWithTotals,
        sensitiveSnapshot,
      });

      if (!result.success && result.error) {
        // Handle PRO_REQUIRED error by navigating to paywall
        if (result.error.code === 'PRO_REQUIRED') {
          router.push('/paywall');
          return;
        }
        // Log other errors (could use Alert or toast in a real app)
        console.error('PDF generation failed:', result.error.message);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [documentWithTotals, sensitiveSnapshot]);

  // Render loading state
  if (state === 'loading') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  // Render error state
  if (state === 'error') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>戻る</Text>
        </Pressable>
      </View>
    );
  }

  // Render preview
  return (
    <View style={styles.container}>
      {/* HTML Preview - Security hardened for static content */}
      <WebView
        style={styles.webview}
        originWhitelist={['about:blank']}
        source={{ html }}
        scrollEnabled={true}
        javaScriptEnabled={false}
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
      />

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.shareButton, isGenerating && styles.shareButtonDisabled]}
          onPress={handleSharePdf}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.shareButtonText}>PDFで共有【Pro】</Text>
          )}
        </Pressable>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>編集に戻る</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  webview: {
    flex: 1,
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  shareButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  shareButtonDisabled: {
    opacity: 0.6,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
});
