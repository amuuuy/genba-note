/**
 * useDocumentEdit Hook
 *
 * Manages form state for document editing (create and update).
 * Handles loading, validation, save, and status transitions.
 */

import { useReducer, useCallback, useEffect, useState } from 'react';
import type {
  Document,
  DocumentType,
  DocumentStatus,
  LineItem,
  IssuerSnapshot,
} from '@/types/document';
import type { ValidationError } from '@/domain/document/types';
import {
  createDocument,
  getDocument,
  updateDocument,
  changeDocumentStatus,
  type CreateDocumentInput,
  type UpdateDocumentInput,
} from '@/domain/document';
import {
  validateClientName,
  validateIssueDate,
  validateValidUntil,
  validateDueDate,
  validatePaidAt,
  validateLineItems,
  validateDocumentTotal,
  getEditableFields,
} from '@/domain/document/documentValidation';
import { getAllowedTransitions, getTransitionRequirements } from '@/domain/document/statusTransitionService';
import { getTodayString } from '@/utils/dateUtils';

// === Types ===

/**
 * Form field values (not the full document)
 */
export interface DocumentFormValues {
  type: DocumentType;
  clientName: string;
  clientAddress: string;
  subject: string;
  issueDate: string;
  validUntil: string;
  dueDate: string;
  paidAt: string;
  carriedForwardAmount: string;
  notes: string;
}

/**
 * Form state managed by useReducer
 */
export interface DocumentEditState {
  /** Document ID (null for new documents) */
  documentId: string | null;
  /** Document number (read-only, assigned on first save) */
  documentNo: string | null;
  /** Current status */
  status: DocumentStatus;
  /** Selected customer ID from master (null if not linked) */
  customerId: string | null;
  /** Form field values */
  values: DocumentFormValues;
  /** Line items (managed separately by useLineItemEditor) */
  lineItems: LineItem[];
  /** Issuer snapshot (populated on load/create) */
  issuerSnapshot: IssuerSnapshot | null;
  /** Validation errors by field */
  errors: Record<string, string>;
  /** Whether form is loading */
  isLoading: boolean;
  /** Whether save is in progress */
  isSaving: boolean;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Error message for load/save failures */
  errorMessage: string | null;
}

/**
 * Actions for form state reducer
 */
type DocumentEditAction =
  | { type: 'START_LOADING' }
  | { type: 'LOAD_SUCCESS'; document: Document }
  | { type: 'LOAD_NEW'; docType: DocumentType }
  | { type: 'LOAD_ERROR'; message: string }
  | { type: 'UPDATE_FIELD'; field: keyof DocumentFormValues; value: string }
  | { type: 'UPDATE_CUSTOMER_ID'; customerId: string | null }
  | { type: 'UPDATE_LINE_ITEMS'; lineItems: LineItem[] }
  | { type: 'SET_ERRORS'; errors: Record<string, string> }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'START_SAVING' }
  | { type: 'SAVE_SUCCESS'; document: Document }
  | { type: 'SAVE_ERROR'; message: string }
  | { type: 'STATUS_CHANGE_SUCCESS'; document: Document }
  | { type: 'RESET_DIRTY' };

// === Initial State ===

const initialFormValues: DocumentFormValues = {
  type: 'estimate',
  clientName: '',
  clientAddress: '',
  subject: '',
  issueDate: getTodayString(),
  validUntil: '',
  dueDate: '',
  paidAt: '',
  carriedForwardAmount: '',
  notes: '',
};

const initialState: DocumentEditState = {
  documentId: null,
  documentNo: null,
  status: 'draft',
  customerId: null,
  values: initialFormValues,
  lineItems: [],
  issuerSnapshot: null,
  errors: {},
  isLoading: false,
  isSaving: false,
  isDirty: false,
  errorMessage: null,
};

// === Reducer ===

