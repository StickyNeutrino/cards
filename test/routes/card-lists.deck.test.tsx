import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CardLists, { cardsForDeck } from '../../app/routes/card-lists';
import { createMemoryRouter, RouterProvider } from 'react-router';

vi.mock('../../app/data/healthyCards', () => ({
  healthyGeneratedAt: '2026-09-17T00:00:00Z',
  healthyPlants: [
    {
      name: 'Coast Live Oak', front: '/cards-healthy/Coast Live Oak Front.jpg', back: '/cards-healthy/Coast Live Oak Back.jpg',
      sciName: 'Quercus agrifolia', commonName: 'Coast Live Oak', familyCommon: 'Beech Family', familyLatin: 'Fagaceae',
      group: 'Plants', category: null, native: 'native', rarity: null, canyons: ['Tecolote South'],
      taxonId: 48624, photos: [],
    },
    {
      name: 'Pampas Grass', front: '/cards-healthy/Pampas Grass Front.jpg', back: '/cards-healthy/Pampas Grass Back.jpg',
      sciName: 'Cortaderia selloana', commonName: 'Pampas Grass', familyCommon: 'Family', familyLatin: 'Poaceae',
      group: 'Plants', category: null, native: 'non-native', rarity: null, canyons: ['Florida East'],
      taxonId: 12345, photos: [],
    },
  ],
  healthyAnimals: [
    {
      name: 'Mock Healthy Hawk', front: '/cards-healthy/Mock Healthy Hawk Front.jpg', back: '/cards-healthy/Mock Healthy Hawk Back.jpg',
      sciName: 'Buteo mockus', commonName: 'Mock Healthy Hawk', familyCommon: 'Hawks & Eagles', familyLatin: 'Accipitridae',
      group: 'Birds', category: 'Hawks & Eagles', native: 'native', rarity: null, canyons: ['Paradise'],
      taxonId: 1001, photos: [],
    },
    {
      name: 'European honey bee', front: '/cards-healthy/European honey bee Front.jpg', back: '/cards-healthy/European honey bee Back.jpg',
      sciName: 'Apis mellifera', commonName: 'European honey bee', familyCommon: null, familyLatin: 'Apidae',
      group: 'Invertebrates', category: 'Ants, Bees, Wasps', native: 'non-native', rarity: null, canyons: ['Canyon A'],
      taxonId: 1002, photos: [],
    },
  ],
}));

const mockLocation = { search: '', href: 'http://localhost:3000/card-lists' };
Object.defineProperty(window, 'location', { value: mockLocation, writable: true });

describe('cardsForDeck', () => {
  it('canyonlands plants come from the physical deck with the invasives list', () => {
    const cards = cardsForDeck('canyonlands', 'plants');
    expect(cards.length).toBeGreaterThan(50);
    const arundo = cards.find((c) => c.name === 'Arundo');
    expect(arundo?.invasive).toBe(true);
    const sage = cards.find((c) => c.name === 'White Sage');
    expect(sage?.invasive).toBe(false);
    expect(cards.every((c) => c.front.startsWith('/cards/'))).toBe(true);
  });

  it('healthy deck flags non-native species as invasive', () => {
    const plants = cardsForDeck('healthy', 'plants');
    expect(plants.map((c) => c.name)).toEqual(['Coast Live Oak', 'Pampas Grass']);
    expect(plants.find((c) => c.name === 'Pampas Grass')?.invasive).toBe(true);
    expect(plants.find((c) => c.name === 'Coast Live Oak')?.invasive).toBe(false);

    const animals = cardsForDeck('healthy', 'animals');
    expect(animals.map((c) => c.name)).toEqual(['Mock Healthy Hawk', 'European honey bee']);
    expect(animals.find((c) => c.name === 'Mock Healthy Hawk')?.invasive).toBe(false);
    expect(animals.find((c) => c.name === 'European honey bee')?.invasive).toBe(true);
  });

  it('healthy "both" merges plants and animals', () => {
    const both = cardsForDeck('healthy', 'both');
    expect(both.length).toBe(4);
  });
});

describe('CardLists page', () => {
  const router = () =>
    createMemoryRouter([{ path: '/card-lists', element: <CardLists /> }], { initialEntries: ['/card-lists'] });

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';
    localStorage.clear();
  });

  it('shows the healthy deck when the deck URL param is present', () => {
    mockLocation.search = '?deck=healthy';
    const r = createMemoryRouter(
      [{ path: '/card-lists', element: <CardLists /> }],
      { initialEntries: ['/card-lists?deck=healthy'] },
    );
    render(<RouterProvider router={r} />);
    expect(screen.getByTestId('deck-healthy')).toHaveClass('active');
    expect(screen.getByTestId('card-list')).toHaveTextContent('Coast Live Oak');
    expect(screen.getByTestId('card-list')).not.toHaveTextContent('Acorn Woodpecker');
  });

  it('shows the canyonlands deck by default', () => {
    render(<RouterProvider router={router()} />);
    expect(screen.getByTestId('deck-canyonlands')).toHaveClass('active');
    expect(screen.getByTestId('card-list')).toHaveTextContent('Chamise');
    expect(screen.getByTestId('card-list')).not.toHaveTextContent('Mock Healthy Hawk');
  });

  it('switching to the healthy deck persists the choice and swaps the list', () => {
    render(<RouterProvider router={router()} />);
    fireEvent.click(screen.getByTestId('deck-healthy'));
    expect(screen.getByTestId('deck-healthy')).toHaveClass('active');
    expect(screen.getByTestId('card-list')).toHaveTextContent('Coast Live Oak');
    expect(screen.getByTestId('card-list')).not.toHaveTextContent('Acorn Woodpecker');
    // mode filter reset to both for the new deck
    expect(screen.getByTestId('mode-both')).toHaveClass('active');
  });

  it('mode filter switches between plants and animals on the healthy deck', () => {
    mockLocation.search = '?deck=healthy';
    const r = createMemoryRouter(
      [{ path: '/card-lists', element: <CardLists /> }],
      { initialEntries: ['/card-lists?deck=healthy'] },
    );
    render(<RouterProvider router={r} />);
    expect(screen.getByTestId('card-list')).toHaveTextContent('Mock Healthy Hawk');
    fireEvent.click(screen.getByTestId('mode-animals'));
    expect(screen.getByTestId('card-list')).toHaveTextContent('Mock Healthy Hawk');
    expect(screen.getByTestId('card-list')).not.toHaveTextContent('Coast Live Oak');
  });

  it('links healthy cards back to the home view with the deck param', () => {
    const originalHref = window.location.href;
    mockLocation.search = '?deck=healthy';
    const r = createMemoryRouter(
      [{ path: '/card-lists', element: <CardLists /> }],
      { initialEntries: ['/card-lists?deck=healthy'] },
    );
    render(<RouterProvider router={r} />);
    fireEvent.click(screen.getAllByTestId('card-item')[0]);
    expect(window.location.href).toBe('/?deck=healthy&card=Coast%20Live%20Oak');
    window.location.href = originalHref;
  });
});