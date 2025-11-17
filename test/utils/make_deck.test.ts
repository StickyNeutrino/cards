import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { make_deck } from '../../app/utils/deckUtils';
import { birds, plants } from '../../app/routes/card-lists';

describe('make_deck', () => {
  it('should create deck with plants', () => {
    const deck = make_deck('plants', plants, birds);
    expect(deck.length).toBe(plants.length * 10);
    expect(deck.every(card => plants.some(plant => plant.name === card))).toBe(true);
  });

  it('should create deck with birds', () => {
    const deck = make_deck('birds', plants, birds);
    expect(deck.length).toBe(birds.length * 10);
    expect(deck.every(card => birds.some(bird => bird.name === card))).toBe(true);
  });

  it('should create deck with both plants and birds', () => {
    const deck = make_deck('both', plants, birds);
    expect(deck.length).toBe((plants.length + birds.length) * 10);
    const allCards = [...plants, ...birds].map(card => card.name);
    expect(deck.every(card => allCards.includes(card))).toBe(true);
  });

  it('should contain all plant names exactly 10 times', () => {
    const deck = make_deck('plants', plants, birds);
    const plantNames = plants.map(p => p.name);
    plantNames.forEach(name => {
      const count = deck.filter(card => card === name).length;
      expect(count).toBe(10);
    });
  });

  it('should contain all bird names exactly 10 times', () => {
    const deck = make_deck('birds', plants, birds);
    const birdNames = birds.map(b => b.name);
    birdNames.forEach(name => {
      const count = deck.filter(card => card === name).length;
      expect(count).toBe(10);
    });
  });

  it('should contain all names exactly 10 times in both mode', () => {
    const deck = make_deck('both', plants, birds);
    const allNames = [...plants, ...birds].map(card => card.name);
    allNames.forEach(name => {
      const count = deck.filter(card => card === name).length;
      expect(count).toBe(10);
    });
  });

  it('should handle empty plants array', () => {
    const deck = make_deck('plants', [], birds);
    expect(deck.length).toBe(0);
  });

  it('should handle empty birds array', () => {
    const deck = make_deck('birds', plants, []);
    expect(deck.length).toBe(0);
  });

  it('should handle empty both arrays', () => {
    const deck = make_deck('both', [], []);
    expect(deck.length).toBe(0);
  });

  describe('property-based tests', () => {
    it('deck length is 10 times the input array length for plants', () => {
      fc.assert(fc.property(fc.array(fc.record({ name: fc.string() })), plantArr => {
        const deck = make_deck('plants', plantArr, []);
        return deck.length === 10 * plantArr.length;
      }));
    });

    it('each plant name appears exactly 10 times its count in input', () => {
      fc.assert(fc.property(fc.array(fc.record({ name: fc.string() })), plantArr => {
        const deck = make_deck('plants', plantArr, []);
        const freq = new Map<string, number>();
        for (const val of deck) {
          freq.set(val, (freq.get(val) || 0) + 1);
        }
        const nameCounts = new Map<string, number>();
        for (const p of plantArr) {
          nameCounts.set(p.name, (nameCounts.get(p.name) || 0) + 1);
        }
        return Array.from(nameCounts.entries()).every(([name, count]) => (freq.get(name) || 0) === 10 * count);
      }));
    });

    it('the deck only contains plant names', () => {
      fc.assert(fc.property(fc.array(fc.record({ name: fc.string() })), plantArr => {
        const deck = make_deck('plants', plantArr, []);
        const plantNames = new Set(plantArr.map(p => p.name));
        return deck.every(card => plantNames.has(card));
      }));
    });

    it('deck length is 10 times the input array length for birds', () => {
      fc.assert(fc.property(fc.array(fc.record({ name: fc.string() })), birdArr => {
        const deck = make_deck('birds', [], birdArr);
        return deck.length === 10 * birdArr.length;
      }));
    });

    it('each bird name appears exactly 10 times its count in input', () => {
      fc.assert(fc.property(fc.array(fc.record({ name: fc.string() })), birdArr => {
        const deck = make_deck('birds', [], birdArr);
        const freq = new Map<string, number>();
        for (const val of deck) {
          freq.set(val, (freq.get(val) || 0) + 1);
        }
        const nameCounts = new Map<string, number>();
        for (const b of birdArr) {
          nameCounts.set(b.name, (nameCounts.get(b.name) || 0) + 1);
        }
        return Array.from(nameCounts.entries()).every(([name, count]) => (freq.get(name) || 0) === 10 * count);
      }));
    });

    it('the deck only contains bird names', () => {
      fc.assert(fc.property(fc.array(fc.record({ name: fc.string() })), birdArr => {
        const deck = make_deck('birds', [], birdArr);
        const birdNames = new Set(birdArr.map(b => b.name));
        return deck.every(card => birdNames.has(card));
      }));
    });

    it('deck length is 10 times the combined array length for both', () => {
      fc.assert(fc.property(fc.array(fc.record({ name: fc.string() })), fc.array(fc.record({ name: fc.string() })), (plantArr, birdArr) => {
        const deck = make_deck('both', plantArr, birdArr);
        return deck.length === 10 * (plantArr.length + birdArr.length);
      }));
    });

    it('each name appears exactly 10 times its count in input in both mode', () => {
      fc.assert(fc.property(fc.array(fc.record({ name: fc.string() })), fc.array(fc.record({ name: fc.string() })), (plantArr, birdArr) => {
        const deck = make_deck('both', plantArr, birdArr);
        const freq = new Map<string, number>();
        for (const val of deck) {
          freq.set(val, (freq.get(val) || 0) + 1);
        }
        const allCards = [...plantArr, ...birdArr];
        const nameCounts = new Map<string, number>();
        for (const c of allCards) {
          nameCounts.set(c.name, (nameCounts.get(c.name) || 0) + 1);
        }
        return Array.from(nameCounts.entries()).every(([name, count]) => (freq.get(name) || 0) === 10 * count);
      }));
    });

    it('the deck only contains names from both arrays', () => {
      fc.assert(fc.property(fc.array(fc.record({ name: fc.string() })), fc.array(fc.record({ name: fc.string() })), (plantArr, birdArr) => {
        const deck = make_deck('both', plantArr, birdArr);
        const allNames = new Set([...plantArr, ...birdArr].map(c => c.name));
        return deck.every(card => allNames.has(card));
      }));
    });
  });
});