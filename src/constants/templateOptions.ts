import type { DocumentTemplateId } from '@/types/settings';
import type { DocumentType } from '@/types/document';

export interface TemplateOption {
  value: DocumentTemplateId;
  label: string;
  description: string;
  /** Whether this template requires a Pro subscription */
  requiresPro: boolean;
}

export const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    value: 'FORMAL_STANDARD',
    label: 'フォーマル',
    description: '正統派ビジネス文書（2カラムヘッダー・点線区切り合計）',
    requiresPro: false,
  },
  {
    value: 'ACCOUNTING',
    label: '会計帳票型',
    description: '黒背景ラベル・合計大枠・税率別内訳',
    requiresPro: false,
  },
  {
    value: 'SIMPLE',
    label: 'シンプル',
    description: 'ミニマルデザイン（小さい印鑑・控えめな備考欄）',
    requiresPro: false,
  },
  {
    value: 'MODERN',
    label: 'モダン',
    description: 'アクセントカラー・カード型合計・余白重視',
    requiresPro: true,
  },
  {
    value: 'CLASSIC',
    label: '和風クラシック',
    description: '明朝体・二重罫線・格子テーブル・御見積書',
    requiresPro: true,
  },
  {
    value: 'CONSTRUCTION',
    label: '建設業向け',
    description: '4カラムテーブル・御見積金額表示・透かし背景対応',
    requiresPro: true,
  },
];

/**
 * Check if a template ID requires Pro subscription.
 */
export function isProTemplate(templateId: DocumentTemplateId): boolean {
  return TEMPLATE_OPTIONS.find((o) => o.value === templateId)?.requiresPro ?? false;
}

/**
 * Resolve a template ID considering Pro status.
 * If the user is not Pro and the template requires Pro,
 * falls back to the default free template for the document type.
 */
export function resolveTemplateForUser(
  docType: DocumentType,
  templateId: DocumentTemplateId,
  isPro: boolean
): DocumentTemplateId {
  if (isPro) return templateId;
  if (isProTemplate(templateId)) {
    return docType === 'estimate' ? 'FORMAL_STANDARD' : 'ACCOUNTING';
  }
  return templateId;
}

export interface SelectableTemplateOption extends TemplateOption {
  /** Whether this option is disabled for selection (Pro template + free user) */
  disabled: boolean;
}

/**
 * Get template options with disabled state based on Pro status.
 */
export function getSelectableTemplateOptions(isPro: boolean): SelectableTemplateOption[] {
  return TEMPLATE_OPTIONS.map((option) => ({
    ...option,
    disabled: !isPro && option.requiresPro,
  }));
}
