import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackCardView } from '../../app/viewtrack';

describe('trackCardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Consent unset -> tracking on by default
    (window.localStorage.getItem as any).mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not read or write a persistent user identifier', () => {
    trackCardView();

    expect(window.localStorage.getItem).not.toHaveBeenCalledWith('uuid');
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
  });

  it('should track by default when consent is unset', () => {
    trackCardView();

    expect((window as any).umami.track).toHaveBeenCalledTimes(1);
  });

  it('should not track when consent is explicitly false', () => {
    (window.localStorage.getItem as any).mockReturnValue('false');

    trackCardView();

    expect((window as any).umami.track).not.toHaveBeenCalled();
  });

  it('should call umami.track with correct parameters for plants', () => {
    trackCardView();

    expect((window as any).umami.track).toHaveBeenCalledWith(
      expect.any(Function)
    );

    const trackCall = (window as any).umami.track.mock.calls[0][0];
    const mockProps = { some: 'props' };
    const result = trackCall(mockProps);

    expect(result).toEqual({
      ...mockProps,
      name: 'viewed card',
      data: { type: 'plants' },
    });
  });

  it('should call umami.track with correct parameters for birds', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?birds' },
      writable: true,
    });

    trackCardView();

    const trackCall = (window as any).umami.track.mock.calls[0][0];
    const mockProps = { some: 'props' };
    const result = trackCall(mockProps);

    expect(result).toEqual({
      ...mockProps,
      name: 'viewed card',
      data: { type: 'birds' },
    });
  });

  it('should not track when offline', () => {
    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    trackCardView();

    expect((window as any).umami.track).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      configurable: true,
    });
  });
});
