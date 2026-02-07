/**
 * Document Preview Screen
 *
 * Displays HTML preview of documents (FREE for all users).
 * PDF generation and sharing is PRO only.
 *
 * Flow:
 * 1. Load document from storage OR parse from previewData parameter
 * 2. Enrich with calculated totals
 * 3. Resolve issuer info (snapshot with settings fallback)
 * 4. Create document with resolved issuer info
 * 5. Generate HTML template
 * 6. Display in WebView
 * 7. On PDF share: check Pro status → generate/share or redirect to paywall
 *
 * Preview Mode:
 * - If `previewData` param is provided, preview unsaved document data
 * - In preview mode, PDF sharing is disabled (document must be saved first)
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { getDocument } from '@/domain/document';
import { enrichDocumentWithTotals } from '@/domain/lineItem/calculationService';
import { resolveIssuerInfo } from '@/pdf/issuerResolverService';
// Import template service directly to avoid bundling expo-print/sharing dependencies in preview
import { generateHtmlTemplate, generateFilenameTitle, deriveDisplayHtml, toggleOrientation } from '@/pdf/pdfTemplateService';
// Import PDF generation service for Pro feature
import { generateAndSharePdf } from '@/pdf/pdfGenerationService';
import { getSettings } from '@/storage/asyncStorageService';
import { FilenameEditModal } from '@/components/document/FilenameEditModal';
import { getPdfErrorMessage } from '@/constants/errorMessages';
import type { Document, DocumentWithTotals, SensitiveIssuerSnapshot } from '@/types/document';
import type { PreviewOrientation } from '@/types/settings';

type ScreenState = 'loading' | 'error' | 'ready';

export default function DocumentPreviewScreen() {
  const { id, previewData } = useLocalSearchParams<{ id?: string; previewData?: string }>();
  const [state, setState] = useState<ScreenState>('loading');
  const [html, setHtml] = useState<string>('');
  const [documentWithTotals, setDocumentWithTotals] = useState<DocumentWithTotals | null>(null);
  const [sensitiveSnapshot, setSensitiveSnapshot] = useState<SensitiveIssuerSnapshot | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<PreviewOrientation>('PORTRAIT');
  const [filenameModalVisible, setFilenameModalVisible] = useState(false);

  // Whether we're in preview mode (unsaved document)
  const isPreviewMode = !!previewData;

  // Default filename for the modal (e.g., "EST-001_見積書")
  const defaultFilename = useMemo(() => {
    if (!documentWithTotals) return '';
    return generateFilenameTitle(documentWithTotals.documentNo, documentWithTotals.type);
  }, [documentWithTotals]);

  // Load document and generate HTML preview
  useEffect(() => {
    async function loadPreview() {
      try {
        let document: Document;

        if (previewData) {
          // Preview mode: parse document from URL parameter
          try {
            document = JSON.parse(previewData) as Document;
          } catch {
            setErrorMessage('プレビューデータの解析に失敗しました');
            setState('error');
            return;
          }
        } else if (id) {
          // Normal mode: load from storage
          const docResult = await getDocument(id);
          if (!docResult.success || !docResult.data) {
            setErrorMessage('書類が見つかりません');
            setState('error');
            return;
          }
          document = docResult.data;
        } else {
          setErrorMessage('書類IDまたはプレビューデータが見つかりません');
          setState('error');
          return;
        }

        // 2. Enrich with totals
        const enriched = enrichDocumentWithTotals(document);

        // 3. Resolve issuer info (snapshot or settings fallback)
        // For preview mode, use document id if available, otherwise use empty string
        const documentId = document.id || '';
        const issuerInfo = await resolveIssuerInfo(documentId, enriched.issuerSnapshot);
        setSensitiveSnapshot(issuerInfo.sensitiveSnapshot);

        // 4. Create document with resolved issuer info
        const documentForTemplate = {
          ...enriched,
          issuerSnapshot: issuerInfo.issuerSnapshot,
        };
        setDocumentWithTotals(documentForTemplate);

        // 5. Load settings for template selection (M21)
        const settingsResult = await getSettings();
        const settings = settingsResult.success ? settingsResult.data : null;
        const templateId = documentForTemplate.type === 'estimate'
          ? settings?.defaultEstimateTemplateId ?? 'FORMAL_STANDARD'
          : settings?.defaultInvoiceTemplateId ?? 'ACCOUNTING';

        // 6. Generate HTML with resolved data using user's template preference
        const templateResult = generateHtmlTemplate({
          document: documentForTemplate,
          sensitiveSnapshot: issuerInfo.sensitiveSnapshot,
          mode: 'pdf',
          templateId,
          sealSize: settings?.sealSize,
          backgroundDesign: settings?.backgroundDesign,
        });
        setHtml(templateResult.html);

        setState('ready');
      } catch (error) {
        setErrorMessage('プレビューの読み込みに失敗しました');
        setState('error');
      }
    }

    loadPreview();
  }, [id, previewData]);

  // Compute HTML for WebView display, applying landscape CSS when needed
  const displayHtml = useMemo(
    () => deriveDisplayHtml(html, orientation),
    [html, orientation]
  );

  // Handle orientation toggle
  const handleToggleOrientation = useCallback(() => {
    setOrientation((prev) => toggleOrientation(prev));
  }, []);

  // Handle share button press -- open filename modal (M19)
  const handleShareButtonPress = useCallback(() => {
    setPdfError(null);
    setFilenameModalVisible(true);
  }, []);

  // Handle confirmed filename from modal -- generate and share PDF (M19)
  const handleFilenameConfirm = useCallback(async (customFilename: string) => {
    setFilenameModalVisible(false);

    if (!documentWithTotals) return;

    setIsGenerating(true);
    try {
      const result = await generateAndSharePdf(
        { document: documentWithTotals, sensitiveSnapshot },
        { orientation, customFilename }
      );

      if (!result.success && result.error) {
        if (result.error.code === 'PRO_REQUIRED') {
          router.push('/paywall');
          return;
        }
        if (result.error.code === 'SHARE_CANCELLED') {
          return;
        }
        const message =
          result.error.code === 'VALIDATION_FAILED' && result.error.message
            ? result.error.message
            : getPdfErrorMessage(result.error.code);
        setPdfError(message);
      }
    } catch {
      setPdfError('PDF生成中に予期しないエラーが発生しました。');
    } finally {
      setIsGenerating(false);
    }
  }, [documentWithTotals, sensitiveSnapshot, orientation]);

  // Handle modal cancel
  const handleFilenameCancel = useCallback(() => {
    setFilenameModalVisible(false);
  }, []);

  // Dismiss PDF error
  const handleDismissPdfError = useCallback(() => {
    setPdfError(null);
  }, []);

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
        source={{ html: displayHtml }}
        scrollEnabled={true}
        javaScriptEnabled={false}
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
      />

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {/* Preview mode notice */}
        {isPreviewMode && (
          <View style={styles.previewNotice}>
            <Text style={styles.previewNoticeText}>
              プレビューモード（未保存）
            </Text>
          </View>
        )}

        {/* Orientation toggle button */}
        <Pressable
          style={styles.orientationToggle}
          onPress={handleToggleOrientation}
          accessibilityLabel={
            orientation === 'PORTRAIT' ? '横向きに切り替え' : '縦向きに切り替え'
          }
          accessibilityRole="button"
        >
          <Ionicons
            name={orientation === 'PORTRAIT' ? 'phone-portrait-outline' : 'phone-landscape-outline'}
            size={20}
            color="#007AFF"
          />
          <Text style={styles.orientationToggleText}>
            {orientation === 'PORTRAIT' ? '縦向き' : '横向き'}
          </Text>
        </Pressable>

        {/* PDF Error Display - only show when not in preview mode */}
        {!isPreviewMode && pdfError && (
          <View style={styles.pdfErrorContainer}>
            <Text style={styles.pdfErrorText}>{pdfError}</Text>
            <View style={styles.pdfErrorButtons}>
              <Pressable onPress={handleShareButtonPress} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>再試行</Text>
              </Pressable>
              <Pressable onPress={handleDismissPdfError} style={styles.dismissButton}>
                <Text style={styles.dismissButtonText}>閉じる</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* PDF Share button - only show when document is saved */}
        {!isPreviewMode && (
          <Pressable
            style={[styles.shareButton, isGenerating && styles.shareButtonDisabled]}
            onPress={handleShareButtonPress}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.shareButtonText}>PDFで共有【Pro】</Text>
            )}
          </Pressable>
        )}

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>
            {isPreviewMode ? '編集画面に戻る' : '編集に戻る'}
          </Text>
        </Pressable>
      </View>

      {/* Filename Edit Modal (M19) */}
      <FilenameEditModal
        visible={filenameModalVisible}
        defaultFilename={defaultFilename}
        onConfirm={handleFilenameConfirm}
        onCancel={handleFilenameCancel}
        testID="filename-edit-modal"
      />
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
  pdfErrorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  pdfErrorText: {
    fontSize: 14,
    color: '#C62828',
    marginBottom: 8,
  },
  pdfErrorButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  retryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#C62828',
    borderRadius: 4,
  },
  retryButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  dismissButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dismissButtonText: {
    fontSize: 12,
    color: '#C62828',
    fontWeight: '600',
  },
  orientationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: '#F0F7FF',
  },
  orientationToggleText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  previewNotice: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  previewNoticeText: {
    fontSize: 14,
    color: '#E65100',
    textAlign: 'center',
    fontWeight: '500',
  },
});
