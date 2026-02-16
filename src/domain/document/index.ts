/**
 * Document Domain Module
 *
 * This module exports all document-related business logic:
 * - Validation functions
 * - Status transition management
 * - Auto-numbering
 * - CRUD operations
 */

// === Types ===

export type {
  ValidationError,
  ValidationErrorCode,
  StatusTransitionError,
  StatusTransitionErrorCode,
  NumberingError,
  NumberingErrorCode,
  DocumentServiceError,
  DocumentServiceErrorCode,
  DomainResult,
} from './types';

export {
  successResult,
  errorResult,
  createValidationError,
  createTransitionError,
  createNumberingError,
  createDocumentServiceError,
} from './types';

// === Validation (pure functions) ===

export {
  validateClientName,
  validateIssueDate,
  validateValidUntil,
  validateDueDate,
  validatePaidAt,
  validateLineItem,
  validateLineItems,
  validateDocumentTotal,
  validateDocument,
  getEditableFields,
  validateEditAllowed,
  sanitizeDocumentType,
} from './documentValidation';

// === Status Transitions (pure functions) ===

export {
  canTransition,
  getAllowedTransitions,
  executeTransition,
  getTransitionRequirements,
} from './statusTransitionService';

export type { TransitionRequirements } from './statusTransitionService';

// === Auto Numbering (async) ===

export {
  formatDocumentNumber,
  validatePrefix,
  generateDocumentNumber,
  getNumberingSettings,
} from './autoNumberingService';

export type { NumberingSettings } from './autoNumberingService';

// === Document Service (async) ===

export {
  createDocument,
  getDocument,
  listDocuments,
  updateDocument,
  changeDocumentStatus,
  deleteDocumentById,
  duplicateDocument,
  enforceDocumentCreationLimit,
} from './documentService';

export type {
  CreateDocumentInput,
  UpdateDocumentInput,
  CreateDocumentOptions,
} from './documentService';

// === Conversion Service (async) ===

export { convertEstimateToInvoice } from './conversionService';

export type { ConversionResult, ConvertEstimateOptions } from './conversionService';

// === Status Grouping (pure functions) ===

export {
  groupDocumentsByStatus,
  getDocumentsForGroup,
  STATUS_GROUPS,
} from './statusGroupService';

export type {
  StatusGroupId,
  StatusGroupDef,
  GroupedDocuments,
} from './statusGroupService';
