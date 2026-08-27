import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { birds, plants, invasives } from '../../app/routes/card-lists';

describe('card-lists', () => {
  describe('birds', () => {
    it('should be a non-empty array with valid structure', () => {
      expect(Array.isArray(birds)).toBe(true);
      expect(birds.length).toBeGreaterThan(10);
      expect(birds.length).toBeLessThan(1000);

      birds.forEach(bird => {
        expect(bird).toHaveProperty('name');
        expect(bird).toHaveProperty('front');
        expect(bird).toHaveProperty('back');
        expect(typeof bird.name).toBe('string');
        expect(typeof bird.front).toBe('string');
        expect(typeof bird.back).toBe('string');
        expect(bird.front).toBe(`${bird.name} Front.jpg`);
        expect(bird.back).toBe(`${bird.name} Back.jpg`);
      });

      const names = birds.map(bird => bird.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe('plants', () => {
    it('should be a non-empty array with valid structure', () => {
      expect(Array.isArray(plants)).toBe(true);
      expect(plants.length).toBeGreaterThan(10);
      expect(plants.length).toBeLessThan(1000);

      plants.forEach(plant => {
        expect(plant).toHaveProperty('name');
        expect(plant).toHaveProperty('front');
        expect(plant).toHaveProperty('back');
        expect(typeof plant.name).toBe('string');
        expect(typeof plant.front).toBe('string');
        expect(typeof plant.back).toBe('string');
        expect(plant.front).toBe(`${plant.name} Front.jpg`);
        expect(plant.back).toBe(`${plant.name} Back.jpg`);
      });

      const names = plants.map(plant => plant.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe('data integrity', () => {
    it('should have unique names across birds and plants', () => {
      const birdNames = new Set(birds.map(bird => bird.name));
      const plantNames = new Set(plants.map(plant => plant.name));
      expect([...birdNames].filter(name => plantNames.has(name))).toHaveLength(0);
    });

    it('should have valid names and image paths', () => {
      const allItems = [...birds, ...plants];
      allItems.forEach(item => {
        expect(item.name).toBeTruthy();
        expect(item.name.trim()).toBe(item.name);
        expect(Object.keys(item)).toHaveLength(3);
        expect(item.front).toMatch(/\.jpg$/);
        expect(item.back).toMatch(/\.jpg$/);
        expect(item.front).toContain(item.name);
        expect(item.back).toContain(item.name);
      });
    });
  });

  describe('content validation', () => {
    it('should contain expected species and proper formatting', () => {
      const birdNames = birds.map(b => b.name);
      const plantNames = plants.map(p => p.name);
      const expectedBirds = ['American Crow', 'House Finch', 'Song Sparrow'];
      const expectedPlants = ['Chamise', 'Coast Live Oak', 'California Sagebrush'];

      expectedBirds.forEach(bird => expect(birdNames).toContain(bird));
      expectedPlants.forEach(plant => expect(plantNames).toContain(plant));

      const allNames = [...birds, ...plants].map(item => item.name);
      allNames.forEach(name => {
        expect(name).toMatch(/^[A-Z]/);
        expect(name).not.toMatch(/\s$/);
      });
    });
  });

  describe('property-based tests', () => {
    it('should have no duplicate names across all cards', () => {
      fc.assert(fc.property(fc.constant(null), () => {
        const allCards = [...birds, ...plants];
        const names = allCards.map(card => card.name);
        const uniqueNames = new Set(names);
        return uniqueNames.size === names.length;
      }));
    });

    it('should have all cards with required fields', () => {
      fc.assert(fc.property(fc.constant(null), () => {
        const allCards = [...birds, ...plants];
        return allCards.every(card =>
          card.hasOwnProperty('name') &&
          card.hasOwnProperty('front') &&
          card.hasOwnProperty('back') &&
          typeof card.name === 'string' &&
          typeof card.front === 'string' &&
          typeof card.back === 'string' &&
          card.name.length > 0 &&
          card.front.length > 0 &&
          card.back.length > 0
        );
      }));
    });

    it('should have invasive list containing valid names from plants or birds', () => {
      fc.assert(fc.property(fc.constant(null), () => {
        const allCardNames = new Set([...birds, ...plants].map(card => card.name));
        return invasives.every(invasive => allCardNames.has(invasive));
      }));
    });
  });
});