import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackCardView } from '../../app/viewtrack';

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

describe('trackCardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    mockLocation.search = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate and store UUID if not exists', () => {
    trackCardView();

    expect(localStorageMock.getItem).toHaveBeenCalledWith('uuid');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('uuid', expect.any(String));
  });

  it('should use existing UUID if already stored', () => {
    const existingUuid = 'test-uuid-123';
    localStorageMock.getItem.mockReturnValue(existingUuid);

    trackCardView();

    expect(localStorageMock.getItem).toHaveBeenCalledWith('uuid');
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('should call umami.track with correct parameters for plants', () => {
    const uuid = 'test-uuid';
    localStorageMock.getItem.mockReturnValue(uuid);

    trackCardView();

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
      name: 'viewed card',
      data: { type: 'plants' },
    });
  });

  it('should call umami.track with correct parameters for birds', () => {
    const uuid = 'test-uuid';
    localStorageMock.getItem.mockReturnValue(uuid);
    mockLocation.search = '?birds';

    trackCardView();

    const trackCall = mockUmami.track.mock.calls[0][0];
    const mockProps = { some: 'props' };
    const result = trackCall(mockProps);

    expect(result).toEqual({
      ...mockProps,
      id: uuid,
      name: 'viewed card',
      data: { type: 'birds' },
    });
  });
});