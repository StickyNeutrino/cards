import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Layout, ErrorBoundary } from '../app/root';
import App from '../app/root';
import * as viewtrack from '../app/viewtrack';
import * as errorReporting from '../app/utils/errorReporting';
import { isRouteErrorResponse } from 'react-router';

// Mock React Router components
vi.mock('react-router', () => ({
  isRouteErrorResponse: vi.fn(),
  Links: () => <link data-testid="links" />,
  Meta: () => <meta data-testid="meta" />,
  Outlet: () => <div data-testid="outlet" />,
  Scripts: () => <script data-testid="scripts" />,
  ScrollRestoration: () => <div data-testid="scroll-restoration" />,
}));

// Mock viewtrack
vi.mock('../app/viewtrack', () => ({
  default: vi.fn(),
}));

// Mock errorReporting
vi.mock('../app/utils/errorReporting', () => ({
  setupGlobalErrorHandlers: vi.fn(() => vi.fn()),
  reportError: vi.fn(),
}));

describe('Layout', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      ...global.navigator,
      serviceWorker: {
        register: vi.fn().mockResolvedValue({}),
      },
    });
    global.fetch = vi.fn().mockResolvedValue({});
  });

  it('renders HTML structure with correct lang attribute', () => {
    render(<Layout><div>Test content</div></Layout>);

    const html = document.querySelector('html');
    expect(html).toHaveAttribute('lang', 'en');
  });

  it('renders head with meta tags', () => {
    render(<Layout><div>Test content</div></Layout>);

    const metaCharset = document.querySelector('meta[charset]');
    expect(metaCharset).toHaveAttribute('charset', 'utf-8');

    const metaViewport = document.querySelector('meta[name="viewport"]');
    expect(metaViewport).toHaveAttribute('content', 'width=device-width, initial-scale=1');

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    expect(metaThemeColor).toHaveAttribute('content', '#9e4829');

    const metaAppleMobileCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    expect(metaAppleMobileCapable).toHaveAttribute('content', 'yes');

    const metaAppleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    expect(metaAppleStatusBar).toHaveAttribute('content', 'default');

    const metaAppleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    expect(metaAppleTitle).toHaveAttribute('content', 'Flash Cards');
  });

  it('renders links and meta components', () => {
    render(<Layout><div>Test content</div></Layout>);

    // Check that the components are rendered by looking for their test ids
    const linksElement = document.querySelector('[data-testid="links"]');
    const metaElement = document.querySelector('[data-testid="meta"]');

    expect(linksElement).toBeInTheDocument();
    expect(metaElement).toBeInTheDocument();
  });

  it('renders umami script', () => {
    render(<Layout><div>Test content</div></Layout>);

    const script = document.querySelector('script[src*="cloud.umami.is"]');
    expect(script).toBeInTheDocument();
    expect(script).toHaveAttribute('defer');
    expect(script).toHaveAttribute('data-website-id', '37372e71-04e7-45d4-9227-634088b621b7');
    expect(script).toHaveAttribute('data-auto-track', 'false');
  });

  it('renders service worker script', () => {
    render(<Layout><div>Test content</div></Layout>);

    const script = Array.from(document.querySelectorAll('script')).find(s => s.textContent && s.textContent.includes('serviceWorker'));
    expect(script).toBeInTheDocument();
    expect(script?.textContent).toContain('serviceWorker.register');
  });

  it('renders body with children and React Router components', () => {
    render(<Layout><div>Test content</div></Layout>);

    expect(screen.getByText('Test content')).toBeInTheDocument();
    expect(screen.getByTestId('scroll-restoration')).toBeInTheDocument();
    expect(screen.getByTestId('scripts')).toBeInTheDocument();
  });
});

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Outlet component', () => {
    render(<App />);

    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('calls trackView on mount', () => {
    render(<App />);

    expect(viewtrack.default).toHaveBeenCalledTimes(1);
  });

  it('calls setupGlobalErrorHandlers on mount', () => {
    render(<App />);

    expect(errorReporting.setupGlobalErrorHandlers).toHaveBeenCalledTimes(1);
  });

  it('returns cleanup function from setupGlobalErrorHandlers', () => {
    const mockCleanup = vi.fn();
    vi.mocked(errorReporting.setupGlobalErrorHandlers).mockReturnValue(mockCleanup);

    const { unmount } = render(<App />);
    unmount();

    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default error message for generic errors', () => {
    const error = new Error('Test error');
    render(<ErrorBoundary error={error} params={{}} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Oops!');
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders 404 message for route errors', () => {
    // Mock isRouteErrorResponse for this test
    vi.mocked(isRouteErrorResponse).mockReturnValue(true);

    const error = { status: 404, statusText: 'Not Found' };
    render(<ErrorBoundary error={error} params={{}} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('404');
    expect(screen.getByText('The requested page could not be found.')).toBeInTheDocument();

    vi.mocked(isRouteErrorResponse).mockRestore();
  });

  it('renders error message in development', () => {
    const originalEnv = import.meta.env.DEV;
    import.meta.env.DEV = true;

    const error = new Error('Development error message');
    render(<ErrorBoundary error={error} params={{}} />);

    expect(screen.getByText('Development error message')).toBeInTheDocument();

    import.meta.env.DEV = originalEnv;
  });

  it('renders stack trace in development', () => {
    const originalEnv = import.meta.env.DEV;
    import.meta.env.DEV = true;

    const error = new Error('Test error');
    error.stack = 'Error stack trace';
    render(<ErrorBoundary error={error} params={{}} />);

    expect(screen.getByText('Error stack trace')).toBeInTheDocument();

    import.meta.env.DEV = originalEnv;
  });

  it('calls reportError when error is present', () => {
    const error = new Error('Test error');
    render(<ErrorBoundary error={error} params={{}} />);

    expect(errorReporting.reportError).toHaveBeenCalledWith({
      message: 'Test error',
      stack: expect.any(String),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: expect.any(String),
      type: 'react',
    });
  });

  it('applies correct CSS classes', () => {
    const error = new Error('Test error');
    const { container } = render(<ErrorBoundary error={error} params={{}} />);

    expect(container.firstChild).toHaveClass('pt-16', 'p-4', 'container', 'mx-auto');
  });
});