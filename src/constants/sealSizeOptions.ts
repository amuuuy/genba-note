import type { SealSize } from '@/types/settings';

export interface SealSizeOption {
  value: SealSize;
  label: string;
  description: string;
}

export const SEAL_SIZE_OPTIONS: SealSizeOption[] = [
  { value: 'SMALL', label: '小', description: '小さめの印影サイズ' },
  { value: 'MEDIUM', label: '中', description: '標準の印影サイズ（デフォルト）' },
  { value: 'LARGE', label: '大', description: '大きめの印影サイズ' },
];