function documentEditReducer(
  state: DocumentEditState,
  action: DocumentEditAction
): DocumentEditState {
  switch (action.type) {
    case 'START_LOADING':
      return {
        ...state,
        isLoading: true,
        errorMessage: null,
      };

    case 'LOAD_SUCCESS':
      return {
        ...state,
        isLoading: false,
        documentId: action.document.id,
        documentNo: action.document.documentNo,
        status: action.document.status,
        customerId: (action.document as Document & { customerId?: string | null }).customerId ?? null,
        values: {
          type: action.document.type,
          clientName: action.document.clientName,
          clientAddress: action.document.clientAddress ?? '',
          subject: action.document.subject ?? '',
          issueDate: action.document.issueDate,
          validUntil: action.document.validUntil ?? '',
          dueDate: action.document.dueDate ?? '',
          paidAt: action.document.paidAt ?? '',
          carriedForwardAmount: action.document.carriedForwardAmount?.toString() ?? '',
          notes: action.document.notes ?? '',
        },
        lineItems: action.document.lineItems,
        issuerSnapshot: action.document.issuerSnapshot,
        errors: {},
        isDirty: false,
        errorMessage: null,
      };

    case 'LOAD_NEW':
      return {
        ...initialState,
        values: {
          ...initialFormValues,
          type: action.docType,
          issueDate: getTodayString(),
        },
        isLoading: false,
      };

    case 'LOAD_ERROR':
      return {
        ...state,
        isLoading: false,
        errorMessage: action.message,
      };

    case 'UPDATE_FIELD':
      return {
        ...state,
        values: {
          ...state.values,
          [action.field]: action.value,
        },
        isDirty: true,
        errors: {
          ...state.errors,
          [action.field]: '', // Clear error for this field
        },
      };

    case 'UPDATE_CUSTOMER_ID':
      return {
        ...state,
        customerId: action.customerId,
        isDirty: true,
      };

    case 'UPDATE_LINE_ITEMS':
      return {
        ...state,
        lineItems: action.lineItems,
        isDirty: true,
      };

    case 'SET_ERRORS':
      return {
        ...state,
        errors: action.errors,
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: {},
      };

    case 'START_SAVING':
      return {
        ...state,
        isSaving: true,
        errorMessage: null,
      };

    case 'SAVE_SUCCESS':
      return {
        ...state,
        isSaving: false,
        documentId: action.document.id,
        documentNo: action.document.documentNo,
        status: action.document.status,
        lineItems: action.document.lineItems,
        issuerSnapshot: action.document.issuerSnapshot,
        isDirty: false,
        errorMessage: null,
      };

    case 'SAVE_ERROR':
      return {
        ...state,
        isSaving: false,
        errorMessage: action.message,
      };

    case 'STATUS_CHANGE_SUCCESS':
      return {
        ...state,
        status: action.document.status,
        values: {
          ...state.values,
          paidAt: action.document.paidAt ?? '',
        },
        isDirty: false,
      };

    case 'RESET_DIRTY':
      return {
        ...state,
        isDirty: false,
      };

    default:
      return state;
  }
}

// === Validation Helpers ===

/**
 * Validate form values and return errors by field
 */
export function validateFormValues(
  values: DocumentFormValues,
  lineItems: LineItem[],
  status: DocumentStatus
): Record<string, string> {
  const errors: Record<string, string> = {};
  const today = getTodayString();

  // Client name
  const clientNameError = validateClientName(values.clientName);
  if (clientNameError) {
    errors.clientName = clientNameError.message;
  }

  // Issue date
  const issueDateError = validateIssueDate(values.issueDate);
  if (issueDateError) {
    errors.issueDate = issueDateError.message;
  }

  // Type-specific date validations (only if issueDate is valid)
  if (!issueDateError) {
    if (values.type === 'estimate') {
      if (values.validUntil) {
        const validUntilError = validateValidUntil(values.validUntil, values.issueDate);
        if (validUntilError) {
          errors.validUntil = validUntilError.message;
        }
      }
    } else {
      if (values.dueDate) {
        const dueDateError = validateDueDate(values.dueDate, values.issueDate);
        if (dueDateError) {
          errors.dueDate = dueDateError.message;
        }
      }
      // paidAt validation (only for paid status)
      if (status === 'paid') {
        const paidAtError = validatePaidAt(
          values.paidAt || null,
          status,
          values.issueDate,
          today
        );
        if (paidAtError) {
          errors.paidAt = paidAtError.message;
        }
      }
    }
  }

  // Line items validation
  const lineItemErrors = validateLineItems(lineItems);
  if (lineItemErrors.length > 0) {
    errors.lineItems = lineItemErrors[0].message;
  }

  // Total validation
  const totalError = validateDocumentTotal(lineItems);
  if (totalError) {
    errors.total = totalError.message;
  }

  return errors;
}

// === Testable Create Helper ===

/**
 * Perform document creation via domain service.
 * Extracted from save() callback for testability (renderHook unavailable in node test env).
 * The hook's save() delegates to this function for new documents.
 */
