import { test, expect } from '@playwright/test';

test.describe('Privacy Policy Page', () => {
  test('content is reachable from the top of the page', async ({ page }) => {
    await page.goto('/privacy');

    const heading = page.getByRole('heading', { name: 'Privacy Policy' });
    await expect(heading).toBeVisible();
    await expect(page.getByRole('link', { name: /Back to Flash Cards/ })).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 0));
    const top = await heading.evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(0);
  });

  test('bottom of the page, including contact info, is scrollable into view', async ({ page }) => {
    await page.goto('/privacy');

    const contact = page.getByRole('heading', { name: 'Contact' });
    await contact.scrollIntoViewIfNeeded();
    await expect(contact).toBeVisible();

    const link = page.getByRole('link', { name: 'contact@unimpossy.com' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'mailto:contact@unimpossy.com');
  });
});