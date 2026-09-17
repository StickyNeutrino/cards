import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { make_deck, modesForDeck, deckFromLocationOrStorage, DECKS } from '../../app/utils/deckUtils';

describe('deck modes', () => {
  it('canyonlands offers plants, birds, both', () => {
    expect(modesForDeck('canyonlands')).toEqual(['plants', 'birds', 'both']);
  });

  it('healthy offers plants, animals, both', () => {
    expect(modesForDeck('healthy')).toEqual(['plants', 'animals', 'both']);
  });

  it('DECKS lists both decks with canyonlands first (the default)', () => {
    expect(DECKS).toEqual(['canyonlands', 'healthy']);
  });
});

describe('make_deck with animals', () => {
  const plants = [{ name: 'P1' }, { name: 'P2' }];
  const birds = [{ name: 'B1' }];
  const animals = [{ name: 'A1' }, { name: 'A2' }];

  it('builds an animals-only deck', () => {
    const deck = make_deck('animals', plants, birds, animals);
    expect(deck.length).toBe(animals.length * 10);
    expect(deck.every(card => animals.some(a => a.name === card))).toBe(true);
  });

  it('builds a healthy "both" deck from plants + animals (no birds)', () => {
    const deck = make_deck('both', plants, [], animals);
    expect(deck.length).toBe((plants.length + animals.length) * 10);
    expect(deck.every(card => [...plants, ...animals].some(c => c.name === card))).toBe(true);
  });

  it('canyonlands "both" is unchanged when no animals are passed', () => {
    const deck = make_deck('both', plants, birds);
    expect(deck.length).toBe((plants.length + birds.length) * 10);
    expect(deck.every(card => [...plants, ...birds].some(c => c.name === card))).toBe(true);
  });

  it('each animal appears exactly 10 times', () => {
    const deck = make_deck('animals', plants, birds, animals);
    for (const a of animals) {
      expect(deck.filter(card => card === a.name).length).toBe(10);
    }
  });

  it('deck length is 10 times the animals array length (property-based)', () => {
    fc.assert(fc.property(fc.array(fc.record({ name: fc.string() })), animalArr => {
      const deck = make_deck('animals', [], [], animalArr);
      return deck.length === 10 * animalArr.length;
    }));
  });
});

describe('deckFromLocationOrStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.location.search = '';
  });

  it('defaults to canyonlands', () => {
    expect(deckFromLocationOrStorage('')).toBe('canyonlands');
  });

  it('prefers the URL param', () => {
    expect(deckFromLocationOrStorage('?deck=healthy&card=Foo')).toBe('healthy');
    expect(deckFromLocationOrStorage('?deck=canyonlands')).toBe('canyonlands');
  });

  it('falls back to the saved deck', () => {
    (localStorage.getItem as any).mockImplementation((key: string) =>
      key === 'deck' ? 'healthy' : null);
    expect(deckFromLocationOrStorage('')).toBe('healthy');
  });

  it('ignores unknown saved values', () => {
    (localStorage.getItem as any).mockImplementation(() => 'bogus');
    expect(deckFromLocationOrStorage('')).toBe('canyonlands');
  });
});