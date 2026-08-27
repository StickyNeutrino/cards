const ERROR_REPORT_URL = 'https://errors.cards.unimpossy.com/report';

export interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  type: 'javascript' | 'promise' | 'react';
}

export async function reportError(error: ErrorReport): Promise<void> {
  if (localStorage.getItem('crashReportingConsent') === 'false') return;
  try {
    await fetch(ERROR_REPORT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(error),
    });
  } catch (reportError) {
    // Silently fail if reporting fails to avoid infinite loops
    console.error('Failed to report error:', reportError);
  }
}

export function setupGlobalErrorHandlers(): () => void {
  const handleError = (event: ErrorEvent) => {
    const errorReport: ErrorReport = {
      message: event.message,
      stack: event.error?.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      type: 'javascript',
    };
    reportError(errorReport);
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    event.preventDefault();
    const errorReport: ErrorReport = {
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      type: 'promise',
    };
    reportError(errorReport);
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  // Return cleanup function
  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
}