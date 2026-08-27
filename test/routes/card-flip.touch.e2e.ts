import { test, expect } from '@playwright/test';

test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

test.describe('Card flip on touch devices', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('analyticsConsent', 'true');
      localStorage.setItem('crashReportingConsent', 'true');
      localStorage.setItem('consentNoticeDismissed', 'true');
    });
    await page.goto('/');
  });

  test('tap flips the card to the back and tapping again returns it to the front', async ({ page }) => {
    const card = page.locator('[data-testid="card"]');
    await expect(card).toHaveAttribute('data-flipped', 'false');

    await card.tap();
    await expect(card).toHaveAttribute('data-flipped', 'true');

    await card.tap();
    await expect(card).toHaveAttribute('data-flipped', 'false');
  });

  test('tapping twice returns the card to the front visually, not just in state', async ({ page }) => {
    const card = page.locator('[data-testid="card"]');
    const inner = card.locator('.flip-card-inner');

    await card.tap();
    await expect(card).toHaveAttribute('data-flipped', 'true');
    await expect
      .poll(() => inner.evaluate((el) => getComputedStyle(el).transform))
      .not.toBe('none');

    await card.tap();
    await expect(card).toHaveAttribute('data-flipped', 'false');
    await expect
      .poll(() => inner.evaluate((el) => getComputedStyle(el).transform))
      .toBe('none');
  });

  test('rapid double taps keep flip state in sync with the visible face', async ({ page }) => {
    const card = page.locator('[data-testid="card"]');
    const inner = card.locator('.flip-card-inner');

    await card.tap();
    await card.tap();
    await expect(card).toHaveAttribute('data-flipped', 'false');
    await expect
      .poll(() => inner.evaluate((el) => getComputedStyle(el).transform))
      .toBe('none');

    await card.tap();
    await expect(card).toHaveAttribute('data-flipped', 'true');
    await expect
      .poll(() => inner.evaluate((el) => getComputedStyle(el).transform))
      .not.toBe('none');
  });
});
