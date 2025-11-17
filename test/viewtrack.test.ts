import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import trackView from '../app/viewtrack';

describe('trackView visibility change tracking', () => {
  let mockVisibilityState: string;
  let mockDateNow: number;
  let listener: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVisibilityState = 'visible';
    mockDateNow = 1000000000; // Base timestamp

    // Mock document.visibilityState
    Object.defineProperty(document, 'visibilityState', {
      get: () => mockVisibilityState,
      configurable: true,
    });

    // Mock Date.now
    vi.spyOn(Date, 'now').mockImplementation(() => mockDateNow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should add visibilitychange event listener', () => {
    trackView();
    expect(document.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    listener = (document.addEventListener as any).mock.calls.find((call: any) => call[0] === 'visibilitychange')[1];
  });

  it('should return a cleanup function that removes the event listener', () => {
    const cleanup = trackView();
    expect(typeof cleanup).toBe('function');

    cleanup();
    expect(document.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });

  it('should not track on immediate visibility changes without prior hidden state', () => {
    trackView();
    listener = (document.addEventListener as any).mock.calls.find((call: any) => call[0] === 'visibilitychange')[1];

    // Change to hidden
    mockVisibilityState = 'hidden';
    listener!();

    // Immediately change back to visible
    mockVisibilityState = 'visible';
    listener!();

    // Should not track additional views since no time passed (only initial track)
    expect(window.umami.track).toHaveBeenCalledTimes(1);
  });

  it('should not track for short absences (less than 20 minutes)', () => {
    trackView();
    listener = (document.addEventListener as any).mock.calls.find((call: any) => call[0] === 'visibilitychange')[1];

    // Hide page
    mockVisibilityState = 'hidden';
    listener!();

    // Advance time by 19 minutes (19 * 60 * 1000 = 1140000 ms)
    mockDateNow += 1140000;

    // Show page
    mockVisibilityState = 'visible';
    listener!();

    // Should not track additional views since hidden for less than 20 minutes
    expect(window.umami.track).toHaveBeenCalledTimes(1);
  });

  it('should track for long absences (more than 20 minutes)', () => {
    trackView();
    listener = (document.addEventListener as any).mock.calls.find((call: any) => call[0] === 'visibilitychange')[1];

    // Hide page
    mockVisibilityState = 'hidden';
    listener!();

    // Advance time by 21 minutes (21 * 60 * 1000 = 1260000 ms)
    mockDateNow += 1260000;

    // Show page
    mockVisibilityState = 'visible';
    listener!();

    // Should track additional view since hidden for more than 20 minutes
    expect(window.umami.track).toHaveBeenCalledTimes(2);
    expect(window.umami.track).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should track only once per long absence period', () => {
    trackView();
    listener = (document.addEventListener as any).mock.calls.find((call: any) => call[0] === 'visibilitychange')[1];

    // Hide page
    mockVisibilityState = 'hidden';
    listener!();

    // Advance time by 21 minutes
    mockDateNow += 1260000;

    // Show page
    mockVisibilityState = 'visible';
    listener!();

    // Hide again briefly
    mockVisibilityState = 'hidden';
    listener!();

    // Advance time by 1 minute
    mockDateNow += 60000;

    // Show again
    mockVisibilityState = 'visible';
    listener!();

    // Should have tracked only once additional
    expect(window.umami.track).toHaveBeenCalledTimes(2);
  });

  it('should handle multiple long absences', () => {
    trackView();
    listener = (document.addEventListener as any).mock.calls.find((call: any) => call[0] === 'visibilitychange')[1];

    // First long absence
    mockVisibilityState = 'hidden';
    listener!();
    mockDateNow += 1260000; // 21 minutes
    mockVisibilityState = 'visible';
    listener!();

    // Second long absence
    mockVisibilityState = 'hidden';
    listener!();
    mockDateNow += 1260000; // Another 21 minutes
    mockVisibilityState = 'visible';
    listener!();

    // Should track twice additional
    expect(window.umami.track).toHaveBeenCalledTimes(3);
  });

  it('should reset hidden_start after tracking', () => {
    trackView();
    listener = (document.addEventListener as any).mock.calls.find((call: any) => call[0] === 'visibilitychange')[1];

    // Hide page
    mockVisibilityState = 'hidden';
    listener!();

    // Advance time by 21 minutes
    mockDateNow += 1260000;

    // Show page
    mockVisibilityState = 'visible';
    listener!();

    // Hide again briefly
    mockVisibilityState = 'hidden';
    listener!();

    // Advance time by 1 minute
    mockDateNow += 60000;

    // Show again - should not track since hidden_start was reset
    mockVisibilityState = 'visible';
    listener!();

    // Should have tracked only once additional
    expect(window.umami.track).toHaveBeenCalledTimes(2);
  });

  it('should handle visibility changes without prior hidden state', () => {
    trackView();
    listener = (document.addEventListener as any).mock.calls.find((call: any) => call[0] === 'visibilitychange')[1];

    // Start with visible, change to visible again
    mockVisibilityState = 'visible';
    listener!();

    // Should not track additional
    expect(window.umami.track).toHaveBeenCalledTimes(1);
  });

  it('should track with correct payload', () => {
    // Mock URL search params for birds mode
    Object.defineProperty(window, 'location', {
      value: { search: '?birds=true' },
      writable: true,
    });

    trackView();
    listener = (document.addEventListener as any).mock.calls.find((call: any) => call[0] === 'visibilitychange')[1];

    // Hide page
    mockVisibilityState = 'hidden';
    listener!();

    // Advance time by 21 minutes
    mockDateNow += 1260000;

    // Show page
    mockVisibilityState = 'visible';
    listener!();

    // Should track with birds payload
    expect(window.umami.track).toHaveBeenCalledTimes(2);
    const trackCall = (window.umami.track as any).mock.calls[1][0]; // Second call is the visibility one
    expect(typeof trackCall).toBe('function');

    // Call the function to get the payload
    const payload = trackCall({});
    expect(payload.data.type).toBe('birds');
  });
});