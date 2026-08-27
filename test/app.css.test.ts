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
});
