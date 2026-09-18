import { test as base, expect } from '@playwright/test';

// Domains used by Umami Cloud for the script tag and the track API.
const UMAMI_URL_PATTERN = /(^|\/\/|\.)(cloud\.)?umami\.is\//i;

/**
 * Extended Playwright `test` that guarantees Umami analytics are never hit
 * during e2e tests.
 *
 * Two layers of protection:
 *
 * 1. Every request to an umami.is domain is aborted at the network level, so
 *    no analytics data can ever leave the browser, even if the app under test
 *    somehow renders the tracking script.
 *
 * 2. Any *attempted* umami request fails the test in teardown. A request
 *    attempt means the app was served the tracking script, which in practice
 *    happens when Playwright reuses a dev server that was started without
 *    VITE_DISABLE_UMAMI=true (e.g. a plain `npm run dev` already bound to
 *    :5173). Fail loudly so the leak gets fixed instead of silently
 *    polluting production analytics.
 *
 * Always import `test`/`expect` from this module in e2e test files, not
 * directly from '@playwright/test'.
 */
export const test = base.extend<{ blockUmami: void }>({
  blockUmami: [
    async ({ context }, use) => {
      const attempts: string[] = [];

      await context.route(UMAMI_URL_PATTERN, (route) => {
        attempts.push(route.request().url());
        return route.abort();
      });

      await use();

      if (attempts.length > 0) {
        throw new Error(
          `Umami analytics request(s) were attempted during this e2e test:\n` +
            attempts.map((url) => `  ${url}`).join('\n') +
            `\n\nAnalytics must never run during tests. This usually means the ` +
            `dev server on :5173 was started without VITE_DISABLE_UMAMI=true ` +
            `(e.g. a plain "npm run dev") and Playwright reused it. Stop that ` +
            `server and let the Playwright webServer start its own.`,
        );
      }
    },
    { auto: true },
  ],
});

export { expect };
