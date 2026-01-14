import { test, expect } from '@playwright/test';

test.describe('Consent Functionality E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and navigate to home
    await page.context().clearCookies();
    await page.goto('/');

    // Mock umami tracking to simulate POST requests to umami.is
    await page.route('**/umami.is/**', async route => {
      await route.fulfill({ status: 200, body: '{}' });
    });
    await page.evaluate(() => {
      window.umami = {
        track: (event: string | ((props: any) => any)) => {
          const payload = typeof event === 'function' ? event({}) : event;
          fetch('https://umami.is/api/collect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
      };
    });
  });

  test('Consent popup appears on first load with checkboxes unchecked', async ({ page }) => {
    // Check popup is visible
    const popup = page.locator('h2').filter({ hasText: 'Privacy Preferences' });
    await expect(popup).toBeVisible();

    // Check text is visible
    await expect(page.locator('p').filter({ hasText: 'We collect data to improve your experience' })).toBeVisible();

    // Check checkboxes are unchecked
    const analyticsCheckbox = page.locator('label').filter({ hasText: 'Enable Analytics Tracking' }).locator('input[type="checkbox"]');
    const crashCheckbox = page.locator('label').filter({ hasText: 'Enable Crash Reporting' }).locator('input[type="checkbox"]');
    await expect(analyticsCheckbox).not.toBeChecked();
    await expect(crashCheckbox).not.toBeChecked();
  });

  test('Accept both consents sets localStorage correctly', async ({ page }) => {
    // Check both checkboxes
    await page.locator('label').filter({ hasText: 'Enable Analytics Tracking' }).locator('input[type="checkbox"]').check();
    await page.locator('label').filter({ hasText: 'Enable Crash Reporting' }).locator('input[type="checkbox"]').check();

    // Accept selected
    await page.locator('button').filter({ hasText: 'Accept Selected' }).click();

    // Check localStorage
    const analyticsConsent = await page.evaluate(() => localStorage.getItem('analyticsConsent'));
    const crashConsent = await page.evaluate(() => localStorage.getItem('crashReportingConsent'));
    expect(analyticsConsent).toBe('true');
    expect(crashConsent).toBe('true');

    // Check no popups
    const anyPopup = page.locator('h2').filter({ hasText: 'Privacy Preferences' });
    await expect(anyPopup).toHaveCount(0);
  });

  test('Accept analytics only sets localStorage correctly', async ({ page }) => {
    // Check analytics checkbox
    await page.locator('label').filter({ hasText: 'Enable Analytics Tracking' }).locator('input[type="checkbox"]').check();

    // Accept selected
    await page.locator('button').filter({ hasText: 'Accept Selected' }).click();

    // Check localStorage
    const analyticsConsent = await page.evaluate(() => localStorage.getItem('analyticsConsent'));
    const crashConsent = await page.evaluate(() => localStorage.getItem('crashReportingConsent'));
    expect(analyticsConsent).toBe('true');
    expect(crashConsent).toBe('false');

    // Check no popups
    const anyPopup = page.locator('h2').filter({ hasText: 'Privacy Preferences' });
    await expect(anyPopup).toHaveCount(0);
  });

  test('Decline all sets both consents to false', async ({ page }) => {
    // Decline all
    await page.locator('button').filter({ hasText: 'Decline All' }).click();

    // Check localStorage
    const analyticsConsent = await page.evaluate(() => localStorage.getItem('analyticsConsent'));
    const crashConsent = await page.evaluate(() => localStorage.getItem('crashReportingConsent'));
    expect(analyticsConsent).toBe('false');
    expect(crashConsent).toBe('false');

    // Check no popups
    const anyPopup = page.locator('h2').filter({ hasText: 'Privacy Preferences' });
    await expect(anyPopup).toHaveCount(0);
  });

  test('Analytics tracking when accepted', async ({ page }) => {
    // Accept both
    await page.locator('label').filter({ hasText: 'Enable Analytics Tracking' }).locator('input[type="checkbox"]').check();
    await page.locator('label').filter({ hasText: 'Enable Crash Reporting' }).locator('input[type="checkbox"]').check();
    await page.locator('button').filter({ hasText: 'Accept Selected' }).click();

    // Listen for POST requests to umami.is
    let trackRequests = 0;
    page.on('request', (request) => {
      if (request.url().includes('umami.is') && request.method() === 'POST') {
        trackRequests++;
      }
    });

    // Navigate to card-lists to trigger tracking
    await page.goto('/card-lists');

    // Wait a bit
    await page.waitForTimeout(1000);

    // Should have at least one umami POST request
    expect(trackRequests).toBeGreaterThan(0);
  });

  test('No analytics tracking when declined', async ({ page }) => {
    // Decline analytics, accept crash
    await page.locator('label').filter({ hasText: 'Enable Crash Reporting' }).locator('input[type="checkbox"]').check();
    await page.locator('button').filter({ hasText: 'Accept Selected' }).click();

    // Listen for requests to umami
    let umamiRequests = 0;
    page.on('request', (request) => {
      if (request.url().includes('umami.is') && request.method() === 'POST') {
        umamiRequests++;
      }
    });

    // Navigate to card-lists
    await page.goto('/card-lists');

    // Wait
    await page.waitForTimeout(1000);

    // Should have no umami requests
    expect(umamiRequests).toBe(0);
  });

  test('Error reporting when accepted', async ({ page }) => {
    // Accept both
    await page.locator('label').filter({ hasText: 'Enable Analytics Tracking' }).locator('input[type="checkbox"]').check();
    await page.locator('label').filter({ hasText: 'Enable Crash Reporting' }).locator('input[type="checkbox"]').check();
    await page.locator('button').filter({ hasText: 'Accept Selected' }).click();

    // Listen for POST to error url
    let errorPosts = 0;
    page.on('request', (request) => {
      if (request.url().includes('errors.cards.unimpossy.com') && request.method() === 'POST') {
        errorPosts++;
      }
    });

    // Simulate error
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('Test error');
      }, 0);
    });

    // Wait
    await page.waitForTimeout(1000);

    // Should have at least one POST
    expect(errorPosts).toBeGreaterThan(0);
  });

  test('No error reporting when declined', async ({ page }) => {
    // Accept analytics, decline crash
    await page.locator('label').filter({ hasText: 'Enable Analytics Tracking' }).locator('input[type="checkbox"]').check();
    await page.locator('button').filter({ hasText: 'Accept Selected' }).click();

    // Listen for POST to error url
    let errorPosts = 0;
    page.on('request', (request) => {
      if (request.url().includes('errors.cards.unimpossy.com') && request.method() === 'POST') {
        errorPosts++;
      }
    });

    // Simulate error
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error('Test error');
      }, 0);
    });

    // Wait
    await page.waitForTimeout(1000);

    // Should have no POST
    expect(errorPosts).toBe(0);
  });

  test('Popup does not reappear after consent', async ({ page }) => {
    // Accept both
    await page.locator('label').filter({ hasText: 'Enable Analytics Tracking' }).locator('input[type="checkbox"]').check();
    await page.locator('label').filter({ hasText: 'Enable Crash Reporting' }).locator('input[type="checkbox"]').check();
    await page.locator('button').filter({ hasText: 'Accept Selected' }).click();

    // Reload page
    await page.reload();

    // Check no popups
    const anyPopup = page.locator('h2').filter({ hasText: 'Privacy Preferences' });
    await expect(anyPopup).toHaveCount(0);
  });
});