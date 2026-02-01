/**
 * Performance Measurement Utilities
 *
 * Provides tools for measuring and verifying performance targets:
 * - Startup time: < 3 seconds
 * - Screen transitions: < 0.3 seconds
 * - List scrolling: 60 FPS, < 5% jank
 * - PDF generation: < 5 seconds
 *
 * Based on SPEC 3.3 performance requirements.
 */

// Check if in development mode (React Native provides __DEV__ global)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isDev = typeof (global as any).__DEV__ !== 'undefined'
  ? (global as any).__DEV__
  : process.env.NODE_ENV !== 'production';

/**
 * Performance measurement result
 */
export interface PerformanceMeasure {
  /** Name/identifier of the measurement */
  name: string;
  /** Start timestamp (ms since epoch) */
  startTime: number;
  /** End timestamp (ms since epoch) */
  endTime: number;
  /** Duration in milliseconds */
  duration: number;
}

/**
 * Performance targets from SPEC 3.3
 */
export const PERFORMANCE_TARGETS = {
  /** Maximum startup time in milliseconds */
  STARTUP_TIME_MS: 3000,
  /** Maximum screen transition time in milliseconds */
  TRANSITION_TIME_MS: 300,
  /** Target frame time for 60 FPS in milliseconds */
  FRAME_TIME_MS: 16.67,
  /** Maximum PDF generation time in milliseconds */
  PDF_GENERATION_TIME_MS: 5000,
  /** Maximum jank percentage (frames exceeding 16ms) */
  MAX_JANK_PERCENT: 5,
} as const;

/**
 * Performance marks (named timestamps)
 */
type PerformanceMarks = Map<string, number>;

/**
 * Maximum number of measures to retain (prevents unbounded memory growth)
 */
const MAX_MEASURES = 100;

/**
 * Performance monitor for tracking app performance metrics.
 *
 * Usage:
 * ```ts
 * // Mark the start of an operation
 * performanceMonitor.mark('app-start');
 *
 * // ... do work ...
 *
 * // Mark the end and measure
 * performanceMonitor.mark('app-ready');
 * const measure = performanceMonitor.measure('app-startup', 'app-start', 'app-ready');
 *
 * // Check against targets
 * if (measure && measure.duration > PERFORMANCE_TARGETS.STARTUP_TIME_MS) {
 *   console.warn('Startup time exceeded target');
 * }
 * ```
 */
class PerformanceMonitor {
  private marks: PerformanceMarks = new Map();
  private measures: PerformanceMeasure[] = [];
  private maxMeasures: number = MAX_MEASURES;

  /**
   * Create a named timestamp mark.
   *
   * @param name - Unique identifier for this mark
   */
  mark(name: string): void {
    this.marks.set(name, Date.now());
  }

  /**
   * Measure the duration between two marks.
   *
   * @param name - Name for this measurement
   * @param startMark - Name of the start mark
   * @param endMark - Name of the end mark (defaults to current time if not provided)
   * @returns The measurement result, or null if start mark not found
   */
  measure(
    name: string,
    startMark: string,
    endMark?: string
  ): PerformanceMeasure | null {
    const startTime = this.marks.get(startMark);
    const endTime = endMark ? this.marks.get(endMark) : Date.now();

    if (startTime === undefined) {
      if (isDev) {
        console.warn(`[PerformanceMonitor] Mark "${startMark}" not found`);
      }
      return null;
    }

    if (endMark && endTime === undefined) {
      if (isDev) {
        console.warn(`[PerformanceMonitor] Mark "${endMark}" not found`);
      }
      return null;
    }

    const measure: PerformanceMeasure = {
      name,
      startTime,
      endTime: endTime!,
      duration: endTime! - startTime,
    };

    this.measures.push(measure);

    // Enforce maximum measures limit (ring buffer behavior)
    if (this.measures.length > this.maxMeasures) {
      this.measures.shift();
    }

    if (isDev) {
      console.log(
        `[Performance] ${name}: ${measure.duration}ms`
      );
    }

    return measure;
  }

  /**
   * Get all recorded measurements.
   *
   * @returns Copy of all measurements
   */
  getMeasures(): PerformanceMeasure[] {
    return [...this.measures];
  }

