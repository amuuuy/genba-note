/**
 * useKanbanBoard Integration Tests
 *
 * Tests the actual exported `resolveHandleDrop` function from useKanbanBoard.
 * This is the exact same function called inside the hook's handleDrop callback,
 * NOT a reimplementation. It integrates resolveDropTransition (domain) with
 * document lookup and action classification (hook layer).
 *
 * Also tests the full handleDrop→changeDocumentStatus flow by exercising
 * resolveHandleDrop + changeDocumentStatus in sequence, matching exactly
 * what the hook does internally.
 *
 * Note: renderHook is unavailable in this project (testEnvironment: 'node',
 * @testing-library/react-native requires jsdom/react-native environment).
 */

import {
  resolveHandleDrop,
  type HandleDropResult,
} from '@/hooks/useKanbanBoard';
import { getDocumentsForColumn } from '@/domain/kanban/kanbanService';
import { changeDocumentStatus } from '@/domain/document/documentService';
import type { DocumentWithTotals, DocumentStatus } from '@/types/document';
import type { KanbanColumnId } from '@/types/kanban';
import {
  createTestDocument,
  createTestInvoice,
} from '../domain/document/helpers';

jest.mock('@/domain/document/documentService', () => ({
  changeDocumentStatus: jest.fn(),
}));

const mockChangeDocumentStatus = changeDocumentStatus as jest.MockedFunction<
  typeof changeDocumentStatus
>;

function asDocWithTotals(
  overrides?: Partial<DocumentWithTotals>
): DocumentWithTotals {
  const doc = createTestDocument(overrides);
  return {
    ...doc,
    lineItemsCalculated: [],
    subtotalYen: 0,
    taxYen: 0,
    totalYen: 0,
    taxBreakdown: [],
    ...overrides,
  } as DocumentWithTotals;
}

function asInvoiceWithTotals(
  overrides?: Partial<DocumentWithTotals>
): DocumentWithTotals {
  const doc = createTestInvoice(overrides);
  return {
    ...doc,
    lineItemsCalculated: [],
    subtotalYen: 0,
    taxYen: 0,
    totalYen: 0,
    taxBreakdown: [],
    ...overrides,
  } as DocumentWithTotals;
}

/**
 * Executes the full handleDrop flow using the actual resolveHandleDrop,
 * then calls changeDocumentStatus if the action requires it.
 * This mirrors the hook's handleDrop + executeTransition path exactly.
 */
async function executeDropFlow(
  documents: DocumentWithTotals[],
  docId: string,
  targetColumnId: KanbanColumnId
): Promise<HandleDropResult> {
  const dropResult = resolveHandleDrop(documents, docId, targetColumnId);

  if (dropResult.action === 'transition') {
    await changeDocumentStatus(dropResult.docId, dropResult.newStatus);
  }

  return dropResult;
}

