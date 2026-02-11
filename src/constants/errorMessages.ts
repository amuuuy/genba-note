/**
 * Error Messages Constants
 *
 * Centralized user-friendly error messages for various error conditions.
 * These messages are displayed to users in the UI.
 */

import type { ProGateReason, PdfGenerationErrorCode } from '@/pdf/types';
import type { SubscriptionServiceErrorCode } from '@/subscription/types';

/**
 * User-friendly messages for Pro gate reasons
 */
export const PRO_GATE_MESSAGES: Record<ProGateReason, string> = {
  // Success reasons
  online_verified: 'Proプランがアクティブです',
  offline_grace_period: 'オフラインモードでProプランを使用中です',
  development_mode: '[DEV] Proプランがアクティブです（開発モード）',

  // Failure reasons
  cache_missing: 'サブスクリプション情報がありません。ネットワークに接続してください。',
  cache_invalid: 'サブスクリプション情報が無効です。ネットワークに接続して更新してください。',
  entitlement_inactive: 'Proプランがアクティブではありません',
  entitlement_expired: 'Proプランの有効期限が切れています',
  uptime_rollback: '端末の再起動が検出されました。ネットワークに接続して認証してください。',
  grace_period_exceeded: 'オフライン期間が7日を超えました。ネットワークに接続してください。',
  clock_manipulation: '時刻の異常が検出されました。正しい時刻に設定してください。',

  // Test/placeholder reasons
  placeholder_always_false: 'Proプランが必要です',
  placeholder_always_true: 'Proプランがアクティブです（テスト）',
};

/**
 * User-friendly messages for subscription service errors
 */
export const SUBSCRIPTION_ERROR_MESSAGES: Record<SubscriptionServiceErrorCode, string> = {
  RC_NOT_CONFIGURED: 'サブスクリプションサービスが初期化されていません',
  RC_FETCH_ERROR: 'サブスクリプションの確認に失敗しました。ネットワーク接続を確認してください。',
  RC_RESTORE_ERROR: '購入の復元に失敗しました。再度お試しください。',
  CACHE_WRITE_ERROR: 'サブスクリプション情報の保存に失敗しました',
  CACHE_READ_ERROR: 'サブスクリプション情報の読み込みに失敗しました',
  UPTIME_ERROR: '端末情報の取得に失敗しました',
  NETWORK_ERROR: 'ネットワークに接続できません。オフラインモードで継続します。',
  INVALID_SERVER_TIME: 'サーバー時刻の取得に失敗しました。再度お試しください。',
};

/**
 * Get user-friendly message for Pro gate reason
 */
export function getProGateMessage(reason: ProGateReason): string {
  return PRO_GATE_MESSAGES[reason] ?? 'Proプランの状態を確認できません';
}

/**
 * Get user-friendly message for subscription error
 */
export function getSubscriptionErrorMessage(code: SubscriptionServiceErrorCode): string {
  return SUBSCRIPTION_ERROR_MESSAGES[code] ?? 'エラーが発生しました';
}

/**
 * User-friendly messages for PDF generation errors
 */
export const PDF_ERROR_MESSAGES: Record<PdfGenerationErrorCode, string> = {
  GENERATION_FAILED: 'PDFの生成に失敗しました。再度お試しください。',
  SHARE_CANCELLED: '共有がキャンセルされました。',
  SHARE_FAILED: 'PDFの共有に失敗しました。',
  PRO_REQUIRED: 'Proプランが必要です。',
  DOCUMENT_NOT_FOUND: '書類が見つかりません。',
  TEMPLATE_ERROR: 'テンプレートエラーが発生しました。',
  VALIDATION_FAILED: '必須項目が入力されていません。',
};

/**
 * Get user-friendly message for PDF generation error
 */
export function getPdfErrorMessage(code: PdfGenerationErrorCode): string {
  return PDF_ERROR_MESSAGES[code] ?? 'エラーが発生しました';
}

/**
 * Read-only mode messages
 */
export const READ_ONLY_MODE_MESSAGES = {
  BANNER_TITLE: '読み取り専用モード',
  BANNER_MESSAGE: 'データベースエラーにより、変更を保存できません。',
  RETRY_BUTTON: '再試行',
  RETRY_SUCCESS: 'データベースが復旧しました。',
  RETRY_FAILURE: '復旧に失敗しました。後でもう一度お試しください。',
} as const;
