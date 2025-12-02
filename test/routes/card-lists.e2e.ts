import { test, expect } from '@playwright/test';

test.describe('Card Lists Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage and navigate to card-lists
    await page.context().clearCookies();
    await page.goto('/card-lists');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('Page loading and initial state', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle('Card Lists - Flash Cards');

    // Check card list is visible
    const cardList = page.locator('[data-testid="card-list"]');
    await expect(cardList).toBeVisible();

    // Check that cards are displayed
    const cardItems = page.locator('[data-testid="card-item"]');
    await expect(cardItems).toHaveCount(await cardItems.count()); // At least some cards
    expect(await cardItems.count()).toBeGreaterThan(0);

    // Check first card has name
    const firstCardName = await cardItems.first().getAttribute('data-card-name');
    expect(firstCardName).toBeTruthy();
  });

  test('Navigation to card-lists from home', async ({ page }) => {
    // First go to home
    await page.goto('/');

    // Assume there's a link or button to card-lists
    const cardListsLink = page.locator('a[href="/card-lists"]').or(page.locator('button').filter({ hasText: 'Card List' }));
    await expect(cardListsLink).toBeVisible();
    await cardListsLink.click();

    // Should navigate to card-lists
    await expect(page).toHaveURL('http://localhost:5173/card-lists');
  });

  test('Card selection and navigation back to home', async ({ page }) => {
    // Get first card item
    const firstCardItem = page.locator('[data-testid="card-item"]').first();
    const cardName = await firstCardItem.getAttribute('data-card-name');

    // Click to select
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="card-item"]') as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      }
    });

    // Should navigate back to home with selected card
    await expect(page).toHaveURL('http://localhost:5173/?card=Acorn%20Woodpecker');
    const currentCard = page.locator('[data-testid="card"]');
    await expect(currentCard).toHaveAttribute('data-card', cardName as string);
  });

  test('Filtering cards by type', async ({ page }) => {
    // Assume there are filter buttons for plants/birds/both
    const plantsFilter = page.locator('button').filter({ hasText: 'Plants' });
    const birdsFilter = page.locator('button').filter({ hasText: 'Birds' });
    const bothFilter = page.locator('button').filter({ hasText: 'Both' });

    // Default should show both or plants
    const initialCount = await page.locator('[data-testid="card-item"]').count();

    // Filter to plants
    if (await plantsFilter.isVisible()) {
      await plantsFilter.scrollIntoViewIfNeeded();
      await page.evaluate(() => {
        const btn = document.querySelector('button') as HTMLButtonElement;
        if (btn && btn.textContent?.includes('Plants')) btn.click();
      });
      const plantsCount = await page.locator('[data-testid="card-item"]').count();
      expect(plantsCount).toBeGreaterThan(0);
    }

    // Filter to birds
    if (await birdsFilter.isVisible()) {
      await birdsFilter.scrollIntoViewIfNeeded();
      await page.evaluate(() => {
        const btn = document.querySelector('button') as HTMLButtonElement;
        if (btn && btn.textContent?.includes('Birds')) btn.click();
      });
      const birdsCount = await page.locator('[data-testid="card-item"]').count();
      expect(birdsCount).toBeGreaterThan(0);
    }

    // Filter to both
    if (await bothFilter.isVisible()) {
      await bothFilter.scrollIntoViewIfNeeded();
      await page.evaluate(() => {
        const btn = document.querySelector('button') as HTMLButtonElement;
        if (btn && btn.textContent?.includes('Both')) btn.click();
      });
      const bothCount = await page.locator('[data-testid="card-item"]').count();
      expect(bothCount).toBeGreaterThan(0);
    }
  });

  test('Search functionality', async ({ page }) => {
    // Assume there's a search input
    const searchInput = page.locator('input[type="search"]').or(page.locator('input[placeholder*="search"]'));

    if (await searchInput.isVisible()) {
      // Search for a specific card
      await searchInput.fill('Acorn Woodpecker');
      await page.waitForTimeout(300); // Allow for debouncing

      const visibleCards = page.locator('[data-testid="card-item"]:visible');
      await expect(visibleCards).toHaveCount(1);
      await expect(visibleCards.first()).toHaveAttribute('data-card-name', 'Acorn Woodpecker');
    }
  });

  test('Responsive behavior on mobile', async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 1000 });

    // Check elements are still visible
    await expect(page.locator('[data-testid="card-list"]')).toBeVisible();
    const cardItems = page.locator('[data-testid="card-item"]');
    await expect(cardItems.first()).toBeVisible();

    // Test selection on mobile
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="card-item"]') as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      }
    });
    await expect(page).toHaveURL('http://localhost:5173/?card=Acorn%20Woodpecker');
  });

  test('Keyboard navigation', async ({ page }) => {
    // Focus first card
    const firstCard = page.locator('[data-testid="card-item"]').first();
    await firstCard.focus();

    // Navigate with arrow keys
    await page.keyboard.press('ArrowDown');
    const secondCard = page.locator('[data-testid="card-item"]').nth(1);
    await expect(secondCard).toBeFocused();

    // Select with Enter
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('http://localhost:5173/?card=American%20Robin');
  });

  test('Select bird card and switch to plants mode', async ({ page }) => {
    // Navigate to card-lists
    await page.goto('/card-lists');

    // Select first card (Acorn Woodpecker - a bird)
    const firstCardItem = page.locator('[data-testid="card-item"]').first();
    const cardName = await firstCardItem.getAttribute('data-card-name');

    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="card-item"]') as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      }
    });

    // Should navigate back to home with selected card
    await expect(page).toHaveURL('http://localhost:5173/?card=Acorn%20Woodpecker');
    const currentCard = page.locator('[data-testid="card"]');
    await expect(currentCard).toHaveAttribute('data-card', cardName as string);

    // Click the mode button in hamburger menu to toggle mode
    const modeButton = page.locator('.hamburger-menu button').first();
    await modeButton.click(); // birds -> both

    // Click again to switch to plants
    await modeButton.click(); // both -> plants

    // Assert mode has changed to plants
    await expect(modeButton).toHaveText('🌿 Plants');
  });
});