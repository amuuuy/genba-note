/**
 * Sentry Service Tests
 *
 * TDD tests for the Sentry crash reporting service wrapper.
 * Tests initialization, exception capture, message capture, and idempotency.
 */

// Mock functions must be defined BEFORE jest.mock
const mockInit = jest.fn();
const mockCaptureException = jest.fn();
const mockCaptureMessage = jest.fn();
const mockSetUser = jest.fn();
const mockAddBreadcrumb = jest.fn();
const mockWithScope = jest.fn((callback: (scope: any) => void) => {
  const mockScope = { setExtra: jest.fn() };
  callback(mockScope);
  return mockScope;
});
const mockWrap = jest.fn((component: unknown) => component);

jest.mock('@sentry/react-native', () => ({
  init: (config: unknown) => mockInit(config),
  captureException: (error: unknown) => mockCaptureException(error),
  captureMessage: (msg: string, level?: unknown) =>
    mockCaptureMessage(msg, level),
  setUser: (user: unknown) => mockSetUser(user),
  addBreadcrumb: (breadcrumb: unknown) => mockAddBreadcrumb(breadcrumb),
  withScope: (callback: (scope: any) => void) => mockWithScope(callback),
  wrap: (component: unknown) => mockWrap(component),
}));

import {
  initializeSentry,
  captureException,
  captureMessage,
  isSentryInitialized,
  _resetForTesting,
} from '@/monitoring/sentryService';

const VALID_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';

describe('sentryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetForTesting();
  });

  // -------------------------------------------------------
  // initializeSentry
  // -------------------------------------------------------
  describe('initializeSentry', () => {
    it('should call Sentry.init with the provided DSN and return success', () => {
      const result = initializeSentry(VALID_DSN);

      expect(result.success).toBe(true);
      expect(mockInit).toHaveBeenCalledTimes(1);
      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({ dsn: VALID_DSN })
      );
    });

    it('should set tracesSampleRate in init config', () => {
      initializeSentry(VALID_DSN);

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({ tracesSampleRate: expect.any(Number) })
      );
    });

    it('should set sendDefaultPii to false for privacy protection', () => {
      initializeSentry(VALID_DSN);

      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({ sendDefaultPii: false })
      );
    });

    it('should include a beforeSend callback for event sanitization', () => {
      initializeSentry(VALID_DSN);

      const config = mockInit.mock.calls[0][0];
      expect(typeof config.beforeSend).toBe('function');
    });

    it('should strip user ip_address in beforeSend while preserving other fields', () => {
      initializeSentry(VALID_DSN);

      const config = mockInit.mock.calls[0][0];
      const event = {
        message: 'test',
        user: { id: 'user-1', ip_address: '1.2.3.4', email: 'test@example.com' },
      };

      const sanitized = config.beforeSend(event);

      expect(sanitized.user.ip_address).toBeUndefined();
      expect(sanitized.user.id).toBe('user-1');
      expect(sanitized.user.email).toBe('test@example.com');
      expect(sanitized.message).toBe('test');
    });

    it('should pass through events without user in beforeSend', () => {
      initializeSentry(VALID_DSN);

      const config = mockInit.mock.calls[0][0];
      const event = { message: 'no user event' };

      const sanitized = config.beforeSend(event);

      expect(sanitized.message).toBe('no user event');
    });

    it('should return SENTRY_NOT_CONFIGURED error for empty DSN', () => {
      const result = initializeSentry('');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SENTRY_NOT_CONFIGURED');
      expect(mockInit).not.toHaveBeenCalled();
    });

    it('should return SENTRY_INIT_FAILED error when Sentry.init throws', () => {
      mockInit.mockImplementationOnce(() => {
        throw new Error('Native module not found');
      });

      const result = initializeSentry(VALID_DSN);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SENTRY_INIT_FAILED');
    });

    it('should not re-initialize if already initialized (idempotent)', () => {
      initializeSentry(VALID_DSN);
      const secondResult = initializeSentry(VALID_DSN);

      expect(secondResult.success).toBe(true);
      expect(mockInit).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------
  // isSentryInitialized
  // -------------------------------------------------------
  describe('isSentryInitialized', () => {
    it('should return false before initializeSentry is called', () => {
      expect(isSentryInitialized()).toBe(false);
    });

    it('should return true after successful initializeSentry', () => {
      initializeSentry(VALID_DSN);
      expect(isSentryInitialized()).toBe(true);
    });

    it('should return false after failed initializeSentry', () => {
      mockInit.mockImplementationOnce(() => {
        throw new Error('Init failed');
      });

      initializeSentry(VALID_DSN);
      expect(isSentryInitialized()).toBe(false);
    });
  });

  // -------------------------------------------------------
  // captureException
  // -------------------------------------------------------
  describe('captureException', () => {
    it('should call Sentry.captureException with the error object', () => {
      initializeSentry(VALID_DSN);
      const error = new Error('test error');

      captureException(error);

      expect(mockCaptureException).toHaveBeenCalledWith(error);
    });

    it('should pass context as extra data via Sentry.withScope', () => {
      initializeSentry(VALID_DSN);
      const error = new Error('test error');
      const context = { component: 'TestComponent', action: 'save' };

      captureException(error, context);

      expect(mockWithScope).toHaveBeenCalledTimes(1);
      // Verify setExtra was called for each context key
      const scopeCallback = mockWithScope.mock.calls[0][0];
      const mockScope = { setExtra: jest.fn() };
      scopeCallback(mockScope);
      expect(mockScope.setExtra).toHaveBeenCalledWith('component', 'TestComponent');
      expect(mockScope.setExtra).toHaveBeenCalledWith('action', 'save');
    });

    it('should not throw when Sentry is not initialized', () => {
      expect(() => captureException(new Error('test'))).not.toThrow();
      expect(mockCaptureException).not.toHaveBeenCalled();
    });

    it('should gracefully handle internal Sentry errors', () => {
      initializeSentry(VALID_DSN);
      mockCaptureException.mockImplementationOnce(() => {
        throw new Error('Sentry internal error');
      });

      expect(() => captureException(new Error('test'))).not.toThrow();
    });
  });

  // -------------------------------------------------------
  // captureMessage
  // -------------------------------------------------------
  describe('captureMessage', () => {
    it('should call Sentry.captureMessage with message and level', () => {
      initializeSentry(VALID_DSN);

      captureMessage('Something happened', 'warning');

      expect(mockCaptureMessage).toHaveBeenCalledWith(
        'Something happened',
        'warning'
      );
    });

    it('should default to error level when level not provided', () => {
      initializeSentry(VALID_DSN);

      captureMessage('An error occurred');

      expect(mockCaptureMessage).toHaveBeenCalledWith(
        'An error occurred',
        'error'
      );
    });

    it('should not throw when Sentry is not initialized', () => {
      expect(() => captureMessage('test message')).not.toThrow();
      expect(mockCaptureMessage).not.toHaveBeenCalled();
    });
  });
});
