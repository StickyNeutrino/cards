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

    it('should have reasonable data size', () => {
      expect(birds.length).toBeGreaterThan(10); // Should have substantial content
      expect(birds.length).toBeLessThan(1000); // Should not be unreasonably large
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

    it('should have reasonable data size', () => {
      expect(plants.length).toBeGreaterThan(10); // Should have substantial content
      expect(plants.length).toBeLessThan(1000); // Should not be unreasonably large
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

    it('all image paths should be valid strings', () => {
      const allItems = [...birds, ...plants];
      allItems.forEach(item => {
        expect(item.front).toMatch(/\.png$/);
        expect(item.back).toMatch(/\.png$/);
        expect(item.front).toContain(item.name);
        expect(item.back).toContain(item.name);
      });
    });

    it('should have consistent data structure', () => {
      const allItems = [...birds, ...plants];
      allItems.forEach(item => {
        expect(Object.keys(item)).toHaveLength(3);
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('front');
        expect(item).toHaveProperty('back');
      });
    });
  });

  describe('content validation', () => {
    it('should contain expected bird species', () => {
      const birdNames = birds.map(b => b.name);
      const expectedBirds = ['American Crow', 'House Finch', 'Song Sparrow'];
      expectedBirds.forEach(expectedBird => {
        expect(birdNames).toContain(expectedBird);
      });
    });

    it('should contain expected plant species', () => {
      const plantNames = plants.map(p => p.name);
      const expectedPlants = ['Chamise', 'Coast Live Oak', 'California Sagebrush'];
      expectedPlants.forEach(expectedPlant => {
        expect(plantNames).toContain(expectedPlant);
      });
    });

    it('should have proper name formatting', () => {
      const allNames = [...birds, ...plants].map(item => item.name);
      allNames.forEach(name => {
        // Names should start with capital letters and not end with spaces
        expect(name).toMatch(/^[A-Z]/);
        expect(name).not.toMatch(/\s$/);
      });
    });
  });
});