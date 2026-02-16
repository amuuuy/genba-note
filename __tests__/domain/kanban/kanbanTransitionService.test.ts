/**
 * kanbanTransitionService tests
 *
 * Tests for the pure function that resolves a kanban drop action
 * into a status transition, respecting the transition rules from
 * statusTransitionService.
 */

import { resolveDropTransition } from '@/domain/kanban/kanbanTransitionService';

describe('kanbanTransitionService', () => {
  describe('resolveDropTransition', () => {
    // === Invoice valid transitions ===

    it('invoice draft → sent_waiting = sent', () => {
      const result = resolveDropTransition('draft', 'sent_waiting', 'invoice');
      expect(result).toEqual({ newStatus: 'sent' });
    });

    it('invoice draft → completed = issued (draft→paid is forbidden)', () => {
      const result = resolveDropTransition('draft', 'completed', 'invoice');
      expect(result).toEqual({ newStatus: 'issued' });
    });

    it('invoice sent → completed = paid with requiresPaidAt', () => {
      const result = resolveDropTransition('sent', 'completed', 'invoice');
      expect(result).toEqual({ newStatus: 'paid', requiresPaidAt: true });
    });

    it('invoice sent → working = draft', () => {
      const result = resolveDropTransition('sent', 'working', 'invoice');
      expect(result).toEqual({ newStatus: 'draft' });
    });

    it('invoice paid → sent_waiting = sent', () => {
      const result = resolveDropTransition('paid', 'sent_waiting', 'invoice');
      expect(result).toEqual({ newStatus: 'sent' });
    });

    it('invoice issued → working = draft', () => {
      const result = resolveDropTransition('issued', 'working', 'invoice');
      expect(result).toEqual({ newStatus: 'draft' });
    });

    // === Estimate valid transitions ===

    it('estimate draft → sent_waiting = sent', () => {
      const result = resolveDropTransition('draft', 'sent_waiting', 'estimate');
      expect(result).toEqual({ newStatus: 'sent' });
    });

    it('estimate draft → completed = issued', () => {
      const result = resolveDropTransition('draft', 'completed', 'estimate');
      expect(result).toEqual({ newStatus: 'issued' });
    });

    it('estimate sent → working = draft', () => {
      const result = resolveDropTransition('sent', 'working', 'estimate');
      expect(result).toEqual({ newStatus: 'draft' });
    });

    it('estimate issued → working = draft', () => {
      const result = resolveDropTransition('issued', 'working', 'estimate');
      expect(result).toEqual({ newStatus: 'draft' });
    });

    it('estimate issued → sent_waiting = sent', () => {
      const result = resolveDropTransition('issued', 'sent_waiting', 'estimate');
      expect(result).toEqual({ newStatus: 'sent' });
    });

    it('invoice issued → sent_waiting = sent', () => {
      const result = resolveDropTransition('issued', 'sent_waiting', 'invoice');
      expect(result).toEqual({ newStatus: 'sent' });
    });

    // === Invalid transitions (snap-back) ===

    it('estimate sent → completed = issued', () => {
      const result = resolveDropTransition('sent', 'completed', 'estimate');
      expect(result).toEqual({ newStatus: 'issued' });
    });

    it('invoice paid → working = null (must go through sent)', () => {
      const result = resolveDropTransition('paid', 'working', 'invoice');
      expect(result).toBeNull();
    });

    // === Same column drops (silent snap-back, no error) ===

    it('draft → working (same column) = null', () => {
      const result = resolveDropTransition('draft', 'working', 'invoice');
      expect(result).toBeNull();
    });

    it('sent → sent_waiting (same column) = null', () => {
      const result = resolveDropTransition('sent', 'sent_waiting', 'invoice');
      expect(result).toBeNull();
    });

    it('paid → completed (same column) = null', () => {
      const result = resolveDropTransition('paid', 'completed', 'invoice');
      expect(result).toBeNull();
    });

    it('issued → completed (same column) = null', () => {
      const result = resolveDropTransition('issued', 'completed', 'estimate');
      expect(result).toBeNull();
    });
  });
});
