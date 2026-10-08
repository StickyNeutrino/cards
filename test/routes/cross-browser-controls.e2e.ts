import { test, expect } from '../e2e-helpers';
import type { Page } from '@playwright/test';
import sharp from 'sharp';

/**
 * Native-control styling must not depend on the browser engine or the OS
 * theme. This suite runs on every configured Playwright project (Chromium,
 * Firefox, WebKit, Mobile Chrome, Mobile Safari) and asserts the *same*
 * computed styles in both light and emulated-dark OS themes.
 *
 * Regression guard for: the deck dropdown's popup canvas rendering dark
 * (unreadable #333 text) in Chrome under a dark OS theme, while Firefox
 * painted it light — caused by a prefers-color-scheme-dependent
 * `color-scheme` on <html>.
 */

async function dismissConsent(page: Page) {
  const dismissButton = page.getByTestId('consent-dismiss');
  const appeared = await dismissButton
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => true)
    .catch(() => false);
  if (appeared) {
    await dismissButton.click();
  }
}

// Pages that expose the shared .deck-select control (home's hamburger menu,
// the card lists toolbar, and the credits page pickers).
const SELECT_PAGES = ['/', '/card-lists', '/credits?deck=canyonlands'];

const OPTION_TEXT_COLOR = 'rgb(51, 51, 51)'; // #333, the menu-button text
const SAGE = { r: 161, g: 182, b: 154 }; // #a1b69a, the app's control green

