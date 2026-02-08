/**
 * Status Group UI Configuration
 *
 * UI metadata (title, colors, icons) for status-grouped sections.
 * Domain mapping (groupId -> statuses) lives in domain/document/statusGroupService.
 */

import type { StatusGroupId } from '@/domain/document/statusGroupService';
import { STATUS_GROUPS } from '@/domain/document/statusGroupService';

/** UI metadata for a status group section */
export interface StatusGroupUIConfig {
  id: StatusGroupId;
  title: string;
  /** Color for section header text and left border accent */
  accentColor: string;
  /** Light background color for section header */
  headerBgColor: string;
  /** Ionicons icon name */
  iconName: string;
}

/** UI metadata keyed by group ID */
const GROUP_UI_META: Record<StatusGroupId, Omit<StatusGroupUIConfig, 'id'>> = {
  paid: {
    title: '入金済み',
    accentColor: '#34C759',
    headerBgColor: '#E8F5E9',
    iconName: 'checkmark-circle-outline',
  },
  billing: {
    title: '請求中',
    accentColor: '#FF9500',
    headerBgColor: '#FFF3E0',
    iconName: 'send-outline',
  },
  working: {
    title: '作業中',
    accentColor: '#8E8E93',
    headerBgColor: '#F2F2F7',
    iconName: 'create-outline',
  },
};

/** Merged configurations in display order (matches STATUS_GROUPS order) */
export const STATUS_GROUP_UI_CONFIGS: StatusGroupUIConfig[] = STATUS_GROUPS.map(
  (group) => ({
    id: group.id,
    ...GROUP_UI_META[group.id],
  })
);
