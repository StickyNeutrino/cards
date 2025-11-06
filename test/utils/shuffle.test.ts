import { describe, it, expect, vi } from 'vitest';

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

describe('shuffle', () => {
  it('should return an array of the same length', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle([...input]);
    expect(result).toHaveLength(input.length);
  });

  it('should contain the same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle([...input]);
    expect(result.sort()).toEqual(input.sort());
  });

  it('should shuffle the array (not return the same order)', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const original = [...input];
    const result = shuffle([...input]);

    // There's a small chance this could fail if shuffle returns the same order,
    // but with 10 elements it's very unlikely
    expect(result).not.toEqual(original);
  });

  it('should handle empty array', () => {
    const result = shuffle([]);
    expect(result).toEqual([]);
  });

  it('should handle single element array', () => {
    const result = shuffle([42]);
    expect(result).toEqual([42]);
  });
});