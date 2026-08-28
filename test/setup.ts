import '@testing-library/jest-dom';
import fc from 'fast-check';
import { vi } from 'vitest';

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    search: '',
    pathname: '/',
    hostname: 'localhost',
    protocol: 'http:',
  },
  writable: true,
});

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

// Mock umami
Object.defineProperty(window, 'umami', {
  value: {
    track: vi.fn(),
  },
});

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn().mockResolvedValue({}),
  },
  writable: true,
});

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({});

// Mock caches
global.caches = {
  open: vi.fn().mockResolvedValue({
    addAll: vi.fn(() => Promise.resolve()),
    match: vi.fn(() => Promise.resolve(null)),
    put: vi.fn(() => Promise.resolve()),
  }),
  keys: vi.fn(() => Promise.resolve([])),
  delete: vi.fn(() => Promise.resolve(true)),
  has: vi.fn(() => Promise.resolve(false)),
  match: vi.fn(() => Promise.resolve(null)),
} as any;


// Mock document methods
Object.defineProperty(document, 'addEventListener', {
  value: vi.fn(),
  writable: true,
});
Object.defineProperty(document, 'removeEventListener', {
  value: vi.fn(),
  writable: true,
});

// Mock Image constructor for preloading tests
global.Image = class MockImage {
  static instances: any[] = [];
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = '';
  constructor() {
    MockImage.instances.push(this);
  }
} as any;

// Mock ResizeObserver for card width tracking
global.ResizeObserver = class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
} as any;

// Prevent vitest from reporting unhandled rejections from mocks
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
// Mock PromiseRejectionEvent for jsdom
global.PromiseRejectionEvent = class PromiseRejectionEvent extends Event {
  reason: any;
  promise: Promise<any>;

  constructor(type: string, eventInitDict?: PromiseRejectionEventInit) {
    super(type);
    this.reason = eventInitDict?.reason;
    this.promise = eventInitDict?.promise || Promise.resolve();
  }
};
});