import { describe, it, expect, vi, beforeEach } from 'vitest';
import { birds, plants } from '../../app/routes/card-lists';

let deck: string[] = []

const make_deck = () => {
  const birds_enabled = new URLSearchParams(window.location.search).has("birds");
  const cards = (birds_enabled? birds : plants ).map(plant => plant.name)
  deck = [...new Array(10)].flatMap(() => shuffle([...cards]))
}

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array: any[]) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array
}

describe('make_deck', () => {
  beforeEach(() => {
    deck = [];
    // Reset location search
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
    });
  });

  it('should create deck with plants when no birds query param', () => {
    make_deck();
    expect(deck.length).toBe(plants.length * 10);
    expect(deck.every(card => plants.some(plant => plant.name === card))).toBe(true);
  });

  it('should create deck with birds when birds query param is present', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?birds' },
      writable: true,
    });
    make_deck();
    expect(deck.length).toBe(birds.length * 10);
    expect(deck.every(card => birds.some(bird => bird.name === card))).toBe(true);
  });

  it('should create deck with birds when birds query param has value', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?birds=true' },
      writable: true,
    });
    make_deck();
    expect(deck.length).toBe(birds.length * 10);
    expect(deck.every(card => birds.some(bird => bird.name === card))).toBe(true);
  });

  it('should contain all plant names multiple times', () => {
    make_deck();
    const plantNames = plants.map(p => p.name);
    plantNames.forEach(name => {
      const count = deck.filter(card => card === name).length;
      expect(count).toBe(10);
    });
  });

  it('should contain all bird names multiple times when birds enabled', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?birds' },
      writable: true,
    });
    make_deck();
    const birdNames = birds.map(b => b.name);
    birdNames.forEach(name => {
      const count = deck.filter(card => card === name).length;
      expect(count).toBe(10);
    });
  });

  it('should handle different query parameter formats', () => {
    // Test with different query param formats
    const testCases = ['?birds', '?birds=', '?birds=true', '?birds=false'];

    testCases.forEach(search => {
      Object.defineProperty(window, 'location', {
        value: { search },
        writable: true,
      });
      make_deck();
      expect(deck.length).toBe(birds.length * 10);
    });
  });

  it('should create consistent deck size regardless of card list size', () => {
    // Test with plants
    make_deck();
    const plantDeckSize = deck.length;

    // Test with birds
    Object.defineProperty(window, 'location', {
      value: { search: '?birds' },
      writable: true,
    });
    make_deck();
    const birdDeckSize = deck.length;

    // Both should be 10x the number of cards
    expect(plantDeckSize).toBe(plants.length * 10);
    expect(birdDeckSize).toBe(birds.length * 10);
    expect(plantDeckSize).not.toBe(birdDeckSize); // Different sizes
  });
});