import '@testing-library/jest-dom';
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

// Mock document methods
Object.defineProperty(document, 'addEventListener', {
  value: vi.fn(),
  writable: true,
});
Object.defineProperty(document, 'removeEventListener', {
  value: vi.fn(),
  writable: true,
});