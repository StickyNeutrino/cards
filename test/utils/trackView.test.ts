import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import trackView from '../../app/viewtrack';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock URLSearchParams
const mockLocation = {
  search: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock umami
const mockUmami = {
  track: vi.fn(),
};
Object.defineProperty(window, 'umami', {
  value: mockUmami,
  writable: true,
});

// Mock document
const mockDocument = {
  visibilityState: 'visible',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};
Object.defineProperty(document, 'visibilityState', {
  value: 'visible',
  writable: true,
});
Object.defineProperty(document, 'addEventListener', {
  value: mockDocument.addEventListener,
  writable: true,
});
Object.defineProperty(document, 'removeEventListener', {
  value: mockDocument.removeEventListener,
  writable: true,
});

describe('trackView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    mockLocation.search = '';
    mockDocument.visibilityState = 'visible';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate and store UUID if not exists', () => {
    const cleanup = trackView();

    expect(localStorageMock.getItem).toHaveBeenCalledWith('uuid');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('uuid', expect.any(String));

    cleanup(); // Call cleanup function
  });

  it('should use existing UUID if already stored', () => {
    const existingUuid = 'test-uuid-123';
    localStorageMock.getItem.mockReturnValue(existingUuid);

    const cleanup = trackView();

    expect(localStorageMock.getItem).toHaveBeenCalledWith('uuid');
    expect(localStorageMock.setItem).not.toHaveBeenCalled();

    cleanup();
  });

  it('should call umami.track with correct parameters for plants', () => {
    const uuid = 'test-uuid';
    localStorageMock.getItem.mockReturnValue(uuid);

    const cleanup = trackView();

    expect(mockUmami.track).toHaveBeenCalledWith(
      expect.any(Function)
    );

    // Check the function passed to umami.track
    const trackCall = mockUmami.track.mock.calls[0][0];
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
    localStorageMock.getItem.mockReturnValue(uuid);
    mockLocation.search = '?birds';

    const cleanup = trackView();

    const trackCall = mockUmami.track.mock.calls[0][0];
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

    expect(mockDocument.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

    cleanup();
  });

  it('should remove visibility change listener on cleanup', () => {
    const cleanup = trackView();

    cleanup();

    expect(mockDocument.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});