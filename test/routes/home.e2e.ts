import { test, expect } from '@playwright/test';

async function handleConsentPopup(page) {
  const acceptButton = page.getByRole('button', { name: 'Accept Selected' });
  if (await acceptButton.isVisible({ timeout: 2000 })) {
    await acceptButton.click();
  }
}

test.describe('Home Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and navigate to home
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('analyticsConsent', 'true');
      localStorage.setItem('crashReportingConsent', 'true');
    });
    // Handle consent popup if it appears
    await handleConsentPopup(page);
  });

  test('Page loading and initial state', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle('Flash Cards');

    // Check card is visible
    const card = page.locator('[data-testid="card"]');
    await expect(card).toBeVisible();

    // Check initial state: not flipped, has card name
    await expect(card).toHaveAttribute('data-flipped', 'false');
    const cardName = await card.getAttribute('data-card');
    expect(cardName).toBeTruthy();

    // Check navigation buttons are present
    await expect(page.locator('#next-button')).toBeVisible();
    await expect(page.locator('#back-button')).toBeVisible();

    // Check hamburger menu is present
    await expect(page.locator('.hamburger-menu')).toBeVisible();
    await expect(page.locator('.hamburger-menu').locator('text=🌿 Plants')).toBeVisible();

    // Check URL has no query params initially
    expect(page.url()).toBe('http://localhost:5173/');

    // Check preload links exist
    const preloadLinks = page.locator('link[rel="preload"]');
    await expect(preloadLinks).toHaveCount(2); // front and back of next card
  });

  test('Card navigation with buttons', async ({ page }) => {
    const card = page.locator('[data-testid="card"]');
    const nextButton = page.locator('#next-button');
    const backButton = page.locator('#back-button');

    // Get initial card
    const initialCard = await card.getAttribute('data-card');

    // Navigate forward
    await nextButton.click();
    await expect(card).toHaveAttribute('data-flipped', 'false'); // Should unflip
    const nextCard = await card.getAttribute('data-card');
    expect(nextCard).not.toBe(initialCard);

    // Navigate backward
    await backButton.click();
    await expect(card).toHaveAttribute('data-flipped', 'false'); // Should unflip
    const backCard = await card.getAttribute('data-card');
    expect(backCard).toBe(initialCard);

    // Test boundary: back from first card should stay
    await backButton.click();
    await expect(card).toHaveAttribute('data-card', initialCard as string);
  });

  test('Card navigation with keyboard', async ({ page }) => {
    const card = page.locator('[data-testid="card"]');

    // Get initial card
    const initialCard = await card.getAttribute('data-card');

    // Navigate forward with ArrowRight
    await page.keyboard.press('ArrowRight');
    await expect(card).toHaveAttribute('data-flipped', 'false');
    const nextCard = await card.getAttribute('data-card');
    expect(nextCard).not.toBe(initialCard);

    // Navigate backward with ArrowLeft
    await page.keyboard.press('ArrowLeft');
    await expect(card).toHaveAttribute('data-flipped', 'false');
    const backCard = await card.getAttribute('data-card');
    expect(backCard).toBe(initialCard);

    // Test boundary: back from first card should stay
    await page.keyboard.press('ArrowLeft');
    await expect(card).toHaveAttribute('data-card', initialCard as string);
  });

  test('Card flipping with click', async ({ page }) => {
    const card = page.locator('[data-testid="card"]');

    // Initial state: not flipped
    await expect(card).toHaveAttribute('data-flipped', 'false');

    // Click to flip
    await card.click();
    await expect(card).toHaveAttribute('data-flipped', 'true');

    // Click again to unflip
    await card.click();
    await expect(card).toHaveAttribute('data-flipped', 'false');
  });

  test('Card flipping with keyboard', async ({ page }) => {
    const card = page.locator('[data-testid="card"]');

    // Initial state: not flipped
    await expect(card).toHaveAttribute('data-flipped', 'false');

    // Hold ArrowUp to flip
    await page.keyboard.down('ArrowUp');
    await expect(card).toHaveAttribute('data-flipped', 'true');

    // Release ArrowUp to unflip
    await page.keyboard.up('ArrowUp');
    await expect(card).toHaveAttribute('data-flipped', 'false');

    // Press space to toggle
    await page.keyboard.press(' ');
    await expect(card).toHaveAttribute('data-flipped', 'true');
    await page.keyboard.press(' ');
    await expect(card).toHaveAttribute('data-flipped', 'false');
  });

  test('Mode switching with hamburger menu', async ({ page }) => {
    const menuButton = page.locator('.hamburger-menu button').first();

    // Initial mode: Plants
    await expect(menuButton).toHaveText('🌿 Plants');

    // Switch to Birds
    await menuButton.scrollIntoViewIfNeeded();
    await menuButton.click();
    await page.waitForTimeout(100);
    await expect(menuButton).toHaveText('🐦 Birds');

    // Switch to Both
    await menuButton.scrollIntoViewIfNeeded();
    await menuButton.click();
    await page.waitForTimeout(100);
    await expect(menuButton).toHaveText('🌿🐦 Both');

    // Switch back to Plants
    await menuButton.scrollIntoViewIfNeeded();
    await menuButton.click();
    await page.waitForTimeout(100);
    await expect(menuButton).toHaveText('🌿 Plants');

    // Check card changes after mode switch
    const card = page.locator('[data-testid="card"]');
    const initialCard = await card.getAttribute('data-card');

    await menuButton.scrollIntoViewIfNeeded();
    await menuButton.click(); // To Birds
    await page.waitForTimeout(100);
    const birdsCard = await card.getAttribute('data-card');
    expect(birdsCard).not.toBe(initialCard);

    await menuButton.scrollIntoViewIfNeeded();
    await menuButton.click(); // To Both
    await page.waitForTimeout(100);
    const bothCard = await card.getAttribute('data-card');
    // Both includes plants and birds, so could be same or different
    expect(bothCard).toBeTruthy();
  });

  test('Settings panel interaction', async ({ page }) => {
    // Open settings
    const settingsButton = page.locator('.hamburger-menu button[title="Settings"]');
    await settingsButton.scrollIntoViewIfNeeded();
    await settingsButton.click();

    // Check settings panel is visible
    const settingsPanel = page.locator('div').filter({ hasText: 'Settings' });
    await expect(settingsPanel).toBeVisible();

    // Check flip speed slider
    const slider = settingsPanel.locator('input[type="range"]');
    await expect(slider).toBeVisible();
    await expect(slider).toHaveValue('0.8');

    // Adjust flip speed
    await slider.fill('1.2');
    await expect(slider).toHaveValue('1.2');

    // Check localStorage is updated
    const flipSpeed = await page.evaluate(() => localStorage.getItem('flipSpeed'));
    expect(flipSpeed).toBe('1.2');

    // Close settings by clicking outside
    await page.locator('main').click();
    await expect(settingsPanel).toBeHidden();
  });

  test('Image preloading functionality', async ({ page }) => {
    // Open settings
    const settingsButton = page.locator('.hamburger-menu button[title="Settings"]');
    await settingsButton.scrollIntoViewIfNeeded();
    await settingsButton.click();

    // Click preload button
    const preloadButton = page.locator('button').filter({ hasText: 'Download for Offline' });
    await preloadButton.click();

    // Check progress indicator appears
    const progressContainer = page.locator('[data-testid="preload-progress"]');
    await expect(progressContainer).toBeVisible();

    // Wait for preloading to complete
    await page.waitForTimeout(3000); // Allow time for images to load

    // Check localStorage is set
    const preloaded = await page.evaluate(() => localStorage.getItem('pwa-cards-preloaded'));
    expect(preloaded).toBe('true');

    // Button should show as completed
    await expect(page.locator('button').filter({ hasText: 'Cards Downloaded' })).toBeVisible();
  });

  test('URL state persistence', async ({ page }) => {
    // Initial URL has no params
    expect(page.url()).toBe('http://localhost:5173/');

    // Switch to birds mode
    const menuButton = page.locator('.hamburger-menu button').first();
    await menuButton.click();
    await page.waitForTimeout(100); // Allow for state update
    expect(page.url()).toBe('http://localhost:5173/?birds=true');

    // Switch to both
    await menuButton.click();
    await page.waitForTimeout(100);
    expect(page.url()).toBe('http://localhost:5173/?both=true');

    // Switch to plants (no params)
    await menuButton.click();
    await page.waitForTimeout(100);
    expect(page.url()).toBe('http://localhost:5173/');

    // Reload page and check mode persists
    await page.reload();
    await expect(page.locator('.hamburger-menu button').first()).toHaveText('🌿 Plants');
  });

  test('Responsive behavior', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check elements are still visible and functional
    await expect(page.locator('[data-testid="card"]')).toBeVisible();
    await expect(page.locator('#next-button')).toBeVisible();
    await expect(page.locator('#back-button')).toBeVisible();
    await page.locator('.hamburger-menu').scrollIntoViewIfNeeded();
    await expect(page.locator('.hamburger-menu')).toBeVisible();

    // Test navigation on mobile
    const card = page.locator('[data-testid="card"]');
    const initialCard = await card.getAttribute('data-card');

    await page.locator('#next-button').click();
    const nextCard = await card.getAttribute('data-card');
    expect(nextCard).not.toBe(initialCard);

    // Test on tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await expect(page.locator('[data-testid="card"]')).toBeVisible();
    await expect(page.locator('#next-button')).toBeVisible();

    // Test on desktop
    await page.setViewportSize({ width: 1920, height: 1080 });

    await expect(page.locator('[data-testid="card"]')).toBeVisible();
    await expect(page.locator('#next-button')).toBeVisible();
  });

  test('Complex user flow: navigation, flipping, and mode switching', async ({ page }) => {
    const card = page.locator('[data-testid="card"]');
    const nextButton = page.locator('#next-button');
    const menuButton = page.locator('.hamburger-menu button').first();

    // Start in plants mode
    await expect(menuButton).toHaveText('🌿 Plants');

    // Navigate forward while flipped
    await card.click(); // flip
    await expect(card).toHaveAttribute('data-flipped', 'true');

    await nextButton.click(); // navigate and unflip
    await expect(card).toHaveAttribute('data-flipped', 'false');

    // Switch mode
    await menuButton.click(); // to birds
    await expect(menuButton).toHaveText('🐦 Birds');
    await expect(card).toHaveAttribute('data-flipped', 'false'); // reset

    // Keyboard navigation in new mode
    await page.keyboard.press('ArrowRight');
    await expect(card).toHaveAttribute('data-flipped', 'false');

    // Flip with space
    await page.keyboard.press(' ');
    await expect(card).toHaveAttribute('data-flipped', 'true');
  });

  test('Settings modal advanced interactions', async ({ page }) => {
    // Open settings
    const settingsButton = page.locator('.hamburger-menu button[title="Settings"]');
    await settingsButton.scrollIntoViewIfNeeded();
    await settingsButton.click();

    const settingsPanel = page.locator('div').filter({ hasText: 'Settings' });
    await expect(settingsPanel).toBeVisible();

    // Test ESC key closes modal
    await page.keyboard.press('Escape');
    await expect(settingsPanel).toBeHidden();

    // Reopen and test clicking on modal content doesn't close it
    await settingsButton.click();
    await expect(settingsPanel).toBeVisible();

    // Click inside the modal (on the slider)
    const slider = settingsPanel.locator('input[type="range"]');
    await slider.click();
    await expect(settingsPanel).toBeVisible(); // Should still be open

    // Close by clicking outside
    await page.locator('main').click();
    await expect(settingsPanel).toBeHidden();
  });

  test('View mode persistence with localStorage', async ({ page }) => {
    // Switch to birds mode
    const menuButton = page.locator('.hamburger-menu button').first();
    await menuButton.click();
    await expect(menuButton).toHaveText('🐦 Birds');

    // Check localStorage
    const modeFromStorage = await page.evaluate(() => localStorage.getItem('mode'));
    expect(modeFromStorage).toBe('birds');

    // Reload page
    await page.reload();

    // Should persist
    await expect(menuButton).toHaveText('🐦 Birds');

    // Switch to both
    await menuButton.click();
    await expect(menuButton).toHaveText('🌿🐦 Both');

    // Check localStorage updated
    const bothModeFromStorage = await page.evaluate(() => localStorage.getItem('mode'));
    expect(bothModeFromStorage).toBe('both');
  });

  test('Error handling: image load failure', async ({ page }) => {
    // Mock a failed image load by intercepting requests
    await page.route('**/cards/*', async route => {
      if (route.request().url().includes('Front.png')) {
        await route.fulfill({ status: 404 });
      } else {
        await route.continue();
      }
    });

    // Reload to trigger image loading
    await page.reload();

    // Card should still be visible (fallback or error handling)
    const card = page.locator('[data-testid="card"]');
    await expect(card).toBeVisible();

    // Check if there's an error indicator or fallback
    const img = card.locator('.flip-card-front img');
    if (await img.isVisible()) {
      // If img is present, check for error state
      const imgSrc = await img.getAttribute('src');
      expect(imgSrc).toBeTruthy();
    }
  });

  test('Error handling: corrupted localStorage', async ({ page }) => {
    // Set corrupted localStorage values
    await page.evaluate(() => {
      localStorage.setItem('flipSpeed', 'invalid');
      localStorage.setItem('mode', 'invalid');
      localStorage.setItem('pwa-cards-preloaded', 'corrupted');
    });

    // Reload page
    await page.reload();

    // App should handle gracefully - default to plants mode
    const menuButton = page.locator('.hamburger-menu button').first();
    await expect(menuButton).toHaveText('🌿 Plants');

    // Settings should work
    const settingsButton = page.locator('.hamburger-menu button[title="Settings"]');
    await settingsButton.click();
    const settingsPanel = page.locator('div').filter({ hasText: 'Settings' });
    await expect(settingsPanel).toBeVisible();

    // Flip speed should default
    const slider = settingsPanel.locator('input[type="range"]');
    await expect(slider).toHaveValue('0.8');
  });

  test('View modes: edge cases and boundaries', async ({ page }) => {
    const menuButton = page.locator('.hamburger-menu button').first();

    // Start in plants
    await expect(menuButton).toHaveText('🌿 Plants');

    // Switch to birds
    await menuButton.click();
    await expect(menuButton).toHaveText('🐦 Birds');

    // Switch to both
    await menuButton.click();
    await expect(menuButton).toHaveText('🌿🐦 Both');

    // Switch back to plants
    await menuButton.click();
    await expect(menuButton).toHaveText('🌿 Plants');

    // Test rapid clicking
    await menuButton.click();
    await menuButton.click();
    await menuButton.click();
    await expect(menuButton).toHaveText('🌿 Plants'); // Should cycle properly

    // Check card index resets on mode switch
    const card = page.locator('[data-testid="card"]');
    const initialCard = await card.getAttribute('data-card');

    // Navigate forward
    await page.locator('#next-button').click();
    const nextCard = await card.getAttribute('data-card');
    expect(nextCard).not.toBe(initialCard);

    // Switch mode - should reset to first card
    await menuButton.click(); // to birds
    const resetCard = await card.getAttribute('data-card');
    expect(resetCard).not.toBe(nextCard); // Should be different
  });

  test('Settings: flip speed extremes', async ({ page, browserName }) => {
    const settingsButton = page.locator('.hamburger-menu button[title="Settings"]');
    await settingsButton.scrollIntoViewIfNeeded();
    await settingsButton.click();

    const settingsPanel = page.locator('div').filter({ hasText: 'Settings' });
    const slider = settingsPanel.locator('input[type="range"]');

    // Test minimum speed
    await slider.fill('0.1');
    await expect(slider).toHaveValue('0.1');
    let flipSpeed = await page.evaluate(() => localStorage.getItem('flipSpeed'));
    expect(flipSpeed).toBe('0.1');

    // Test maximum speed
    await page.evaluate(() => {
      const slider = document.querySelector('input[type="range"]') as HTMLInputElement;
      if (slider) {
        slider.value = '2.0';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    const expectedSliderValue = browserName === 'firefox' ? '2.0' : '2';
    await expect(slider).toHaveValue(expectedSliderValue);
    flipSpeed = await page.evaluate(() => localStorage.getItem('flipSpeed'));
    expect(flipSpeed).toBe('2.0');

    // Close settings
    await page.locator('main').click();
  });
});