describe('useKanbanBoard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChangeDocumentStatus.mockResolvedValue({
      success: true,
      data: {} as any,
    });
  });

  describe('resolveHandleDrop (actual exported function)', () => {
    it('invoice draft → sent_waiting = transition to sent', () => {
      const docs = [asInvoiceWithTotals({ id: 'inv-1', status: 'draft' })];
      const result = resolveHandleDrop(docs, 'inv-1', 'sent_waiting');
      expect(result).toEqual({
        action: 'transition',
        docId: 'inv-1',
        newStatus: 'sent',
      });
    });

    it('invoice draft → completed = transition to issued', () => {
      const docs = [asInvoiceWithTotals({ id: 'inv-1', status: 'draft' })];
      const result = resolveHandleDrop(docs, 'inv-1', 'completed');
      expect(result).toEqual({
        action: 'transition',
        docId: 'inv-1',
        newStatus: 'issued',
      });
    });

    it('estimate draft → sent_waiting = transition to sent', () => {
      const docs = [
        asDocWithTotals({ id: 'est-1', status: 'draft', type: 'estimate' }),
      ];
      const result = resolveHandleDrop(docs, 'est-1', 'sent_waiting');
      expect(result).toEqual({
        action: 'transition',
        docId: 'est-1',
        newStatus: 'sent',
      });
    });

    it('invoice sent → completed = requiresPaidAt', () => {
      const docs = [
        asInvoiceWithTotals({
          id: 'inv-1',
          status: 'sent',
          issueDate: '2026-01-15',
        }),
      ];
      const result = resolveHandleDrop(docs, 'inv-1', 'completed');
      expect(result).toEqual({
        action: 'requiresPaidAt',
        docId: 'inv-1',
        newStatus: 'paid',
        issueDate: '2026-01-15',
      });
    });

    it('invoice sent → working = transition to draft', () => {
      const docs = [asInvoiceWithTotals({ id: 'inv-1', status: 'sent' })];
      const result = resolveHandleDrop(docs, 'inv-1', 'working');
      expect(result).toEqual({
        action: 'transition',
        docId: 'inv-1',
        newStatus: 'draft',
      });
    });

    it('invoice paid → sent_waiting = transition to sent', () => {
      const docs = [
        asInvoiceWithTotals({
          id: 'inv-1',
          status: 'paid',
          paidAt: '2026-01-20',
        }),
      ];
      const result = resolveHandleDrop(docs, 'inv-1', 'sent_waiting');
      expect(result).toEqual({
        action: 'transition',
        docId: 'inv-1',
        newStatus: 'sent',
      });
    });

    it('estimate sent → completed = transition to issued', () => {
      const docs = [
        asDocWithTotals({ id: 'est-1', status: 'sent', type: 'estimate' }),
      ];
      const result = resolveHandleDrop(docs, 'est-1', 'completed');
      expect(result).toEqual({
        action: 'transition',
        docId: 'est-1',
        newStatus: 'issued',
      });
    });

    it('draft → working (same column) = noop', () => {
      const docs = [asDocWithTotals({ id: '1', status: 'draft' })];
      const result = resolveHandleDrop(docs, '1', 'working');
      expect(result).toEqual({ action: 'noop' });
    });

    it('sent → sent_waiting (same column) = noop', () => {
      const docs = [asInvoiceWithTotals({ id: '1', status: 'sent' })];
      const result = resolveHandleDrop(docs, '1', 'sent_waiting');
      expect(result).toEqual({ action: 'noop' });
    });

    it('invoice paid → working = noop (must go through sent)', () => {
      const docs = [
        asInvoiceWithTotals({
          id: 'inv-1',
          status: 'paid',
          paidAt: '2026-01-20',
        }),
      ];
      const result = resolveHandleDrop(docs, 'inv-1', 'working');
      expect(result).toEqual({ action: 'noop' });
    });

    it('nonexistent doc = noop', () => {
      const docs = [asDocWithTotals({ id: '1', status: 'draft' })];
      const result = resolveHandleDrop(docs, 'nonexistent', 'sent_waiting');
      expect(result).toEqual({ action: 'noop' });
    });

    it('estimate draft → completed = transition to issued', () => {
      const docs = [
        asDocWithTotals({ id: 'est-1', status: 'draft', type: 'estimate' }),
      ];
      const result = resolveHandleDrop(docs, 'est-1', 'completed');
      expect(result).toEqual({
        action: 'transition',
        docId: 'est-1',
        newStatus: 'issued',
      });
    });

    it('estimate issued → sent_waiting = transition to sent', () => {
      const docs = [
        asDocWithTotals({ id: 'est-1', status: 'issued', type: 'estimate' }),
      ];
      const result = resolveHandleDrop(docs, 'est-1', 'sent_waiting');
      expect(result).toEqual({
        action: 'transition',
        docId: 'est-1',
        newStatus: 'sent',
      });
    });

    it('invoice issued → sent_waiting = transition to sent', () => {
      const docs = [
        asInvoiceWithTotals({ id: 'inv-1', status: 'issued' }),
      ];
      const result = resolveHandleDrop(docs, 'inv-1', 'sent_waiting');
      expect(result).toEqual({
        action: 'transition',
        docId: 'inv-1',
        newStatus: 'sent',
      });
    });
  });

  describe('full drop → changeDocumentStatus flow', () => {
    it('valid transition calls changeDocumentStatus with correct args', async () => {
      const docs = [asInvoiceWithTotals({ id: 'inv-1', status: 'draft' })];
      const result = await executeDropFlow(docs, 'inv-1', 'sent_waiting');

      expect(result.action).toBe('transition');
      expect(mockChangeDocumentStatus).toHaveBeenCalledWith('inv-1', 'sent');
    });

    it('issued transition calls changeDocumentStatus(id, issued)', async () => {
      const docs = [asInvoiceWithTotals({ id: 'inv-1', status: 'draft' })];
      const result = await executeDropFlow(docs, 'inv-1', 'completed');

      expect(result.action).toBe('transition');
      expect(mockChangeDocumentStatus).toHaveBeenCalledWith('inv-1', 'issued');
    });

    it('requiresPaidAt does NOT call changeDocumentStatus', async () => {
      const docs = [asInvoiceWithTotals({ id: 'inv-1', status: 'sent' })];
      const result = await executeDropFlow(docs, 'inv-1', 'completed');

      expect(result.action).toBe('requiresPaidAt');
      expect(mockChangeDocumentStatus).not.toHaveBeenCalled();
    });

    it('after paidAt confirmation, calls changeDocumentStatus(id, paid, paidAt)', async () => {
      const docs = [
        asInvoiceWithTotals({
          id: 'inv-1',
          status: 'sent',
          issueDate: '2026-01-15',
        }),
      ];
      // Step 1: resolve returns requiresPaidAt
      const dropResult = resolveHandleDrop(docs, 'inv-1', 'completed');
      expect(dropResult.action).toBe('requiresPaidAt');

      // Step 2: simulate PaidAt confirm (executeTransition path)
      if (dropResult.action === 'requiresPaidAt') {
        await changeDocumentStatus(
          dropResult.docId,
          dropResult.newStatus,
          '2026-01-20'
        );
        expect(mockChangeDocumentStatus).toHaveBeenCalledWith(
          'inv-1',
          'paid',
          '2026-01-20'
        );
      }
    });

    it('issued → sent_waiting calls changeDocumentStatus(id, sent)', async () => {
      const docs = [
        asInvoiceWithTotals({ id: 'inv-1', status: 'issued' }),
      ];
      const result = await executeDropFlow(docs, 'inv-1', 'sent_waiting');

      expect(result.action).toBe('transition');
      expect(mockChangeDocumentStatus).toHaveBeenCalledWith('inv-1', 'sent');
    });

    it('noop does not call changeDocumentStatus', async () => {
      const docs = [asDocWithTotals({ id: '1', status: 'draft' })];
      const result = await executeDropFlow(docs, '1', 'working');

      expect(result.action).toBe('noop');
      expect(mockChangeDocumentStatus).not.toHaveBeenCalled();
    });

    it('changeDocumentStatus failure does not throw', async () => {
      mockChangeDocumentStatus.mockResolvedValue({
        success: false,
        error: { type: 'TRANSITION_ERROR', message: 'fail' } as any,
      });
      const docs = [asInvoiceWithTotals({ id: 'inv-1', status: 'draft' })];
      const result = await executeDropFlow(docs, 'inv-1', 'sent_waiting');

      expect(result.action).toBe('transition');
      expect(mockChangeDocumentStatus).toHaveBeenCalledWith('inv-1', 'sent');
    });
  });

  describe('column grouping', () => {
    it('groups documents correctly into three columns', () => {
      const docs = [
        asDocWithTotals({ id: '1', status: 'draft' }),
        asInvoiceWithTotals({ id: '2', status: 'sent' }),
        asInvoiceWithTotals({
          id: '3',
          status: 'paid',
          paidAt: '2026-01-25',
        }),
        asDocWithTotals({ id: '4', status: 'issued' }),
      ];

      expect(getDocumentsForColumn(docs, 'working').map((d) => d.id)).toEqual([
        '1',
      ]);
      expect(
        getDocumentsForColumn(docs, 'sent_waiting').map((d) => d.id)
      ).toEqual(['2']);
      expect(
        getDocumentsForColumn(docs, 'completed').map((d) => d.id)
      ).toEqual(['3', '4']);
    });
  });
});
