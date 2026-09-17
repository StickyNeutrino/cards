import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  make_deck, modesForDeck, modeLabelFor, deckFromLocationOrStorage, BOTH_MODE,
  type DeckCategoryLike,
} from '../../app/utils/deckUtils';
import { DECK_DEFS } from '../../app/data/decks';

const canyonlands = DECK_DEFS.find((d) => d.id === 'canyonlands')!;
const healthy = DECK_DEFS.find((d) => d.id === 'healthy-canyons')!;

const plants: DeckCategoryLike = { id: 'plants', label: '🌿 Plants', cards: [{ name: 'P1' }, { name: 'P2' }] };
const birds: DeckCategoryLike = { id: 'birds', label: '🐦 Birds', cards: [{ name: 'B1' }] };
const animals: DeckCategoryLike = { id: 'animals', label: '🦎 Animals', cards: [{ name: 'A1' }, { name: 'A2' }] };

describe('deck modes (data-driven categories)', () => {
  it('canyonlands offers plants, birds, both (canonical: plants first)', () => {
    expect(modesForDeck(canyonlands)).toEqual(['plants', 'birds', 'both']);
  });

  it('healthy-canyons offers plants, animals, both', () => {
    expect(modesForDeck(healthy)).toEqual(['plants', 'animals', 'both']);
  });

  it('mode labels derive from category labels', () => {
    expect(modeLabelFor(canyonlands, 'plants')).toBe('🌿 Plants');
    expect(modeLabelFor(canyonlands, BOTH_MODE)).toBe('🌿🐦 Both');
    expect(modeLabelFor(healthy, BOTH_MODE)).toBe('🌿🦎 Both');
  });

  it('the registry contains both decks with canyonlands first (the default)', () => {
    expect(DECK_DEFS.map((d) => d.id)).toEqual(['canyonlands', 'healthy-canyons']);
  });
});

describe('make_deck (category-driven)', () => {
  it('builds a single-category deck', () => {
    const deck = make_deck([plants, birds], 'plants');
    expect(deck.length).toBe(plants.cards.length * 10);
    expect(deck.every(card => plants.cards.some(p => p.name === card))).toBe(true);
  });

  it('builds an animals-only deck', () => {
    const deck = make_deck([plants, birds, animals], 'animals');
    expect(deck.length).toBe(animals.cards.length * 10);
    expect(deck.every(card => animals.cards.some(a => a.name === card))).toBe(true);
  });

  it('"both" flattens every category', () => {
    const deck = make_deck([plants, birds, animals], BOTH_MODE);
    expect(deck.length).toBe((plants.cards.length + birds.cards.length + animals.cards.length) * 10);
  });

  it('"both" for the healthy deck shape is plants + animals only', () => {
    const deck = make_deck([plants, animals], BOTH_MODE);
    expect(deck.length).toBe((plants.cards.length + animals.cards.length) * 10);
    expect(deck.every(card => [...plants.cards, ...animals.cards].some(c => c.name === card))).toBe(true);
  });

  it('canyonlands "both" is unchanged when no animals exist', () => {
    const deck = make_deck([plants, birds], BOTH_MODE);
    expect(deck.length).toBe((plants.cards.length + birds.cards.length) * 10);
  });

  it('each name appears exactly 10 times', () => {
    const deck = make_deck([plants, birds, animals], BOTH_MODE);
    for (const c of [...plants.cards, ...birds.cards, ...animals.cards]) {
      expect(deck.filter(card => card === c.name).length).toBe(10);
    }
  });

  it('handles empty categories', () => {
    expect(make_deck([], 'plants')).toHaveLength(0);
    expect(make_deck([{ id: 'plants', label: 'P', cards: [] }], 'plants')).toHaveLength(0);
  });

  it('deck length is 10 times the input length (property-based)', () => {
    fc.assert(fc.property(fc.array(fc.record({ name: fc.string() })), cards => {
      const deck = make_deck([{ id: 'animals', label: 'A', cards }], 'animals');
      return deck.length === 10 * cards.length;
    }));
  });
});

describe('deckFromLocationOrStorage', () => {
  const ids = DECK_DEFS.map((d) => d.id);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('defaults to the first registered deck', () => {
    expect(deckFromLocationOrStorage('', ids)).toBe('canyonlands');
  });

  it('prefers the URL param', () => {
    expect(deckFromLocationOrStorage('?deck=healthy-canyons&card=Foo', ids)).toBe('healthy-canyons');
    expect(deckFromLocationOrStorage('?deck=canyonlands', ids)).toBe('canyonlands');
  });

  it('falls back to the saved deck', () => {
    (localStorage.getItem as any).mockImplementation((key: string) =>
      key === 'deck' ? 'healthy-canyons' : null);
    expect(deckFromLocationOrStorage('', ids)).toBe('healthy-canyons');
  });

  it('ignores unknown saved values', () => {
    (localStorage.getItem as any).mockImplementation(() => 'bogus');
    expect(deckFromLocationOrStorage('', ids)).toBe('canyonlands');
  });
});