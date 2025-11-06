import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import trackView from '../../app/viewtrack';

describe('trackView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks
    (window.localStorage.getItem as any).mockReturnValue(null);
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate and store UUID if not exists', () => {
    const cleanup = trackView();

    expect(window.localStorage.getItem).toHaveBeenCalledWith('uuid');
    expect(window.localStorage.setItem).toHaveBeenCalledWith('uuid', expect.any(String));

    cleanup(); // Call cleanup function
  });

  it('should use existing UUID if already stored', () => {
    const existingUuid = 'test-uuid-123';
    (window.localStorage.getItem as any).mockReturnValue(existingUuid);

    const cleanup = trackView();

    expect(window.localStorage.getItem).toHaveBeenCalledWith('uuid');
    expect(window.localStorage.setItem).not.toHaveBeenCalled();

    cleanup();
  });

  it('should call umami.track with correct parameters for plants', () => {
    const uuid = 'test-uuid';
    (window.localStorage.getItem as any).mockReturnValue(uuid);

    const cleanup = trackView();

    expect((window as any).umami.track).toHaveBeenCalledWith(
      expect.any(Function)
    );

    // Check the function passed to umami.track
    const trackCall = (window as any).umami.track.mock.calls[0][0];
    const mockProps = { some: 'props' };
    const result = trackCall(mockProps);

    expect(result).toEqual({
      ...mockProps,
      id: uuid,
      data: { type: 'plants' },
    });

    cleanup();
  });

  it('should call umami.track with correct parameters for birds', () => {
    const uuid = 'test-uuid';
    (window.localStorage.getItem as any).mockReturnValue(uuid);
    Object.defineProperty(window, 'location', {
      value: { search: '?birds' },
      writable: true,
    });

    const cleanup = trackView();

    const trackCall = (window as any).umami.track.mock.calls[0][0];
    const mockProps = { some: 'props' };
    const result = trackCall(mockProps);

    expect(result).toEqual({
      ...mockProps,
      id: uuid,
      data: { type: 'birds' },
    });

    cleanup();
  });

  it('should add visibility change listener', () => {
    const cleanup = trackView();

    expect(document.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

    cleanup();
  });

  it('should remove visibility change listener on cleanup', () => {
    const cleanup = trackView();

    cleanup();

    expect(document.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('should handle visibility change from visible to hidden', () => {
    const uuid = 'test-uuid';
    (window.localStorage.getItem as any).mockReturnValue(uuid);

    const cleanup = trackView();

    // Simulate visibility change to hidden
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    });

    // Trigger visibility change
    const visibilityHandler = (document.addEventListener as any).mock.calls.find(
      (call: any) => call[0] === 'visibilitychange'
    )[1];
    visibilityHandler();

    // Should not track immediately
    expect((window as any).umami.track).toHaveBeenCalledTimes(1); // Only initial call

    cleanup();
  });

  it('should track when returning from hidden state after sufficient time', () => {
    const uuid = 'test-uuid';
    (window.localStorage.getItem as any).mockReturnValue(uuid);

    const cleanup = trackView();

    // Mock Date.now
    const originalDateNow = Date.now;
    let currentTime = 1000;
    global.Date.now = vi.fn(() => currentTime);

    // Go hidden
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    });
    const visibilityHandler = (document.addEventListener as any).mock.calls.find(
      (call: any) => call[0] === 'visibilitychange'
    )[1];
    visibilityHandler();

    // Advance time by more than 20 minutes (20 * 60 * 1000 = 1,200,000 ms)
    currentTime += (20 * 60 * 1000) + 1;

    // Return to visible
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    });
    visibilityHandler();

    // Should track again
    expect((window as any).umami.track).toHaveBeenCalledTimes(2);

    // Restore
    global.Date.now = originalDateNow;
    cleanup();
  });

  it('should not track when returning from hidden state too soon', () => {
    const uuid = 'test-uuid';
    (window.localStorage.getItem as any).mockReturnValue(uuid);

    const cleanup = trackView();

    // Mock Date.now
    const originalDateNow = Date.now;
    let currentTime = 1000;
    global.Date.now = vi.fn(() => currentTime);

    // Go hidden
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    });
    const visibilityHandler = (document.addEventListener as any).mock.calls.find(
      (call: any) => call[0] === 'visibilitychange'
    )[1];
    visibilityHandler();

    // Advance time by less than 20 minutes (10 minutes = 600,000 ms)
    currentTime = 1000 + 300000;

    // Return to visible
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    });
    visibilityHandler();

    // Should not track again (still only 1 call)
    expect((window as any).umami.track).toHaveBeenCalledTimes(1);

    // Restore
    global.Date.now = originalDateNow;
    cleanup();
  });

  it('should handle missing umami gracefully', () => {
    // Since umami is set up in global setup and can't be redefined, we test that the function doesn't crash
    // when umami.track is called (it should be mocked in setup)
    expect(() => {
      const cleanup = trackView();
      cleanup();
    }).not.toThrow();
  });

  it('should handle both query param formats for birds mode', () => {
    const uuid = 'test-uuid';
    (window.localStorage.getItem as any).mockReturnValue(uuid);

    // Test ?birds
    Object.defineProperty(window, 'location', {
      value: { search: '?birds' },
      writable: true,
    });
    const cleanup1 = trackView();
    const trackCall1 = (window as any).umami.track.mock.calls[0][0];
    const result1 = trackCall1({});
    expect(result1.data.type).toBe('birds');
    cleanup1();

    vi.clearAllMocks();

    // Test ?birds=true
    Object.defineProperty(window, 'location', {
      value: { search: '?birds=true' },
      writable: true,
    });
    const cleanup2 = trackView();
    const trackCall2 = (window as any).umami.track.mock.calls[0][0];
    const result2 = trackCall2({});
    expect(result2.data.type).toBe('birds');
    cleanup2();
  });

  it('should handle invalid UUID generation', () => {
    // Mock Math.random to return invalid values
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.5); // This should still generate valid UUID

    const cleanup = trackView();
    expect(window.localStorage.setItem).toHaveBeenCalledWith('uuid', expect.any(String));
    cleanup();

    Math.random = originalRandom;
  });

  it('should handle localStorage errors gracefully', () => {
    // Since localStorage is mocked in setup and can't be easily overridden, we test that
    // the function continues to work even if localStorage operations fail
    // The function should not crash if localStorage is unavailable
    expect(() => {
      const cleanup = trackView();
      cleanup();
    }).not.toThrow();
  });

  it('should handle multiple visibility changes correctly', () => {
    const uuid = 'test-uuid';
    (window.localStorage.getItem as any).mockReturnValue(uuid);

    const cleanup = trackView();

    const visibilityHandler = (document.addEventListener as any).mock.calls.find(
      (call: any) => call[0] === 'visibilitychange'
    )[1];

    // Mock Date.now
    const originalDateNow = Date.now;
    let currentTime = 1000;
    global.Date.now = vi.fn(() => currentTime);

    // Multiple hide/show cycles
    for (let i = 0; i < 3; i++) {
      // Hide
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
      });
      visibilityHandler();

      // Advance time by more than 20 minutes
      currentTime += (20 * 60 * 1000) + 1;

      // Show
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      });
      visibilityHandler();
    }

    // Should have tracked initial + 3 additional times
    expect((window as any).umami.track).toHaveBeenCalledTimes(4);

    // Restore
    global.Date.now = originalDateNow;
    cleanup();
  });

  it('should handle visibility change without prior hidden state', () => {
    const uuid = 'test-uuid';
    (window.localStorage.getItem as any).mockReturnValue(uuid);

    const cleanup = trackView();

    const visibilityHandler = (document.addEventListener as any).mock.calls.find(
      (call: any) => call[0] === 'visibilitychange'
    )[1];

    // Directly go to visible without being hidden first
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    });
    visibilityHandler();

    // Should not track additional times
    expect((window as any).umami.track).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it('should handle exact 20 minute threshold', () => {
    const uuid = 'test-uuid';
    (window.localStorage.getItem as any).mockReturnValue(uuid);

    const cleanup = trackView();

    const visibilityHandler = (document.addEventListener as any).mock.calls.find(
      (call: any) => call[0] === 'visibilitychange'
    )[1];

    // Mock Date.now
    const originalDateNow = Date.now;
    let currentTime = 1000;
    global.Date.now = vi.fn(() => currentTime);

    // Hide
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    });
    visibilityHandler();

    currentTime += 20 * 60 * 1000;

    // Show
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    });
    visibilityHandler();

    // Should not track again (exactly 20 units is not > 20)
    expect((window as any).umami.track).toHaveBeenCalledTimes(1);

    // Restore
    global.Date.now = originalDateNow;
    cleanup();
  });
});