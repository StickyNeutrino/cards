import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
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
  // Layout renders the full document shell (<html>/<head>/<body>), so it is
  // asserted as a server-rendered string. Rendering it into a jsdom <div>
  // would both trip React's "<html> cannot be a child of <div>" validation
  // and have React 19 hoist the <script>/<meta> tags out of the container.
  const renderLayoutHtml = () =>
    renderToStaticMarkup(<Layout><div>Test content</div></Layout>);

  it('renders HTML structure with correct lang attribute', () => {
    const html = renderLayoutHtml();

    expect(html.startsWith('<html lang="en">')).toBe(true);
    expect(html).toContain('<body>');
    expect(html).toContain('Test content');
  });

  it('renders head with meta tags', () => {
    const html = renderLayoutHtml();

    expect(html).toContain('charSet="utf-8"');
    expect(html).toContain('name="viewport"');
    expect(html).toContain('content="width=device-width, initial-scale=1"');
    expect(html).toContain('name="theme-color" content="#9e4829"');
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(html).toContain('name="apple-mobile-web-app-status-bar-style" content="default"');
    expect(html).toContain('name="apple-mobile-web-app-title" content="Flash Cards"');
  });

  it('renders links and meta components', () => {
    const html = renderLayoutHtml();

    expect(html).toContain('data-testid="links"');
    expect(html).toContain('data-testid="meta"');
  });

  it('renders the umami analytics script when tracking is not disabled', () => {
    const html = renderLayoutHtml();

    expect(html).toContain('<script defer="" src="https://cloud.umami.is/script.js"');
    expect(html).toContain('data-website-id="37372e71-04e7-45d4-9227-634088b621b7"');
    expect(html).toContain('data-auto-track="false"');
  });

  it('omits the umami analytics script when VITE_DISABLE_UMAMI is set', () => {
    const original = import.meta.env.VITE_DISABLE_UMAMI;
    (import.meta.env as any).VITE_DISABLE_UMAMI = 'true';
    try {
      const html = renderLayoutHtml();

      expect(html).not.toContain('umami');
    } finally {
      (import.meta.env as any).VITE_DISABLE_UMAMI = original;
    }
  });

  it('renders body with children and React Router components', () => {
    const html = renderLayoutHtml();

    expect(html).toContain('<div>Test content</div>');
    expect(html).toContain('data-testid="scroll-restoration"');
    expect(html).toContain('data-testid="scripts"');
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

  it('renders the error details for generic errors', () => {
    const error = new Error('Development error message');
    render(<ErrorBoundary error={error} params={{}} />);

    expect(screen.getByText('Development error message')).toBeInTheDocument();
  });

  it('renders the stack trace when one is available', () => {
    const error = new Error('Test error');
    error.stack = 'Error stack trace';
    render(<ErrorBoundary error={error} params={{}} />);

    expect(screen.getByText('Error stack trace')).toBeInTheDocument();
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