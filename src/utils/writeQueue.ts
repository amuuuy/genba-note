/**
 * WriteQueue - Serializes async write operations to prevent RMW race conditions
 *
 * Based on the mutex pattern from autoNumberingService.ts.
 * Each queue ensures that operations are executed one at a time,
 * preventing Read-Modify-Write race conditions when multiple
 * concurrent writes access the same storage key.
 *
 * Usage:
 * ```typescript
 * const result = await documentsQueue.enqueue(async () => {
 *   const data = await readData();
 *   const modified = modifyData(data);
 *   await writeData(modified);
 *   return modified;
 * });
 * ```
 */

/**
 * WriteQueue interface for serializing async operations
 */
export interface WriteQueue {
  /**
   * Enqueue an operation to be executed serially.
   * Operations are guaranteed to execute one at a time, in order.
   *
   * @param fn - Async function to execute
   * @returns Promise resolving to the function's return value
   */
  enqueue<T>(fn: () => Promise<T>): Promise<T>;
}

/**
 * Creates a new write queue instance.
 *
 * The queue uses a Promise chain to ensure operations execute serially.
 * Each new operation waits for all previous operations to complete
 * before starting.
 *
 * @returns A new WriteQueue instance
 *
 * @example
 * const queue = createWriteQueue();
 *
 * // These will execute in order, not concurrently
 * const [result1, result2] = await Promise.all([
 *   queue.enqueue(async () => { ... }),
 *   queue.enqueue(async () => { ... }),
 * ]);
 */
export function createWriteQueue(): WriteQueue {
  let currentLock: Promise<void> = Promise.resolve();

  return {
    async enqueue<T>(fn: () => Promise<T>): Promise<T> {
      // Capture the current lock to wait on
      const previousLock = currentLock;

      // Create a new lock for this operation
      let releaseLock: () => void;
      currentLock = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });

      try {
        // Wait for all previous operations to complete
        await previousLock;
        // Execute our operation exclusively
        return await fn();
      } finally {
        // Always release lock, even on error
        releaseLock!();
      }
    },
  };
}

// === Pre-created queues for each resource type ===

/**
 * Queue for document write operations.
 * Protects: saveDocument, deleteDocument in asyncStorageService.
 */
export const documentsQueue = createWriteQueue();

/**
 * Queue for unit price write operations.
 * Protects: saveUnitPrice, deleteUnitPrice in asyncStorageService.
 */
export const unitPricesQueue = createWriteQueue();

/**
 * Queue for settings write operations.
 * Protects: saveSettings, updateSettings in asyncStorageService.
 * Also used by autoNumberingService for document number generation.
 */
export const settingsQueue = createWriteQueue();

/**
 * Queue for customer write operations.
 * Protects: createCustomer, updateCustomer, deleteCustomer in customerService.
 */
export const customersQueue = createWriteQueue();

/**
 * Queue for customer photo write operations.
 * Protects: addPhoto, deletePhoto, deletePhotosByCustomer in customerPhotoService.
 */
export const photosQueue = createWriteQueue();

/**
 * Queue for work log entry write operations.
 * Protects: createWorkLogEntry, updateWorkLogEntry, deleteWorkLogEntry in workLogEntryService.
 */
export const workLogEntriesQueue = createWriteQueue();

/**
 * Queue for finance entry write operations.
 * Protects: saveFinanceEntry, deleteFinanceEntry in financeStorage.
 */
export const financeEntriesQueue = createWriteQueue();

/**
 * Queue for finance photo write operations.
 * Protects: addFinancePhoto, deleteFinancePhoto in financePhotoStorage.
 */
export const financePhotosQueue = createWriteQueue();

/**
 * Queue for calendar event write operations.
 * Protects: addCalendarEvent, updateCalendarEvent, deleteCalendarEvent in calendarEventStorage.
 */
export const calendarEventsQueue = createWriteQueue();
