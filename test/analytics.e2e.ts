import { test, expect } from './e2e-helpers';

// Guards the VITE_DISABLE_UMAMI contract that keeps test traffic out of
// production analytics. The request-blocking fixture provides defense in
// depth; this test is the explicit tripwire: it fails the moment the dev
// server that is serving the app renders the Umami script, which happens
// when Playwright reuses a dev server started without the flag.
test.describe('Analytics isolation', () => {
  test('the Umami script is never served or executed during e2e tests', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="card"]')).toBeVisible();

    // No Umami script tag in the served document
    expect(await page.locator('script[src*="umami"]').count()).toBe(0);

    // The real Umami global never appears (no script loaded to define it)
    expect(await page.evaluate(() => (window as any).umami)).toBeUndefined();
  });
});
