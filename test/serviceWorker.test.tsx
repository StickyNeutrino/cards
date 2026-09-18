import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import App from '../app/root';

// The service worker registration lives in App (app/root.tsx). The
// registration itself is exercised by the Playwright e2e suite; in the unit
// environment the app is expected to skip it entirely (see the
// `!import.meta.env.VITEST` guard), so that is what is locked in here.
vi.mock('../app/viewtrack', () => ({ default: vi.fn() }));
vi.mock('../app/utils/errorReporting', () => ({
  setupGlobalErrorHandlers: vi.fn(() => vi.fn()),
  reportError: vi.fn(),
}));
vi.mock('react-router', () => ({
  isRouteErrorResponse: vi.fn(),
  Links: () => <link data-testid="links" />,
  Meta: () => <meta data-testid="meta" />,
  Outlet: () => <div data-testid="outlet" />,
  Scripts: () => <script data-testid="scripts" />,
  ScrollRestoration: () => <div data-testid="scroll-restoration" />,
}));

describe('Service worker registration (App)', () => {
  let register: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    register = vi.fn().mockResolvedValue({});
    vi.stubGlobal('navigator', {
      ...global.navigator,
      serviceWorker: { register },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not register a service worker under VITEST', async () => {
    expect(import.meta.env.VITEST).toBeTruthy();

    render(<App />);

    // Allow any queued effects to flush
    await Promise.resolve();

    expect(register).not.toHaveBeenCalled();
  });

  it('never registers a service worker for any of the app mounts', async () => {
    // Repeated mounts (as happens across the suite) must not slip a
    // registration through either.
    for (let i = 0; i < 3; i++) {
      render(<App />);
    }
    await Promise.resolve();

    expect(register).not.toHaveBeenCalled();
  });
});