test.describe('Native control consistency across browsers', () => {
  for (const osScheme of ['light', 'dark'] as const) {
    test(`deck select pins the light color scheme under a ${osScheme} OS theme (popup stays readable)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: osScheme });

      for (const path of SELECT_PAGES) {
        await page.goto(path);
        await dismissConsent(page);

        const scheme = await page.evaluate(() => {
          const select = document.querySelector<HTMLSelectElement>(
            '[data-testid="deck-select"]',
          )!;
          return {
            html: getComputedStyle(document.documentElement).getPropertyValue('color-scheme').trim(),
            select: getComputedStyle(select).getPropertyValue('color-scheme').trim(),
            optionText: getComputedStyle(select.options[0]).color,
            optionBackground: getComputedStyle(select.options[0]).backgroundColor,
          };
        });

        // If <html> ever responds to prefers-color-scheme again, Blink draws
        // the select's popup canvas dark under the inherited #333 text and
        // both of these flip to 'dark' — the reported Chrome-only bug.
        expect(scheme.html, `html color-scheme on ${path}`).toBe('light');
        expect(scheme.select, `select color-scheme on ${path}`).toBe('light');
        expect(scheme.optionText, `option text color on ${path}`).toBe(OPTION_TEXT_COLOR);
        // Firefox fills the popup rows with the control's green and Chromium
        // themes them off the used color-scheme; the explicit rows keep the
        // opened list white with dark ink in every engine.
        expect(scheme.optionBackground, `option background on ${path}`).toBe('rgb(255, 255, 255)');
      }
    });
  }

  test('search input: same explicit focus ring in every engine', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/card-lists');
    await dismissConsent(page);

    await page.locator('input[type="search"]').focus();

    const styles = await page.evaluate(() => {
      const el = document.querySelector<HTMLInputElement>('input[type="search"]')!;
      const cs = getComputedStyle(el);
      return { width: cs.outlineWidth, style: cs.outlineStyle, color: cs.outlineColor };
    });

    expect(styles).toMatchObject({
      width: '2px',
      style: 'solid',
      color: 'rgb(0, 0, 0)',
    });
  });

  test('search input has no native clear button: clicking its spot must not clear', async ({ page }) => {
    // Chromium and WebKit render a native clear ✕ inside search fields (blue
    // in Chrome, gray in WebKit, absent in Firefox), so the field — and the
    // quick-clear affordance — used to differ per engine. The CSS hides it;
    // getComputedStyle lies about internal pseudos in some engines, so
    // assert the user-visible behavior: clicking where the ✕ would sit must
    // NOT clear the value.
    await page.goto('/card-lists');
    await dismissConsent(page);

    const input = page.locator('input[type="search"]');
    await input.fill('Acorn');
    const box = await input.boundingBox();
    // The native ✕ sits inside the right padding, vertically centered.
    await page.mouse.click(box!.x + box!.width - 12, box!.y + box!.height / 2);
    await expect(input).toHaveValue('Acorn');
  });

  test('deck select and search input share the same height in the controls bar', async ({ page }) => {
    await page.goto('/card-lists');
    await dismissConsent(page);

    const heights = await page.evaluate(() => ({
      select: document.querySelector<HTMLElement>('[data-testid="deck-select"]')!.getBoundingClientRect().height,
      search: document.querySelector<HTMLElement>('input[type="search"]')!.getBoundingClientRect().height,
    }));

    // The native select lost its intrinsic ~2px frame on Android, making the
    // dropdown visibly shorter than the search box next to it on phones.
    expect(Math.abs(heights.select - heights.search)).toBeLessThanOrEqual(1);
  });

  test('settings slider thumb is the app sage in every engine', async ({ page }) => {
    await page.goto('/');
    await dismissConsent(page);

    await page.locator('button:has(img[src*="gear"])').first().click();
    const slider = page.locator('input[type="range"]');
    await slider.waitFor();

    // getComputedStyle on the thumb pseudo is unreliable across engines, so
    // scan the rendered pixels of the slider's middle row for the thumb.
    // The thumb should be one ~16px run of sage near the predicted position
    // (fraction of travel * (width - thumb) + thumb/2). Previously it was
    // Chrome's blue thumb, Firefox's hollow gray ring, WebKit's white dot.
    const rect = await slider.evaluate((el: HTMLInputElement) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.x, y: r.y, width: r.width, height: r.height,
        value: el.value, min: el.min, max: el.max,
        // Screenshot output is in device pixels; convert predictions below.
        dpr: window.devicePixelRatio,
      };
    });

    const shot = await page.screenshot({
      clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    });
    const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
    const row = Math.floor(info.height / 2);
    const isSage = (x: number) => {
      const i = (row * info.width + x) * info.channels;
      return (
        Math.abs(data[i] - SAGE.r) <= 14 &&
        Math.abs(data[i + 1] - SAGE.g) <= 14 &&
        Math.abs(data[i + 2] - SAGE.b) <= 14
      );
    };
    const runs: Array<{ start: number; end: number; len: number }> = [];
    let start = -1;
    for (let x = 0; x <= info.width; x++) {
      if (x < info.width && isSage(x)) {
        if (start === -1) start = x;
      } else if (start !== -1) {
        runs.push({ start, end: x - 1, len: x - start });
        start = -1;
      }
    }
    const sageRuns = runs.filter((r) => r.len >= 6);
    expect(sageRuns, 'one sage thumb run on the track').toHaveLength(1);

    const fraction =
      (parseFloat(rect.value) - parseFloat(rect.min)) /
      (parseFloat(rect.max) - parseFloat(rect.min));
    // Predicted thumb center in device pixels — the screenshot is scaled by
    // the project's deviceScaleFactor (1 on desktop Chromium/Firefox, 2 on
    // WebKit, 2.625 on the Pixel 5), while the element rect is in CSS px.
    const predictedCenter =
      (fraction * (rect.width - 16) + 16 / 2) * rect.dpr;
    const actualCenter = (sageRuns[0].start + sageRuns[0].end) / 2;
    expect(Math.abs(actualCenter - predictedCenter), 'thumb position').toBeLessThanOrEqual(3 * rect.dpr);
    expect(sageRuns[0].len, 'thumb is the 16px styled one').toBeGreaterThanOrEqual(12 * rect.dpr);
  });

  test('settings checkboxes use the app accent color and a uniform size', async ({ page }) => {
    await page.goto('/');
    await dismissConsent(page);

    await page.locator('button:has(img[src*="gear"])').first().click();
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.waitFor();

    // accent-color is an ordinary computed property — reliable everywhere.
    // Native checkboxes used to come out 12px (WebKit) / 13px (Chrome) /
    // 14px (Firefox), each with its own blue; the color now comes from the
    // html-level accent-color.
    const styles = await checkbox.evaluate((el: HTMLInputElement) => {
      const cs = getComputedStyle(el);
      return {
        accent: cs.accentColor,
        width: parseFloat(cs.width),
        height: parseFloat(cs.height),
      };
    });

    expect(styles.accent).toBe('rgb(27, 94, 32)');
    expect(styles.width).toBeGreaterThanOrEqual(12);
    expect(styles.width).toBeLessThanOrEqual(16);
    expect(Math.abs(styles.width - styles.height)).toBeLessThan(1);
  });
});
