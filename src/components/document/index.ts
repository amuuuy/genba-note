/**
 * Document Components Module
 *
 * Exports all document-related UI components.
 */

export { DocumentStatusBadge } from './DocumentStatusBadge';
export type { DocumentStatusBadgeProps } from './DocumentStatusBadge';
export { getStatusConfig } from './statusConfig';
export type { StatusConfig } from './statusConfig';

export { DocumentListItem } from './DocumentListItem';
export type { DocumentListItemProps } from './DocumentListItem';

export { EmptyDocumentList } from './EmptyDocumentList';
export type { EmptyDocumentListProps } from './EmptyDocumentList';

// Creation Hub components
export { CreationHubHeader } from './CreationHubHeader';
export type { CreationHubHeaderProps } from './CreationHubHeader';

export { CreateDocumentCard } from './CreateDocumentCard';
export type { CreateDocumentCardProps } from './CreateDocumentCard';

export { CreateDocumentCardGroup } from './CreateDocumentCardGroup';
export type { CreateDocumentCardGroupProps } from './CreateDocumentCardGroup';

export { RecentDocumentsSection } from './RecentDocumentsSection';
export type { RecentDocumentsSectionProps } from './RecentDocumentsSection';

export { StatusGroupedDocumentsSection } from './StatusGroupedDocumentsSection';
export type { StatusGroupedDocumentsSectionProps } from './StatusGroupedDocumentsSection';
export { STATUS_GROUP_UI_CONFIGS } from './statusGroupConfig';
export type { StatusGroupUIConfig } from './statusGroupConfig';
