import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import React, { useEffect, useState } from "react";
import trackView from "./viewtrack";
import { setupGlobalErrorHandlers, reportError } from "./utils/errorReporting";
import ConsentBanner from "./components/ConsentBanner";

export const links: Route.LinksFunction = () => [
  {
    rel: "preload",
    href: "/fonts/InterVariable.woff2",
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
  { rel: "manifest", href: "/manifest.json" },
  { rel: "icon", href: "/icon.svg" },
];

export function HydrateFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Loading flashcards...</p>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#9e4829" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Flash Cards" />
        {!import.meta.env.VITE_DISABLE_UMAMI && <script defer src="https://cloud.umami.is/script.js" data-website-id="37372e71-04e7-45d4-9227-634088b621b7" data-auto-track="false"></script>}
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const [showConsentBanner, setShowConsentBanner] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('analyticsConsent') === null) {
      localStorage.setItem('analyticsConsent', 'true');
    }
    if (localStorage.getItem('crashReportingConsent') === null) {
      localStorage.setItem('crashReportingConsent', 'true');
    }
  }, []);

  useEffect(() => {
    return trackView();
  },[])

  useEffect(() => {
    return setupGlobalErrorHandlers();
  }, []);

  useEffect(() => {
    if('serviceWorker' in navigator && !import.meta.env.VITEST) {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem('consentNoticeDismissed') !== 'true') {
      setShowConsentBanner(true);
    }
  }, []);

  const dismissConsentBanner = () => {
    localStorage.setItem('consentNoticeDismissed', 'true');
    setShowConsentBanner(false);
  };

  const handleOptOut = () => {
    localStorage.setItem('analyticsConsent', 'false');
    localStorage.setItem('crashReportingConsent', 'false');
    window.dispatchEvent(new CustomEvent('consentChanged'));
    dismissConsentBanner();
  };

  return (
    <>
      {showConsentBanner && <ConsentBanner onDismiss={dismissConsentBanner} onOptOut={handleOptOut} />}
      <Outlet />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  React.useEffect(() => {
    if (error) {
      const errorReport = {
        message: details,
        stack: stack || (error instanceof Error ? error.stack : undefined),
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        type: 'react' as const,
      };
      reportError(errorReport);
    }
  }, [error, details, stack]);

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

