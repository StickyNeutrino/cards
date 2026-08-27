import { test, expect } from '@playwright/test';

test.describe('Consent Functionality E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // The umami script is disabled in the test server, so install a mock
    // before the app boots to observe tracking calls.
    await page.addInitScript(() => {
      (window as any).umami_track_called = 0;
      (window as any).umami_last_arg = undefined;
      (window as any).umami = {
        track: (event: unknown) => {
          (window as any).umami_track_called += 1;
          (window as any).umami_last_arg = event;
        }
      };
    });
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('Consent banner appears on first load without blocking the app', async ({ page }) => {
    const banner = page.getByTestId('consent-banner');
    await expect(banner).toBeVisible();

    // The app underneath must be rendered and usable
    await expect(page.locator('[data-testid="card"]')).toBeVisible();
    await expect(page.locator('#next-button')).toBeVisible();

    await expect(banner.locator('a[href="/privacy"]')).toBeVisible();
  });

  test('Analytics and crash reporting are enabled by default', async ({ page }) => {
    // The banner renders after the effect that writes the defaults
    await expect(page.getByTestId('consent-banner')).toBeVisible();

    const analyticsConsent = await page.evaluate(() => localStorage.getItem('analyticsConsent'));
    const crashConsent = await page.evaluate(() => localStorage.getItem('crashReportingConsent'));
    expect(analyticsConsent).toBe('true');
    expect(crashConsent).toBe('true');

    await page.waitForFunction(() => (window as any).umami_track_called > 0);
  });

  test('Tracked payloads contain no persistent identifier', async ({ page }) => {
    await page.waitForFunction(() => (window as any).umami_track_called > 0);

    const payload = await page.evaluate(() => {
      const arg = (window as any).umami_last_arg;
      return typeof arg === 'function' ? arg({}) : arg;
    });

    expect(payload.id).toBeUndefined();
    expect(await page.evaluate(() => localStorage.getItem('uuid'))).toBeNull();
  });

  test('Dismissing the banner keeps default tracking on and hides the banner on reload', async ({ page }) => {
    await page.getByTestId('consent-dismiss').click();
    await expect(page.getByTestId('consent-banner')).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('consent-banner')).toHaveCount(0);

    const analyticsConsent = await page.evaluate(() => localStorage.getItem('analyticsConsent'));
    expect(analyticsConsent).toBe('true');
  });

  test('Opting out sets both consents to false and stops analytics', async ({ page }) => {
    await page.waitForFunction(() => (window as any).umami_track_called > 0);

    await page.getByTestId('consent-opt-out').click();
    await expect(page.getByTestId('consent-banner')).toHaveCount(0);

    const analyticsConsent = await page.evaluate(() => localStorage.getItem('analyticsConsent'));
    const crashConsent = await page.evaluate(() => localStorage.getItem('crashReportingConsent'));
    expect(analyticsConsent).toBe('false');
    expect(crashConsent).toBe('false');

    await page.goto('/card-lists');
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => (window as any).umami_track_called)).toBe(0);
  });

  test('Error reporting is enabled by default', async ({ page }) => {
    await expect(page.getByTestId('consent-banner')).toBeVisible();

    let errorPosts = 0;
    page.on('request', (request) => {
      if (request.url().includes('errors.cards.unimpossy.com') && request.method() === 'POST') {
        errorPosts++;
      }
    });

    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('Test error');
      }, 0);
    });

    await page.waitForTimeout(1000);
    expect(errorPosts).toBeGreaterThan(0);
  });

  test('No error reporting when opted out', async ({ page }) => {
    await page.getByTestId('consent-opt-out').click();

    let errorPosts = 0;
    page.on('request', (request) => {
      if (request.url().includes('errors.cards.unimpossy.com') && request.method() === 'POST') {
        errorPosts++;
      }
    });

    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('Test error');
      }, 0);
    });

    await page.waitForTimeout(1000);
    expect(errorPosts).toBe(0);
  });
});