export async function performDocumentCreate(
  state: DocumentEditState,
  customerId: string | null,
  isPro: boolean
): Promise<{ document: Document | null; errorMessage: string | null }> {
  const carriedForwardAmount = state.values.carriedForwardAmount
    ? parseInt(state.values.carriedForwardAmount, 10)
    : null;
  const input: CreateDocumentInput = {
    type: state.values.type,
    clientName: state.values.clientName,
    clientAddress: state.values.clientAddress || null,
    customerId,
    subject: state.values.subject || null,
    issueDate: state.values.issueDate,
    validUntil:
      state.values.type === 'estimate'
        ? state.values.validUntil || null
        : null,
    dueDate:
      state.values.type === 'invoice'
        ? state.values.dueDate || null
        : null,
    lineItems: state.lineItems.map(({ id, ...rest }) => rest),
    carriedForwardAmount:
      carriedForwardAmount && !isNaN(carriedForwardAmount)
        ? carriedForwardAmount
        : null,
    notes: state.values.notes || null,
  };

  const result = await createDocument(input, { isPro });
  if (result.success && result.data) {
    return { document: result.data, errorMessage: null };
  }
  return {
    document: null,
    errorMessage: result.error?.message ?? '保存に失敗しました',
  };
}

// === Hook ===

export interface UseDocumentEditReturn {
  /** Current form state */
  state: DocumentEditState;
  /** Update a form field */
  updateField: (field: keyof DocumentFormValues, value: string) => void;
  /** Update customer ID (set to null to unlink) */
  updateCustomerId: (customerId: string | null) => void;
  /** Update line items from useLineItemEditor */
  updateLineItems: (items: LineItem[]) => void;
  /** Save the document (create or update) */
  save: () => Promise<Document | null>;
  /** Change document status */
  changeStatus: (newStatus: DocumentStatus, paidAt?: string) => Promise<boolean>;
  /** Validate form and return whether valid */
  validate: () => boolean;
  /** Get allowed status transitions */
  getAllowedStatuses: () => DocumentStatus[];
  /** Check if a field is editable based on status */
  isFieldEditable: (field: keyof Document) => boolean;
  /** Check if status requires paidAt */
  requiresPaidAt: (targetStatus: DocumentStatus) => boolean;
  /** Whether to show sent document edit warning dialog */
  shouldShowSentWarning: boolean;
  /** Acknowledge the sent document edit warning */
  acknowledgeSentWarning: () => void;
}

/**
 * Hook for document editing
 *
 * @param documentId - Document ID to load, or 'new' for new document
 * @param documentType - Document type for new documents
 * @param isPro - Whether the user has Pro access (passed to domain layer for limit checks)
 */
