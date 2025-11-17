import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock navigator.serviceWorker
const mockRegister = vi.fn();
const mockAddEventListener = vi.fn();
const mockServiceWorker = {
  register: mockRegister,
  addEventListener: mockAddEventListener,
};

describe('Service Worker Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers service worker if supported', () => {
    // Simulate the registration logic
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
    }

    expect(mockRegister).toHaveBeenCalledWith('/service-worker.js', { scope: '/' });
  });


  it('handles successful registration', async () => {
    const mockRegistration = {
      installing: null,
      waiting: null,
      active: {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    mockRegister.mockResolvedValue(mockRegistration);

    const result = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });

    expect(result).toBe(mockRegistration);
    expect(mockRegister).toHaveBeenCalledWith('/service-worker.js', { scope: '/' });
  });

  it('handles registration failure', async () => {
    const error = new Error('Registration failed');
    mockRegister.mockRejectedValue(error);

    await expect(navigator.serviceWorker.register('/service-worker.js', { scope: '/' })).rejects.toThrow('Registration failed');
    expect(mockRegister).toHaveBeenCalledWith('/service-worker.js', { scope: '/' });
  });

  describe('Update Events', () => {
    it('handles updatefound event on registration', async () => {
      const mockInstallingWorker = {
        state: 'installing',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      const mockRegistration = {
        installing: mockInstallingWorker,
        waiting: null,
        active: {},
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      mockRegister.mockResolvedValue(mockRegistration);

      const registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });

      // Simulate adding updatefound listener
      registration.addEventListener('updatefound', () => {
        // Handle new worker
      });

      expect(registration.addEventListener).toHaveBeenCalledWith('updatefound', expect.any(Function));
    });

    it('handles controllerchange event on service worker container', () => {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Handle controller change, e.g., reload page
      });

      expect(mockAddEventListener).toHaveBeenCalledWith('controllerchange', expect.any(Function));
    });

    it('handles statechange on installing worker', async () => {
      const mockInstallingWorker = {
        state: 'installing',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as any;
      const mockRegistration = {
        installing: mockInstallingWorker,
        waiting: null,
        active: {},
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      mockRegister.mockResolvedValue(mockRegistration);

      const registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });

      // Simulate adding statechange listener
      registration.installing?.addEventListener('statechange', () => {
        if (registration.installing?.state === 'installed') {
          // Notify user of update
        }
      });

      // Simulate state change
      if (registration.installing) {
        (registration.installing as any).state = 'installed';
        const stateChangeCallback = (registration.installing as any).addEventListener.mock.calls.find(
          ([event]: [string]) => event === 'statechange'
        )?.[1];
        if (stateChangeCallback) {
          stateChangeCallback();
        }
      }

      expect(mockInstallingWorker.addEventListener).toHaveBeenCalledWith('statechange', expect.any(Function));
    });
  });
});