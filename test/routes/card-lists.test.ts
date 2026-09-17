import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DECK_DEFS } from '../../app/data/decks';

const canyonlands = DECK_DEFS.find((d) => d.id === 'canyonlands')!;
const birds = canyonlands.categories.find((c) => c.id === 'birds')!.cards;
const plants = canyonlands.categories.find((c) => c.id === 'plants')!.cards;

describe('deck registry (canyonlands)', () => {
  describe('birds', () => {
    it('has a plausible number of birds', () => {
      expect(Array.isArray(birds)).toBe(true);
      expect(birds.length).toBeGreaterThan(10);
      expect(birds.length).toBeLessThan(1000);
    });

    it('has required fields for every bird', () => {
      birds.forEach(bird => {
        expect(typeof bird.name).toBe('string');
        expect(bird.name.length).toBeGreaterThan(0);
        expect(typeof bird.front).toBe('string');
        expect(bird.front).toMatch(/Front\.jpg$/);
        expect(typeof bird.back).toBe('string');
        expect(bird.back).toMatch(/Back\.jpg$/);
        expect(typeof bird.invasive).toBe('boolean');
      });
    });

    it('has unique bird names', () => {
      const names = birds.map(bird => bird.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe('plants', () => {
    it('has a plausible number of plants', () => {
      expect(Array.isArray(plants)).toBe(true);
      expect(plants.length).toBeGreaterThan(10);
      expect(plants.length).toBeLessThan(1000);
    });

    it('has required fields for every plant', () => {
      plants.forEach(plant => {
        expect(typeof plant.name).toBe('string');
        expect(plant.name.length).toBeGreaterThan(0);
        expect(typeof plant.front).toBe('string');
        expect(plant.front).toMatch(/Front\.jpg$/);
        expect(typeof plant.back).toBe('string');
        expect(plant.back).toMatch(/Back\.jpg$/);
        expect(typeof plant.invasive).toBe('boolean');
      });
    });

    it('has unique plant names', () => {
      const names = plants.map(plant => plant.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  it('has unique names across birds and plants', () => {
    const allNames = [...birds, ...plants].map(c => c.name);
    expect(new Set(allNames).size).toBe(allNames.length);
  });

  it('resolves every image filename to a served URL', () => {
    for (const card of [...birds, ...plants]) {
      expect(card.front.startsWith('/decks/canyonlands/cards/')).toBe(true);
      expect(card.back.startsWith('/decks/canyonlands/cards/')).toBe(true);
    }
  });

  it('marks invasive plants (spot checks) and no birds', () => {
    const arundo = plants.find((p) => p.name === 'Arundo');
    expect(arundo?.invasive).toBe(true);
    expect(birds.every((b) => !b.invasive)).toBe(true);
  });

  it('card names are filename-safe for the deck layout', () => {
    fc.assert(fc.property(fc.constantFrom(...[...birds, ...plants]), (card) => {
      const front = decodeURIComponent(card.front.split('/').pop()!);
      return front === `${card.name} Front.jpg`;
    }), { numRuns: 25 });
  });
});