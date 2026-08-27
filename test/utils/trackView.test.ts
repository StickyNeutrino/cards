import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import trackView from '../../app/viewtrack';

describe('trackView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Consent unset -> tracking on by default
    (window.localStorage.getItem as any).mockReturnValue(null);
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should track by default when consent is unset', () => {
    const cleanup = trackView();

    expect((window as any).umami.track).toHaveBeenCalledTimes(1);

    cleanup!();
  });

  it('should return a cleanup function when tracking is enabled', () => {
    const cleanup = trackView();

    expect(typeof cleanup).toBe('function');

    cleanup!();
  });

  it('should not track and return no cleanup when consent is false', () => {
    (window.localStorage.getItem as any).mockReturnValue('false');

    const cleanup = trackView();

    expect((window as any).umami.track).not.toHaveBeenCalled();
    expect(cleanup).toBeUndefined();
  });

  it('should not read or write a persistent user identifier', () => {
    const cleanup = trackView();

    expect(window.localStorage.getItem).not.toHaveBeenCalledWith('uuid');
    expect(window.localStorage.setItem).not.toHaveBeenCalled();

    cleanup!();
  });

  it('should call umami.track with correct parameters for plants', () => {
    const cleanup = trackView();

    expect((window as any).umami.track).toHaveBeenCalledWith(
      expect.any(Function)
    );

    const trackCall = (window as any).umami.track.mock.calls[0][0];
    const mockProps = { some: 'props' };
    const result = trackCall(mockProps);

    expect(result).toEqual({
      ...mockProps,
      data: { type: 'plants' },
    });

    cleanup!();
  });

  it('should call umami.track with correct parameters for birds', () => {
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
      data: { type: 'birds' },
    });

    cleanup!();
  });

  it('should add visibility change listener', () => {
    const cleanup = trackView();

    expect(document.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

    cleanup!();
  });

  it('should remove visibility change listener on cleanup', () => {
    const cleanup = trackView();

    cleanup!();

    expect(document.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('should handle visibility change from visible to hidden', () => {
    const cleanup = trackView();

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    });

    const visibilityHandler = (document.addEventListener as any).mock.calls.find(
      (call: any) => call[0] === 'visibilitychange'
    )[1];
    visibilityHandler();

    expect((window as any).umami.track).toHaveBeenCalledTimes(1); // Only initial call

    cleanup!();
  });

  it('should track when returning from hidden state after sufficient time', () => {
    const cleanup = trackView();

    const originalDateNow = Date.now;
    let currentTime = 1000;
    global.Date.now = vi.fn(() => currentTime);

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    });
    const visibilityHandler = (document.addEventListener as any).mock.calls.find(
      (call: any) => call[0] === 'visibilitychange'
    )[1];
    visibilityHandler();

    currentTime += (20 * 60 * 1000) + 1;

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    });
    visibilityHandler();

    expect((window as any).umami.track).toHaveBeenCalledTimes(2);

    global.Date.now = originalDateNow;
    cleanup!();
  });

  it('should not track when returning from hidden state too soon', () => {
    const cleanup = trackView();

    const originalDateNow = Date.now;
    let currentTime = 1000;
    global.Date.now = vi.fn(() => currentTime);

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    });
    const visibilityHandler = (document.addEventListener as any).mock.calls.find(
      (call: any) => call[0] === 'visibilitychange'
    )[1];
    visibilityHandler();

    currentTime = 1000 + 300000;

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    });
    visibilityHandler();

    expect((window as any).umami.track).toHaveBeenCalledTimes(1);

    global.Date.now = originalDateNow;
    cleanup!();
  });

  it('should stop visibility tracking after mid-session opt-out', () => {
    const cleanup = trackView();

    const originalDateNow = Date.now;
    let currentTime = 1000;
    global.Date.now = vi.fn(() => currentTime);

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    });
    const visibilityHandler = (document.addEventListener as any).mock.calls.find(
      (call: any) => call[0] === 'visibilitychange'
    )[1];
    visibilityHandler();

    currentTime += (20 * 60 * 1000) + 1;
    (window.localStorage.getItem as any).mockReturnValue('false');

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    });
    visibilityHandler();

    expect((window as any).umami.track).toHaveBeenCalledTimes(1);

    global.Date.now = originalDateNow;
    cleanup!();
  });

  it('should handle missing umami gracefully', () => {
    expect(() => {
      const cleanup = trackView();
      cleanup!();
    }).not.toThrow();
  });

  it('should handle both query param formats for birds mode', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?birds' },
      writable: true,
    });
    const cleanup1 = trackView();
    const trackCall1 = (window as any).umami.track.mock.calls[0][0];
    const result1 = trackCall1({});
    expect(result1.data.type).toBe('birds');
    cleanup1!();

    vi.clearAllMocks();
    (window.localStorage.getItem as any).mockReturnValue(null);

    Object.defineProperty(window, 'location', {
      value: { search: '?birds=true' },
      writable: true,
    });
    const cleanup2 = trackView();
    const trackCall2 = (window as any).umami.track.mock.calls[0][0];
    const result2 = trackCall2({});
    expect(result2.data.type).toBe('birds');
    cleanup2!();
  });

  it('should handle multiple visibility changes correctly', () => {
    const cleanup = trackView();

    const visibilityHandler = (document.addEventListener as any).mock.calls.find(
      (call: any) => call[0] === 'visibilitychange'
    )[1];

    const originalDateNow = Date.now;
    let currentTime = 1000;
    global.Date.now = vi.fn(() => currentTime);

    for (let i = 0; i < 3; i++) {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
      });
      visibilityHandler();

      currentTime += (20 * 60 * 1000) + 1;

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      });
      visibilityHandler();
    }

    expect((window as any).umami.track).toHaveBeenCalledTimes(4);

    global.Date.now = originalDateNow;
    cleanup!();
  });

  it('should handle visibility change without prior hidden state', () => {
    const cleanup = trackView();

    const visibilityHandler = (document.addEventListener as any).mock.calls.find(
      (call: any) => call[0] === 'visibilitychange'
    )[1];

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    });
    visibilityHandler();

    expect((window as any).umami.track).toHaveBeenCalledTimes(1);

    cleanup!();
  });

  it('should handle exact 20 minute threshold', () => {
    const cleanup = trackView();

    const visibilityHandler = (document.addEventListener as any).mock.calls.find(
      (call: any) => call[0] === 'visibilitychange'
    )[1];

    const originalDateNow = Date.now;
    let currentTime = 1000;
    global.Date.now = vi.fn(() => currentTime);

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    });
    visibilityHandler();

    currentTime += 20 * 60 * 1000;

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    });
    visibilityHandler();

    expect((window as any).umami.track).toHaveBeenCalledTimes(1);

    global.Date.now = originalDateNow;
    cleanup!();
  });
});
