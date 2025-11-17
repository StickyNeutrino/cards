import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reportError, setupGlobalErrorHandlers } from '../../app/utils/errorReporting';
import type { ErrorReport } from '../../app/utils/errorReporting';

describe('errorReporting', () => {
  const mockFetch = vi.fn();
  global.fetch = mockFetch;


  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('reportError', () => {
    it('sends POST request to correct URL with error data', async () => {
      const errorReport: ErrorReport = {
        message: 'Test error',
        stack: 'Error stack',
        url: 'http://example.com',
        userAgent: 'Test Agent',
        timestamp: '2023-01-01T00:00:00.000Z',
        type: 'javascript',
      };

      await reportError(errorReport);

      expect(mockFetch).toHaveBeenCalledWith('https://errors.cards.unimpossy.com/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });
    });

    it('silently fails when fetch throws an error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFetch.mockRejectedValue(new Error('Network error'));

      const errorReport: ErrorReport = {
        message: 'Test error',
        url: 'http://example.com',
        userAgent: 'Test Agent',
        timestamp: '2023-01-01T00:00:00.000Z',
        type: 'javascript',
      };

      await expect(reportError(errorReport)).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to report error:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('handles ErrorReport with all optional fields', async () => {
      const errorReport: ErrorReport = {
        message: 'Test error',
        stack: 'Error stack',
        url: 'http://example.com',
        userAgent: 'Test Agent',
        timestamp: '2023-01-01T00:00:00.000Z',
        type: 'react',
      };

      await reportError(errorReport);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://errors.cards.unimpossy.com/report',
        expect.objectContaining({
          body: JSON.stringify(errorReport),
        })
      );
    });
  });

  describe('setupGlobalErrorHandlers', () => {
    let addEventListenerSpy: any;
    let removeEventListenerSpy: any;

    beforeEach(() => {
      addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      vi.stubGlobal('PromiseRejectionEvent', class PromiseRejectionEvent extends Event {
        reason: any;
        promise: Promise<any>;

        constructor(type: string, eventInitDict?: PromiseRejectionEventInit) {
          super(type);
          this.reason = eventInitDict?.reason;
          this.promise = eventInitDict?.promise || Promise.resolve();
        }
      });
    });

    afterEach(() => {
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('adds event listeners for error and unhandledrejection', () => {
      const cleanup = setupGlobalErrorHandlers();

      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));

      cleanup();
      expect(removeEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    });

    it('handles error events correctly', () => {
      const cleanup = setupGlobalErrorHandlers();

      const errorEvent = new ErrorEvent('error', {
        message: 'Test error',
        filename: 'test.js',
        lineno: 1,
        colno: 1,
        error: new Error('Test error with stack'),
      });

      // Trigger the error handler
      const errorHandler = addEventListenerSpy.mock.calls.find(call => call[0] === 'error')?.[1];
      errorHandler?.(errorEvent);

      expect(mockFetch).toHaveBeenCalledWith('https://errors.cards.unimpossy.com/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.any(String),
      });

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body).toEqual({
        message: 'Test error',
        stack: expect.any(String),
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: expect.any(String),
        type: 'javascript',
      });

      cleanup();
    });

    it('handles unhandled rejection events correctly', () => {
      const cleanup = setupGlobalErrorHandlers();

      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        reason: new Error('Promise rejection'),
        promise: Promise.resolve(),
      });

      // Trigger the rejection handler
      const rejectionHandler = addEventListenerSpy.mock.calls.find(call => call[0] === 'unhandledrejection')?.[1];
      rejectionHandler?.(rejectionEvent);

      expect(mockFetch).toHaveBeenCalledWith('https://errors.cards.unimpossy.com/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.any(String),
      });

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body).toEqual({
        message: 'Promise rejection',
        stack: expect.any(String),
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: expect.any(String),
        type: 'promise',
      });

      cleanup();
    });

    it('handles unhandled rejection with non-Error reason', () => {
      const cleanup = setupGlobalErrorHandlers();

      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        reason: 'String reason',
        promise: Promise.resolve(),
      });

      const rejectionHandler = addEventListenerSpy.mock.calls.find(call => call[0] === 'unhandledrejection')?.[1];
      rejectionHandler?.(rejectionEvent);

      expect(mockFetch).toHaveBeenCalledWith('https://errors.cards.unimpossy.com/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.any(String),
      });

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body).toEqual({
        message: 'String reason',
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: expect.any(String),
        type: 'promise',
      });

      cleanup();
    });

    it('returns a cleanup function that removes event listeners', () => {
      const cleanup = setupGlobalErrorHandlers();

      expect(addEventListenerSpy).toHaveBeenCalledTimes(2);

      cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('ErrorReport interface', () => {
    it('validates required fields', () => {
      const validReport: ErrorReport = {
        message: 'Test message',
        url: 'http://example.com',
        userAgent: 'Test Agent',
        timestamp: '2023-01-01T00:00:00.000Z',
        type: 'javascript',
      };

      expect(validReport).toBeDefined();
    });

    it('allows optional stack field', () => {
      const reportWithStack: ErrorReport = {
        message: 'Test message',
        stack: 'Error stack',
        url: 'http://example.com',
        userAgent: 'Test Agent',
        timestamp: '2023-01-01T00:00:00.000Z',
        type: 'react',
      };

      expect(reportWithStack.stack).toBe('Error stack');
    });

    it('supports all error types', () => {
      const types: ErrorReport['type'][] = ['javascript', 'promise', 'react'];

      types.forEach(type => {
        const report: ErrorReport = {
          message: 'Test',
          url: 'http://example.com',
          userAgent: 'Test Agent',
          timestamp: '2023-01-01T00:00:00.000Z',
          type,
        };
        expect(report.type).toBe(type);
      });
    });
  });
});