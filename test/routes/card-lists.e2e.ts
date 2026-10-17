import { test, expect } from '../e2e-helpers';
import type { Locator, Page } from '@playwright/test';
import { APP_ORIGIN } from '../../playwright.config';
import { DECK_DEFS } from '~/data/decks';

const canyonlands = DECK_DEFS.find((d) => d.id === 'canyonlands')!;
const birds = canyonlands.categories.find((c) => c.id === 'birds')!.cards;
const plants = canyonlands.categories.find((c) => c.id === 'plants')!.cards;

/** The card names currently listed, in display order. */
const listedNames = (cardItems: Locator) =>
  cardItems.evaluateAll((items) => items.map((item) => item.getAttribute('data-card-name')));

async function handleConsentPopup(page: Page) {
  const dismissButton = page.getByTestId('consent-dismiss');
  const appeared = await dismissButton.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false);
  if (appeared) {
    await dismissButton.click();
  }
}

test.describe('Card Lists Page E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and navigate to card-lists
    await page.context().clearCookies();
    await page.goto('/card-lists');

    // Handle consent popup if it appears
    await handleConsentPopup(page);
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
    await expect(page).toHaveURL(`${APP_ORIGIN}/card-lists`);
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
    await expect(page).toHaveURL(`${APP_ORIGIN}/?card=Acorn%20Woodpecker`);
    const currentCard = page.locator('[data-testid="card"]');
    await expect(currentCard).toHaveAttribute('data-card', cardName as string);
  });

  test('Filtering cards by type', async ({ page }) => {
    // The category filter is the "Filter by category" dropdown, not buttons:
    // its first option is "both", followed by the deck's categories in the
    // canonical plants-first ordering.
    const modeSelect = page.getByTestId('mode-select');
    const cardItems = page.locator('[data-testid="card-item"]');
    const optionValues = await modeSelect.locator('option').evaluateAll((options) =>
      options.map((option) => (option as HTMLOptionElement).value));
    expect(optionValues).toEqual(['both', 'plants', 'birds']);

    // It opens on "both": every card of the deck, in manifest category order
    // (canyonlands is birds first, then plants).
    await expect(modeSelect).toHaveValue('both');
    await expect(cardItems).toHaveCount(plants.length + birds.length);
    expect(await listedNames(cardItems)).toEqual([...birds, ...plants].map((c) => c.name));

    // Filtering to a category lists exactly that category's cards, in
    // manifest order, and the closed control reports the selection.
    await modeSelect.selectOption('plants');
    await expect(modeSelect).toHaveValue('plants');
    await expect(cardItems).toHaveCount(plants.length);
    expect(await listedNames(cardItems)).toEqual(plants.map((c) => c.name));

    await modeSelect.selectOption('birds');
    await expect(modeSelect).toHaveValue('birds');
    await expect(cardItems).toHaveCount(birds.length);
    expect(await listedNames(cardItems)).toEqual(birds.map((c) => c.name));

    // Back to "both": the full list again.
    await modeSelect.selectOption('both');
    await expect(modeSelect).toHaveValue('both');
    await expect(cardItems).toHaveCount(plants.length + birds.length);
    expect(await listedNames(cardItems)).toEqual([...birds, ...plants].map((c) => c.name));
  });

  test('Search functionality', async ({ page }) => {
    // Assume there's a search input
    const searchInput = page.locator('input[type="search"]').or(page.locator('input[placeholder*="search"]'));

    if (await searchInput.isVisible()) {
      // Search for a specific card
      await searchInput.fill('Acorn Woodpecker');
      await page.waitForTimeout(100);

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
    await expect(page).toHaveURL(`${APP_ORIGIN}/?card=Acorn%20Woodpecker`);
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
    await expect(page).toHaveURL(`${APP_ORIGIN}/?card=American%20Robin`);
  });

  test('Select bird card and switch to plants mode', async ({ page }) => {
    // Select first card (Acorn Woodpecker - a bird)
    const firstCardItem = page.locator('[data-testid="card-item"]').first();
    const cardName = await firstCardItem.getAttribute('data-card-name');

    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="card-item"]') as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      }
    });

    // Should navigate back to home with selected card
    await expect(page).toHaveURL(`${APP_ORIGIN}/?card=Acorn%20Woodpecker`);
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

  test('Invasive plants have red border styling', async ({ page }) => {
    await page.goto('/card-lists');

    const arundoCard = page.locator('[data-testid="card-item"]').filter({ hasText: 'Arundo' });

    // Check it has the 'invasive' class
    await expect(arundoCard).toHaveClass('card-list-item invasive');

    // Check the styling: border should be 3px solid red
    const border = await arundoCard.evaluate(el => window.getComputedStyle(el).border);
    expect(border).toContain('3px');
    expect(border).toContain('solid');
    expect(border).toContain('rgb(255, 0, 0)'); // red

    // Check border-radius is 10px
    const borderRadius = await arundoCard.evaluate(el => window.getComputedStyle(el).borderRadius);
    expect(borderRadius).toBe('10px');

    // Check overflow is hidden
    const overflow = await arundoCard.evaluate(el => window.getComputedStyle(el).overflow);
    expect(overflow).toBe('hidden');
  });
}); 