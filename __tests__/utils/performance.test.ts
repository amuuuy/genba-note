import {
  performanceMonitor,
  PERFORMANCE_TARGETS,
  timeAsync,
} from '../../src/utils/performance';

describe('performance', () => {
  beforeEach(() => {
    performanceMonitor.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('PERFORMANCE_TARGETS', () => {
    it('defines correct performance targets from SPEC 3.3', () => {
      expect(PERFORMANCE_TARGETS.STARTUP_TIME_MS).toBe(3000);
      expect(PERFORMANCE_TARGETS.TRANSITION_TIME_MS).toBe(300);
      expect(PERFORMANCE_TARGETS.FRAME_TIME_MS).toBe(16.67);
      expect(PERFORMANCE_TARGETS.PDF_GENERATION_TIME_MS).toBe(5000);
      expect(PERFORMANCE_TARGETS.MAX_JANK_PERCENT).toBe(5);
    });
  });

  describe('performanceMonitor', () => {
    describe('mark', () => {
      it('creates a timestamp mark', () => {
        performanceMonitor.mark('test-mark');
        // Mark exists, verified by successful measure
        performanceMonitor.mark('test-end');
        const measure = performanceMonitor.measure('test', 'test-mark', 'test-end');
        expect(measure).not.toBeNull();
      });

      it('overwrites existing mark with same name', () => {
        jest.setSystemTime(1000);
        performanceMonitor.mark('start');
        jest.setSystemTime(2000);
        performanceMonitor.mark('start'); // Overwrite
        jest.setSystemTime(3000);
        performanceMonitor.mark('end');

        const measure = performanceMonitor.measure('test', 'start', 'end');
        expect(measure?.duration).toBe(1000); // 3000 - 2000
      });
    });

    describe('measure', () => {
      it('measures duration between marks', () => {
        jest.setSystemTime(1000);
        performanceMonitor.mark('start');
        jest.setSystemTime(1500);
        performanceMonitor.mark('end');

        const measure = performanceMonitor.measure('test', 'start', 'end');
        expect(measure).toEqual({
          name: 'test',
          startTime: 1000,
          endTime: 1500,
          duration: 500,
        });
      });

      it('uses current time when end mark not provided', () => {
        jest.setSystemTime(1000);
        performanceMonitor.mark('start');
        jest.setSystemTime(1300);

        const measure = performanceMonitor.measure('test', 'start');
        expect(measure?.duration).toBe(300);
      });

      it('returns null when start mark not found', () => {
        const measure = performanceMonitor.measure('test', 'nonexistent');
        expect(measure).toBeNull();
      });

      it('returns null when end mark not found', () => {
        performanceMonitor.mark('start');
        const measure = performanceMonitor.measure('test', 'start', 'nonexistent');
        expect(measure).toBeNull();
      });

      it('stores measures for later retrieval', () => {
        jest.setSystemTime(1000);
        performanceMonitor.mark('start');
        jest.setSystemTime(1100);
        performanceMonitor.mark('end');
        performanceMonitor.measure('test1', 'start', 'end');

        jest.setSystemTime(2000);
        performanceMonitor.mark('start2');
        jest.setSystemTime(2200);
        performanceMonitor.mark('end2');
        performanceMonitor.measure('test2', 'start2', 'end2');

        const measures = performanceMonitor.getMeasures();
        expect(measures).toHaveLength(2);
        expect(measures[0].name).toBe('test1');
        expect(measures[1].name).toBe('test2');
      });
    });

    describe('getMeasure', () => {
      it('retrieves specific measurement by name', () => {
        jest.setSystemTime(1000);
        performanceMonitor.mark('start');
        jest.setSystemTime(1100);
        performanceMonitor.measure('my-measure', 'start');

        const measure = performanceMonitor.getMeasure('my-measure');
        expect(measure?.name).toBe('my-measure');
        expect(measure?.duration).toBe(100);
      });

      it('returns undefined for non-existent measurement', () => {
        const measure = performanceMonitor.getMeasure('nonexistent');
        expect(measure).toBeUndefined();
      });

      it('returns the most recent measurement when duplicates exist', () => {
        // Create first measurement with same name
        jest.setSystemTime(1000);
        performanceMonitor.mark('start1');
        jest.setSystemTime(1100);
        performanceMonitor.measure('same-name', 'start1');

        // Create second measurement with same name (should be returned)
        jest.setSystemTime(2000);
        performanceMonitor.mark('start2');
        jest.setSystemTime(2300);
        performanceMonitor.measure('same-name', 'start2');

        const measure = performanceMonitor.getMeasure('same-name');
        expect(measure?.duration).toBe(300); // Most recent: 2300 - 2000 = 300
      });
    });

    describe('maxMeasures limit', () => {
      it('enforces maximum measures limit', () => {
        // Create 105 measurements (exceeds default limit of 100)
        for (let i = 0; i < 105; i++) {
          jest.setSystemTime(i * 1000);
          performanceMonitor.mark(`start-${i}`);
          jest.setSystemTime(i * 1000 + 100);
          performanceMonitor.measure(`measure-${i}`, `start-${i}`);
        }

        const measures = performanceMonitor.getMeasures();
        expect(measures.length).toBeLessThanOrEqual(100);
        // First 5 should have been removed
        expect(measures[0].name).toBe('measure-5');
      });
    });

    describe('clear', () => {
      it('clears all marks and measurements', () => {
        performanceMonitor.mark('start');
        jest.setSystemTime(1000);
        performanceMonitor.measure('test', 'start');

        performanceMonitor.clear();

        expect(performanceMonitor.getMeasures()).toHaveLength(0);
        expect(performanceMonitor.measure('test', 'start')).toBeNull();
      });
    });

    describe('verifyStartupTime', () => {
      it('returns true when startup is within limit', () => {
        jest.setSystemTime(0);
        performanceMonitor.mark('app-start');
        jest.setSystemTime(2000); // 2 seconds
        performanceMonitor.mark('app-ready');
        performanceMonitor.measure('app-startup', 'app-start', 'app-ready');

        expect(performanceMonitor.verifyStartupTime()).toBe(true);
      });

      it('returns false when startup exceeds limit', () => {
        jest.setSystemTime(0);
        performanceMonitor.mark('app-start');
        jest.setSystemTime(4000); // 4 seconds
        performanceMonitor.mark('app-ready');
        performanceMonitor.measure('app-startup', 'app-start', 'app-ready');

        expect(performanceMonitor.verifyStartupTime()).toBe(false);
      });

      it('returns false when measurement not found', () => {
        expect(performanceMonitor.verifyStartupTime()).toBe(false);
      });

      it('accepts custom measurement name', () => {
        jest.setSystemTime(0);
        performanceMonitor.mark('start');
        jest.setSystemTime(1000);
        performanceMonitor.measure('custom-startup', 'start');

        expect(performanceMonitor.verifyStartupTime('custom-startup')).toBe(true);
      });

      it('accepts custom max time', () => {
        jest.setSystemTime(0);
        performanceMonitor.mark('start');
        jest.setSystemTime(500);
        performanceMonitor.measure('app-startup', 'start');

        expect(performanceMonitor.verifyStartupTime('app-startup', 400)).toBe(false);
        expect(performanceMonitor.verifyStartupTime('app-startup', 600)).toBe(true);
      });
    });

    describe('verifyTransitionTime', () => {
      it('returns true when transition is within limit', () => {
        jest.setSystemTime(0);
        performanceMonitor.mark('nav-start');
        jest.setSystemTime(200);
        performanceMonitor.measure('nav-transition', 'nav-start');

        expect(performanceMonitor.verifyTransitionTime('nav-transition')).toBe(true);
      });

      it('returns false when transition exceeds limit', () => {
        jest.setSystemTime(0);
        performanceMonitor.mark('nav-start');
        jest.setSystemTime(500);
        performanceMonitor.measure('nav-transition', 'nav-start');

        expect(performanceMonitor.verifyTransitionTime('nav-transition')).toBe(false);
      });
    });

    describe('calculateMedian', () => {
      it('calculates median for odd number of measurements', () => {
        // Create 5 measurements: 100, 200, 150, 300, 250
        // Sorted: 100, 150, 200, 250, 300 -> median = 200
        jest.setSystemTime(0);
        performanceMonitor.mark('s1');
        jest.setSystemTime(100);
        performanceMonitor.measure('m1', 's1');

        jest.setSystemTime(1000);
        performanceMonitor.mark('s2');
        jest.setSystemTime(1200);
        performanceMonitor.measure('m2', 's2');

        jest.setSystemTime(2000);
        performanceMonitor.mark('s3');
        jest.setSystemTime(2150);
        performanceMonitor.measure('m3', 's3');

        jest.setSystemTime(3000);
        performanceMonitor.mark('s4');
        jest.setSystemTime(3300);
        performanceMonitor.measure('m4', 's4');

        jest.setSystemTime(4000);
        performanceMonitor.mark('s5');
        jest.setSystemTime(4250);
        performanceMonitor.measure('m5', 's5');

        const median = performanceMonitor.calculateMedian(['m1', 'm2', 'm3', 'm4', 'm5']);
        expect(median).toBe(200);
      });

      it('calculates median for even number of measurements', () => {
        // Create 4 measurements: 100, 200, 300, 400
        // Median = (200 + 300) / 2 = 250
        jest.setSystemTime(0);
        performanceMonitor.mark('s1');
        jest.setSystemTime(100);
        performanceMonitor.measure('m1', 's1');

        jest.setSystemTime(1000);
        performanceMonitor.mark('s2');
        jest.setSystemTime(1200);
        performanceMonitor.measure('m2', 's2');

        jest.setSystemTime(2000);
        performanceMonitor.mark('s3');
        jest.setSystemTime(2300);
        performanceMonitor.measure('m3', 's3');

        jest.setSystemTime(3000);
        performanceMonitor.mark('s4');
        jest.setSystemTime(3400);
        performanceMonitor.measure('m4', 's4');

        const median = performanceMonitor.calculateMedian(['m1', 'm2', 'm3', 'm4']);
        expect(median).toBe(250);
      });

      it('returns null for empty measurements', () => {
        expect(performanceMonitor.calculateMedian([])).toBeNull();
      });

      it('ignores non-existent measurements', () => {
        jest.setSystemTime(0);
        performanceMonitor.mark('s1');
        jest.setSystemTime(100);
        performanceMonitor.measure('m1', 's1');

        const median = performanceMonitor.calculateMedian(['m1', 'nonexistent']);
        expect(median).toBe(100);
      });
    });

    describe('getSummary', () => {
      it('returns formatted summary of measurements', () => {
        jest.setSystemTime(0);
        performanceMonitor.mark('start');
        jest.setSystemTime(100);
        performanceMonitor.measure('test1', 'start');
        jest.setSystemTime(350);
        performanceMonitor.measure('test2', 'start');

        const summary = performanceMonitor.getSummary();
        expect(summary).toContain('test1: 100ms');
        expect(summary).toContain('test2: 350ms');
      });

      it('returns message when no measurements', () => {
        expect(performanceMonitor.getSummary()).toBe('No measurements recorded');
      });
    });
  });

  describe('timeAsync', () => {
    it('times async operation and returns result with duration', async () => {
      jest.useRealTimers(); // Need real timers for async

      const { result, duration } = await timeAsync('async-op', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'test-result';
      });

      expect(result).toBe('test-result');
      expect(duration).toBeGreaterThanOrEqual(10);
    });

    it('propagates errors from async operation', async () => {
      jest.useRealTimers();

      await expect(
        timeAsync('failing-op', async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });
  });
});
