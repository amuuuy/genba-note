/**
 * WriteQueue Tests
 *
 * Tests for the write queue utility that serializes async operations
 * to prevent RMW (Read-Modify-Write) race conditions.
 */

import {
  createWriteQueue,
  documentsQueue,
  unitPricesQueue,
  settingsQueue,
  customersQueue,
} from '../../src/utils/writeQueue';

// Helper to create a delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('writeQueue', () => {
  describe('createWriteQueue', () => {
    it('should execute single operation and return result', async () => {
      const queue = createWriteQueue();
      const result = await queue.enqueue(async () => 'done');
      expect(result).toBe('done');
    });

    it('should execute async operation that returns a value', async () => {
      const queue = createWriteQueue();
      const result = await queue.enqueue(async () => {
        await delay(10);
        return 42;
      });
      expect(result).toBe(42);
    });

    it('should serialize concurrent operations in order', async () => {
      const queue = createWriteQueue();
      const executionOrder: number[] = [];

      const op1 = queue.enqueue(async () => {
        executionOrder.push(1);
        await delay(30);
        executionOrder.push(2);
        return 'op1';
      });

      const op2 = queue.enqueue(async () => {
        executionOrder.push(3);
        await delay(10);
        executionOrder.push(4);
        return 'op2';
      });

      const op3 = queue.enqueue(async () => {
        executionOrder.push(5);
        return 'op3';
      });

      const results = await Promise.all([op1, op2, op3]);

      // Operations should complete in order (1,2 then 3,4 then 5)
      expect(executionOrder).toEqual([1, 2, 3, 4, 5]);
      expect(results).toEqual(['op1', 'op2', 'op3']);
    });

    it('should propagate errors without blocking subsequent operations', async () => {
      const queue = createWriteQueue();

      const op1 = queue.enqueue(async () => {
        throw new Error('op1 failed');
      });

      await expect(op1).rejects.toThrow('op1 failed');

      // Queue should still work after error
      const op2 = await queue.enqueue(async () => 'op2 success');
      expect(op2).toBe('op2 success');
    });

    it('should release lock even when operation throws', async () => {
      const queue = createWriteQueue();
      const executionOrder: string[] = [];

      const op1 = queue.enqueue(async () => {
        executionOrder.push('op1 start');
        throw new Error('fail');
      });

      const op2 = queue.enqueue(async () => {
        executionOrder.push('op2 start');
        return 'recovered';
      });

      await expect(op1).rejects.toThrow('fail');
      const result = await op2;

      expect(result).toBe('recovered');
      expect(executionOrder).toEqual(['op1 start', 'op2 start']);
    });

    it('should handle nested async operations', async () => {
      const queue = createWriteQueue();
      const result = await queue.enqueue(async () => {
        const inner = await Promise.resolve('inner');
        return `outer-${inner}`;
      });
      expect(result).toBe('outer-inner');
    });

    it('should work with typed return values', async () => {
      const queue = createWriteQueue();

      interface Result {
        id: string;
        value: number;
      }

      const result = await queue.enqueue<Result>(async () => ({
        id: 'test',
        value: 123,
      }));

      expect(result.id).toBe('test');
      expect(result.value).toBe(123);
    });
  });

  describe('pre-created queues', () => {
    it('should have independent documentsQueue', async () => {
      const result = await documentsQueue.enqueue(async () => 'doc');
      expect(result).toBe('doc');
    });

    it('should have independent unitPricesQueue', async () => {
      const result = await unitPricesQueue.enqueue(async () => 'price');
      expect(result).toBe('price');
    });

    it('should have independent settingsQueue', async () => {
      const result = await settingsQueue.enqueue(async () => 'settings');
      expect(result).toBe('settings');
    });

    it('should have independent customersQueue', async () => {
      const result = await customersQueue.enqueue(async () => 'customer');
      expect(result).toBe('customer');
    });

    it('should allow parallel operations across different queues', async () => {
      const startTime = Date.now();

      // All queues should run in parallel
      const results = await Promise.all([
        documentsQueue.enqueue(async () => {
          await delay(50);
          return 'doc';
        }),
        unitPricesQueue.enqueue(async () => {
          await delay(50);
          return 'price';
        }),
        settingsQueue.enqueue(async () => {
          await delay(50);
          return 'settings';
        }),
        customersQueue.enqueue(async () => {
          await delay(50);
          return 'customer';
        }),
      ]);

      const elapsed = Date.now() - startTime;

      expect(results).toEqual(['doc', 'price', 'settings', 'customer']);
      // Should complete in ~50ms (parallel), not ~200ms (serial)
      expect(elapsed).toBeLessThan(150);
    });
  });

  describe('RMW simulation', () => {
    it('should prevent data loss in simulated concurrent RMW operations', async () => {
      const queue = createWriteQueue();

      // Simulate shared state (like AsyncStorage)
      let sharedData: string[] = [];

      // Simulate RMW operation: read -> modify -> write
      const rmwOperation = async (item: string) => {
        return queue.enqueue(async () => {
          // Read
          const current = [...sharedData];
          // Simulate async delay (like actual storage read)
          await delay(10);
          // Modify
          current.push(item);
          // Write
          sharedData = current;
          return current.length;
        });
      };

      // Launch multiple concurrent RMW operations
      const results = await Promise.all([
        rmwOperation('a'),
        rmwOperation('b'),
        rmwOperation('c'),
      ]);

      // All items should be present (no data loss)
      expect(sharedData).toHaveLength(3);
      expect(sharedData).toContain('a');
      expect(sharedData).toContain('b');
      expect(sharedData).toContain('c');

      // Results should show incremental lengths
      expect(results).toEqual([1, 2, 3]);
    });

    it('should demonstrate data loss WITHOUT queue (for comparison)', async () => {
      // This test shows what happens without the queue
      // It's expected to potentially lose data

      let sharedData: string[] = [];

      // Unprotected RMW operation
      const unsafeRmwOperation = async (item: string) => {
        // Read
        const current = [...sharedData];
        // Simulate async delay
        await delay(10);
        // Modify
        current.push(item);
        // Write (might overwrite concurrent changes)
        sharedData = current;
        return current.length;
      };

      // Launch concurrent operations without queue
      await Promise.all([
        unsafeRmwOperation('a'),
        unsafeRmwOperation('b'),
        unsafeRmwOperation('c'),
      ]);

      // Without queue, likely to have fewer than 3 items due to race condition
      // This is a probabilistic test - the race condition may not always manifest
      // but demonstrates the problem the queue solves
      // We don't assert here because the behavior is non-deterministic
      console.log(
        `Unsafe RMW result: ${sharedData.length} items (expected data loss)`
      );
    });
  });
});
