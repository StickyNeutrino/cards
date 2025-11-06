import { describe, it, expect } from 'vitest';
import { birds, plants } from '../../app/routes/card-lists';

describe('card-lists', () => {
  describe('birds', () => {
    it('should be an array', () => {
      expect(Array.isArray(birds)).toBe(true);
    });

    it('should have at least one bird', () => {
      expect(birds.length).toBeGreaterThan(0);
    });

    it('each bird should have required properties', () => {
      birds.forEach(bird => {
        expect(bird).toHaveProperty('name');
        expect(bird).toHaveProperty('front');
        expect(bird).toHaveProperty('back');
        expect(typeof bird.name).toBe('string');
        expect(typeof bird.front).toBe('string');
        expect(typeof bird.back).toBe('string');
      });
    });

    it('should have unique names', () => {
      const names = birds.map(bird => bird.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('front and back images should follow naming convention', () => {
      birds.forEach(bird => {
        expect(bird.front).toBe(`${bird.name} Front.png`);
        expect(bird.back).toBe(`${bird.name} Back.png`);
      });
    });
  });

  describe('plants', () => {
    it('should be an array', () => {
      expect(Array.isArray(plants)).toBe(true);
    });

    it('should have at least one plant', () => {
      expect(plants.length).toBeGreaterThan(0);
    });

    it('each plant should have required properties', () => {
      plants.forEach(plant => {
        expect(plant).toHaveProperty('name');
        expect(plant).toHaveProperty('front');
        expect(plant).toHaveProperty('back');
        expect(typeof plant.name).toBe('string');
        expect(typeof plant.front).toBe('string');
        expect(typeof plant.back).toBe('string');
      });
    });

    it('should have unique names', () => {
      const names = plants.map(plant => plant.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('front and back images should follow naming convention', () => {
      plants.forEach(plant => {
        expect(plant.front).toBe(`${plant.name} Front.png`);
        expect(plant.back).toBe(`${plant.name} Back.png`);
      });
    });
  });

  describe('data integrity', () => {
    it('bird and plant names should not overlap', () => {
      const birdNames = new Set(birds.map(bird => bird.name));
      const plantNames = new Set(plants.map(plant => plant.name));

      const intersection = new Set([...birdNames].filter(name => plantNames.has(name)));
      expect(intersection.size).toBe(0);
    });

    it('all names should be non-empty strings', () => {
      const allNames = [...birds, ...plants].map(item => item.name);
      allNames.forEach(name => {
        expect(name).toBeTruthy();
        expect(name.trim()).toBe(name);
      });
    });
  });
});