  /**
   * Get a specific measurement by name (returns the most recent if duplicates exist).
   *
   * @param name - Name of the measurement to find
   * @returns The most recent measurement with that name, or undefined if not found
   */
  getMeasure(name: string): PerformanceMeasure | undefined {
    // Search from end to return most recent measurement
    for (let i = this.measures.length - 1; i >= 0; i--) {
      if (this.measures[i].name === name) {
        return this.measures[i];
      }
    }
    return undefined;
  }

  /**
   * Clear all marks and measurements.
   */
  clear(): void {
    this.marks.clear();
    this.measures.length = 0;
  }

  /**
   * Verify startup time meets the target.
   *
   * @param measureName - Name of the startup measurement (default: 'app-startup')
   * @param maxMs - Maximum allowed time in ms (default: PERFORMANCE_TARGETS.STARTUP_TIME_MS)
   * @returns true if startup time is within limit, false otherwise
   */
  verifyStartupTime(
    measureName: string = 'app-startup',
    maxMs: number = PERFORMANCE_TARGETS.STARTUP_TIME_MS
  ): boolean {
    const measure = this.getMeasure(measureName);
    return measure ? measure.duration <= maxMs : false;
  }

  /**
   * Verify transition time meets the target.
   *
   * @param measureName - Name of the transition measurement
   * @param maxMs - Maximum allowed time in ms (default: PERFORMANCE_TARGETS.TRANSITION_TIME_MS)
   * @returns true if transition time is within limit, false otherwise
   */
  verifyTransitionTime(
    measureName: string,
    maxMs: number = PERFORMANCE_TARGETS.TRANSITION_TIME_MS
  ): boolean {
    const measure = this.getMeasure(measureName);
    return measure ? measure.duration <= maxMs : false;
  }

  /**
   * Calculate median duration for a set of measurements.
   * Useful for SPEC requirement: "measure 5 times, use median value"
   *
   * @param measureNames - Array of measurement names to calculate median from
   * @returns The median duration, or null if no valid measurements
   */
  calculateMedian(measureNames: string[]): number | null {
    const durations = measureNames
      .map((name) => this.getMeasure(name))
      .filter((m): m is PerformanceMeasure => m !== undefined)
      .map((m) => m.duration)
      .sort((a, b) => a - b);

    if (durations.length === 0) {
      return null;
    }

    const mid = Math.floor(durations.length / 2);
    return durations.length % 2 !== 0
      ? durations[mid]
      : (durations[mid - 1] + durations[mid]) / 2;
  }

  /**
   * Get a summary of all measurements for logging.
   *
   * @returns Formatted summary string
   */
  getSummary(): string {
    if (this.measures.length === 0) {
      return 'No measurements recorded';
    }

    return this.measures
      .map((m) => `${m.name}: ${m.duration}ms`)
      .join('\n');
  }
}

/**
 * Singleton performance monitor instance.
 * Use this for all performance measurements across the app.
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Measure render time for a component (development only).
 * Logs a warning if render exceeds target frame time.
 *
 * @param componentName - Name of the component being measured
 * @returns Object with markRenderComplete callback
 *
 * @example
 * function MyComponent() {
 *   const { markRenderComplete } = useRenderPerformance('MyComponent');
 *
 *   useEffect(() => {
 *     markRenderComplete();
 *   }, []);
 *
 *   return <View>...</View>;
 * }
 */
export function useRenderPerformance(componentName: string) {
  const startTime = Date.now();

  return {
    /**
     * Call this when render is complete to log performance.
     */
    markRenderComplete: () => {
      if (isDev) {
        const duration = Date.now() - startTime;
        if (duration > PERFORMANCE_TARGETS.FRAME_TIME_MS) {
          console.warn(
            `[Performance] ${componentName} render took ${duration}ms (target: <${PERFORMANCE_TARGETS.FRAME_TIME_MS}ms)`
          );
        }
      }
    },
  };
}

/**
 * Time an async operation and return its result with duration.
 *
 * @param name - Name for the measurement
 * @param operation - Async operation to time
 * @returns Object with result and duration
 *
 * @example
 * const { result, duration } = await timeAsync('pdf-generation', async () => {
 *   return await generatePdf(document);
 * });
 *
 * if (duration > PERFORMANCE_TARGETS.PDF_GENERATION_TIME_MS) {
 *   console.warn('PDF generation too slow');
 * }
 */
export async function timeAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await operation();
  const duration = Date.now() - startTime;

  if (isDev) {
    console.log(`[Performance] ${name}: ${duration}ms`);
  }

  return { result, duration };
}
