import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface ParsedRule {
  selector: string;
  mediaConditions: string[];
  declarations: string;
}

function parseRules(css: string): ParsedRule[] {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: ParsedRule[] = [];
  const blockStack: string[] = [];
  let buffer = '';

  const flushRule = (header: string) => {
    rules.push({
      selector: header,
      mediaConditions: blockStack.filter((h) => h.startsWith('@media')),
      declarations: '',
    });
  };

  for (const ch of withoutComments) {
    if (ch === '{') {
      const header = buffer.replace(/\s+/g, ' ').trim();
      buffer = '';
      blockStack.push(header);
      if (header !== '' && !header.startsWith('@')) {
        flushRule(header);
      }
    } else if (ch === '}') {
      const closed = blockStack.pop();
      if (closed && closed !== '' && !closed.startsWith('@')) {
        const rule = rules.find((r) => r.selector === closed);
        if (rule) rule.declarations = buffer.replace(/\s+/g, ' ').trim();
      }
      buffer = '';
    } else {
      buffer += ch;
    }
  }
  return rules;
}

const cssPath = join(process.cwd(), 'app', 'app.css');
const css = readFileSync(cssPath, 'utf8');
const rules = parseRules(css);

describe('app.css', () => {
  it('never applies a transform to the card via a hover selector', () => {
    const hoverRules = rules.filter(
      (r) => r.selector.includes(':hover') && r.selector.includes('flip-card-inner')
    );
    expect(hoverRules).toHaveLength(0);
    expect(css).not.toContain('.flip-card-enabled:hover');
  });

  it('rotates the card only through the flipped state so tapping always unflips', () => {
    const innerRules = rules.filter((r) => r.selector.includes('flip-card-inner'));
    for (const rule of innerRules) {
      if (!rule.selector.includes('.flipped')) {
        expect(rule.declarations).not.toContain('rotateY(180deg)');
      }
    }
    const flippedRule = rules.find((r) => r.selector === '.flipped .flip-card-inner');
    expect(flippedRule).toBeDefined();
    expect(flippedRule!.declarations).toContain('rotateY(180deg)');
  });

  it('keeps the flipped-state transform unconditional so tapping always unflips', () => {
    const flippedRule = rules.find((r) => r.selector === '.flipped .flip-card-inner');
    expect(flippedRule).toBeDefined();
    expect(flippedRule!.mediaConditions).toHaveLength(0);
  });

  it('disables double-tap zoom on the card area so rapid taps are never swallowed', () => {
    const cardAreaRule = rules.find((r) => r.selector === '.card-area');
    expect(cardAreaRule).toBeDefined();
    expect(cardAreaRule!.mediaConditions).toHaveLength(0);
    expect(cardAreaRule!.declarations).toContain('touch-action: manipulation');
  });

  it('keeps the card image box hugging the image and inside the card area on any screen', () => {
    const imgRule = rules.find((r) => r.selector === '.flip-card img');
    expect(imgRule).toBeDefined();
    expect(imgRule!.declarations).toContain('width: auto');
    expect(imgRule!.declarations).toContain('height: auto');
    expect(imgRule!.declarations).toContain('max-width: 100%');
    expect(imgRule!.declarations).toContain('max-height: 100%');
    expect(imgRule!.declarations).toContain('object-fit: contain');
  });

  it('keeps the card-to-buttons gap at least half the button-to-button gap on any screen', () => {
    const buttonContainerRule = rules.find((r) => r.selector === '#button-container');
    expect(buttonContainerRule).toBeDefined();
    const marginTop = parseFloat(
      buttonContainerRule!.declarations.match(/margin-top: ([\d.]+)em/)?.[1] ?? '0'
    );
    const buttonGap = parseFloat(
      buttonContainerRule!.declarations.match(/gap: ([\d.]+)em/)?.[1] ?? '0'
    );
    expect(buttonGap).toBeGreaterThan(0);
    expect(marginTop).toBeGreaterThanOrEqual(buttonGap / 2);
  });

  it('pins a light color scheme so native widgets match the light palette in every browser', () => {
    // The palette is fixed light, so a dark color-scheme has nothing to
    // coordinate with — it only makes Chromium paint native widgets dark:
    // the deck dropdown's option list went dark with the control's dark ink
    // on it, unreadable in Chrome while Firefox looked fine.
    const htmlRule = rules.find((r) => r.selector === 'html');
    expect(htmlRule).toBeDefined();
    expect(htmlRule!.declarations).toContain('color-scheme: light');
    // A @media-wrapped declaration would be invisible to this parser's
    // declarations string (the original bug's shape), so the rule must sit
    // at the top level carrying the declaration directly.
    expect(htmlRule!.mediaConditions).toHaveLength(0);
    expect(css).not.toContain('color-scheme: dark');
    // Single accent source for checkboxes/radios (was each engine's own
    // native blue).
    expect(htmlRule!.declarations).toContain('accent-color: #1b5e20');
  });

  it('paints the deck dropdown option list white with the control ink in every browser', () => {
    // Firefox fills the opened option rows with the select's green while
    // Chromium themes them off the used color-scheme; the explicit rows keep
    // both engines (and webkit) showing white with the same dark text.
    const optionRule = rules.find((r) => r.selector === '.deck-select option');
    expect(optionRule).toBeDefined();
    expect(optionRule!.declarations).toContain('background-color: #fff');
    expect(optionRule!.declarations).toContain('color: #333');
  });

  it('gives the search input an explicit focus ring instead of each engine outline:auto rendering', () => {
    const rule = rules.find((r) => r.selector === '.search-input:focus');
    expect(rule).toBeDefined();
    expect(rule!.declarations).toContain('outline: 2px solid black');
    // outline:auto renders 1px near-black in Chrome, 3px gray in Firefox and
    // 5px blue in WebKit — no engine-default keyword allowed.
    expect(rule!.declarations).not.toContain('auto');
  });

  it('gives the menu buttons and deck dropdowns the same explicit focus ring', () => {
    const rule = rules.find((r) => r.selector === '.menu-button:focus');
    expect(rule).toBeDefined();
    expect(rule!.declarations).toContain('outline: 2px solid black');
    expect(rule!.declarations).not.toContain('auto');
  });

  it('hides the Chromium/WebKit native search clear button (absent in Firefox)', () => {
    const rule = rules.find(
      (r) => r.selector === '.search-input::-webkit-search-cancel-button'
    );
    expect(rule).toBeDefined();
    expect(rule!.declarations).toContain('appearance: none');
    expect(rule!.declarations).toContain('display: none');
  });

  it('styles the flip-speed slider thumb identically for both engines pseudo-elements', () => {
    for (const selector of [
      '.flip-speed-slider::-webkit-slider-thumb',
      '.flip-speed-slider::-moz-range-thumb',
    ]) {
      const rule = rules.find((r) => r.selector === selector);
      expect(rule, selector).toBeDefined();
      expect(rule!.declarations).toContain('width: 16px');
      expect(rule!.declarations).toContain('height: 16px');
      // The sage of the menu buttons, not any engine's default (blue dot in
      // Chrome, hollow gray ring in Firefox, white dot in WebKit).
      expect(rule!.declarations).toContain('background: #a1b69a');
    }
  });

  it('pins the settings checkbox size (native sizes differ per engine)', () => {
    // Color comes from the html-level accent-color, tested above; this pins
    // the 12px(WebKit)/13px(Chrome)/14px(Firefox) size divergence to 1em.
    const rule = rules.find((r) => r.selector === '.checkbox-input');
    expect(rule).toBeDefined();
    expect(rule!.declarations).toContain('width: 1em');
    expect(rule!.declarations).toContain('height: 1em');
  });
});