export function useDocumentEdit(
  documentId: string | null,
  documentType: DocumentType = 'estimate',
  isPro: boolean = false
): UseDocumentEditReturn {
  const [state, dispatch] = useReducer(documentEditReducer, initialState);

  // Sent document edit warning state
  const [hasSentWarningAcknowledged, setHasSentWarningAcknowledged] = useState(false);

  // Reset acknowledgement when document changes
  useEffect(() => {
    setHasSentWarningAcknowledged(false);
  }, [documentId]);

  // Load document on mount
  useEffect(() => {
    async function loadDocument() {
      if (!documentId || documentId === 'new') {
        dispatch({ type: 'LOAD_NEW', docType: documentType });
        return;
      }

      dispatch({ type: 'START_LOADING' });

      try {
        const result = await getDocument(documentId);
        if (result.success && result.data) {
          dispatch({ type: 'LOAD_SUCCESS', document: result.data });
        } else {
          dispatch({
            type: 'LOAD_ERROR',
            message: result.error?.message ?? '書類の読み込みに失敗しました',
          });
        }
      } catch (err) {
        dispatch({
          type: 'LOAD_ERROR',
          message: '書類の読み込みに失敗しました',
        });
      }
    }

    loadDocument();
  }, [documentId, documentType]);

  const updateField = useCallback(
    (field: keyof DocumentFormValues, value: string) => {
      dispatch({ type: 'UPDATE_FIELD', field, value });
    },
    []
  );

  const updateCustomerId = useCallback((customerId: string | null) => {
    dispatch({ type: 'UPDATE_CUSTOMER_ID', customerId });
  }, []);

  const updateLineItems = useCallback((items: LineItem[]) => {
    dispatch({ type: 'UPDATE_LINE_ITEMS', lineItems: items });
  }, []);

  const validate = useCallback((): boolean => {
    const errors = validateFormValues(state.values, state.lineItems, state.status);
    dispatch({ type: 'SET_ERRORS', errors });
    return Object.keys(errors).length === 0;
  }, [state.values, state.lineItems, state.status]);

  const save = useCallback(async (): Promise<Document | null> => {
    // Validate first
    const errors = validateFormValues(state.values, state.lineItems, state.status);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors });
      return null;
    }

    dispatch({ type: 'START_SAVING' });

    try {
      if (!state.documentId) {
        // Create new document (delegates to extracted helper)
        const { document, errorMessage } = await performDocumentCreate(
          state,
          state.customerId,
          isPro
        );
        if (document) {
          dispatch({ type: 'SAVE_SUCCESS', document });
          return document;
        } else {
          dispatch({ type: 'SAVE_ERROR', message: errorMessage! });
          return null;
        }
      } else {
        // Update existing document
        const carriedForwardAmountUpdate = state.values.carriedForwardAmount
          ? parseInt(state.values.carriedForwardAmount, 10)
          : null;
        const input: UpdateDocumentInput = {
          clientName: state.values.clientName,
          clientAddress: state.values.clientAddress || null,
          customerId: state.customerId,
          subject: state.values.subject || null,
          issueDate: state.values.issueDate,
          validUntil:
            state.values.type === 'estimate'
              ? state.values.validUntil || null
              : null,
          dueDate:
            state.values.type === 'invoice'
              ? state.values.dueDate || null
              : null,
          lineItems: state.lineItems.map(({ id, ...rest }) => rest),
          carriedForwardAmount:
            carriedForwardAmountUpdate && !isNaN(carriedForwardAmountUpdate)
              ? carriedForwardAmountUpdate
              : null,
          notes: state.values.notes || null,
        };

        const result = await updateDocument(state.documentId, input);
        if (result.success && result.data) {
          dispatch({ type: 'SAVE_SUCCESS', document: result.data });
          return result.data;
        } else {
          dispatch({
            type: 'SAVE_ERROR',
            message: result.error?.message ?? '保存に失敗しました',
          });
          return null;
        }
      }
    } catch (err) {
      dispatch({
        type: 'SAVE_ERROR',
        message: '保存に失敗しました',
      });
      return null;
    }
  }, [state.documentId, state.values, state.lineItems, state.status, state.customerId, isPro]);

  const changeStatus = useCallback(
    async (newStatus: DocumentStatus, paidAt?: string): Promise<boolean> => {
      if (!state.documentId) {
        return false;
      }

      try {
        const result = await changeDocumentStatus(
          state.documentId,
          newStatus,
          paidAt
        );
        if (result.success && result.data) {
          dispatch({ type: 'STATUS_CHANGE_SUCCESS', document: result.data });
          return true;
        } else {
          dispatch({
            type: 'SAVE_ERROR',
            message: result.error?.message ?? 'ステータス変更に失敗しました',
          });
          return false;
        }
      } catch (err) {
        dispatch({
          type: 'SAVE_ERROR',
          message: 'ステータス変更に失敗しました',
        });
        return false;
      }
    },
    [state.documentId]
  );

  const getAllowedStatuses = useCallback((): DocumentStatus[] => {
    return getAllowedTransitions(state.values.type, state.status);
  }, [state.values.type, state.status]);

  const isFieldEditable = useCallback(
    (field: keyof Document): boolean => {
      const editableFields = getEditableFields(state.status);
      return editableFields.has(field);
    },
    [state.status]
  );

  const requiresPaidAt = useCallback(
    (targetStatus: DocumentStatus): boolean => {
      const requirements = getTransitionRequirements(
        state.values.type,
        state.status,
        targetStatus
      );
      return requirements?.requiresPaidAt ?? false;
    },
    [state.values.type, state.status]
  );

  // Compute whether to show sent warning
  // Show warning when status is 'sent' and not yet acknowledged
  const shouldShowSentWarning = state.status === 'sent' && !hasSentWarningAcknowledged;

  // Acknowledge sent warning to allow editing
  const acknowledgeSentWarning = useCallback(() => {
    setHasSentWarningAcknowledged(true);
  }, []);

  return {
    state,
    updateField,
    updateCustomerId,
    updateLineItems,
    save,
    changeStatus,
    validate,
    getAllowedStatuses,
    isFieldEditable,
    requiresPaidAt,
    shouldShowSentWarning,
    acknowledgeSentWarning,
  };
}
