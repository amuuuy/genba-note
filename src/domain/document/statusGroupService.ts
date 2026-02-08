/**
 * Status Group Service
 *
 * Pure functions for grouping documents by status categories
 * for the list view's status-grouped display.
 *
 * Group definitions map groupId to statuses (domain only).
 * UI metadata (title, colors) lives in components/document/statusGroupConfig.
 */

import type { DocumentStatus, DocumentWithTotals } from '@/types/document';

/** Status group identifiers for the list view */
export type StatusGroupId = 'paid' | 'billing' | 'working';

/** Status group definition (domain only, no UI metadata) */
export interface StatusGroupDef {
  id: StatusGroupId;
  statuses: DocumentStatus[];
}

/** Domain-only group definitions (groupId ↔ statuses mapping) */
export const STATUS_GROUPS: StatusGroupDef[] = [
  { id: 'paid', statuses: ['paid'] },
  { id: 'billing', statuses: ['sent', 'issued'] },
  { id: 'working', statuses: ['draft'] },
];

/** Result of grouping documents by status */
export type GroupedDocuments = Record<StatusGroupId, DocumentWithTotals[]>;

/**
 * Group documents by status category
 */
export function groupDocumentsByStatus(
  documents: DocumentWithTotals[]
): GroupedDocuments {
  const result: GroupedDocuments = {
    paid: [],
    billing: [],
    working: [],
  };

  for (const doc of documents) {
    const group = STATUS_GROUPS.find((g) => g.statuses.includes(doc.status));
    if (group) {
      result[group.id].push(doc);
    } else {
      // Fallback: unknown statuses go to working
      result.working.push(doc);
    }
  }

  return result;
}

/**
 * Get documents for a specific status group
 */
export function getDocumentsForGroup(
  documents: DocumentWithTotals[],
  groupId: StatusGroupId
): DocumentWithTotals[] {
  const group = STATUS_GROUPS.find((g) => g.id === groupId);
  if (!group) return [];
  return documents.filter((doc) => group.statuses.includes(doc.status));
}
