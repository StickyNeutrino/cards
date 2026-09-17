import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CardLists, { cardsForDeck } from '../../app/routes/card-lists';
import { createMemoryRouter, RouterProvider } from 'react-router';

vi.mock('../../app/data/decks', () => {
  const canyonlands = {
    id: 'canyonlands', label: 'Canyonlands', description: '',
    categories: [
      { id: 'birds', label: '🐦 Birds', cards: [
        { name: 'Acorn Woodpecker', front: '/decks/canyonlands/cards/Acorn Woodpecker Front.jpg', back: '/decks/canyonlands/cards/Acorn Woodpecker Back.jpg', invasive: false },
      ] },
      { id: 'plants', label: '🌿 Plants', cards: [
        { name: 'Chamise', front: '/decks/canyonlands/cards/Chamise Front.jpg', back: '/decks/canyonlands/cards/Chamise Back.jpg', invasive: false },
        { name: 'Arundo', front: '/decks/canyonlands/cards/Arundo Front.jpg', back: '/decks/canyonlands/cards/Arundo Back.jpg', invasive: true },
      ] },
    ],
  };
  const healthyCanyons = {
    id: 'healthy-canyons', label: 'Healthy Canyons', description: '',
    categories: [
      { id: 'plants', label: '🌿 Plants', cards: [
        { name: 'Coast Live Oak', front: '/decks/healthy-canyons/cards/Coast Live Oak Front.jpg', back: '/decks/healthy-canyons/cards/Coast Live Oak Back.jpg', invasive: false },
        { name: 'Pampas Grass', front: '/decks/healthy-canyons/cards/Pampas Grass Front.jpg', back: '/decks/healthy-canyons/cards/Pampas Grass Back.jpg', invasive: true },
      ] },
      { id: 'animals', label: '🦎 Animals', cards: [
        { name: 'Mock Healthy Hawk', front: '/decks/healthy-canyons/cards/Mock Healthy Hawk Front.jpg', back: '/decks/healthy-canyons/cards/Mock Healthy Hawk Back.jpg', invasive: false },
        { name: 'European honey bee', front: '/decks/healthy-canyons/cards/European honey bee Front.jpg', back: '/decks/healthy-canyons/cards/European honey bee Back.jpg', invasive: true },
      ] },
    ],
  };
  return {
    DECK_DEFS: [canyonlands, healthyCanyons],
    DEFAULT_DECK_ID: 'canyonlands',
    ALL_CATEGORY_IDS: ['plants', 'birds', 'animals'],
    getDeckDef: (id: string) => (id === 'canyonlands' ? canyonlands : id === 'healthy-canyons' ? healthyCanyons : undefined),
    defaultInvasive: (name: string) => name === 'Arundo' || name === 'Pampas Grass' || name === 'European honey bee',
  };
});

const mockLocation = { search: '', href: 'http://localhost:3000/card-lists' };
Object.defineProperty(window, 'location', { value: mockLocation, writable: true });

describe('cardsForDeck', () => {
  it('canyonlands cards come from the deck manifest with invasive flags baked in', () => {
    const cards = cardsForDeck('canyonlands', 'both');
    expect(cards.length).toBe(3);
    expect(cards.find((c) => c.name === 'Arundo')?.invasive).toBe(true);
    expect(cards.find((c) => c.name === 'Chamise')?.invasive).toBe(false);
    // birds come first in the canyonlands manifest (original page ordering)
    expect(cards[0].name).toBe('Acorn Woodpecker');
    expect(cards.every((c) => c.front.startsWith('/decks/canyonlands/cards/'))).toBe(true);
  });

  it('healthy deck flags non-native species as invasive', () => {
    const plants = cardsForDeck('healthy-canyons', 'plants');
    expect(plants.map((c) => c.name)).toEqual(['Coast Live Oak', 'Pampas Grass']);
    expect(plants.find((c) => c.name === 'Pampas Grass')?.invasive).toBe(true);
    expect(plants.find((c) => c.name === 'Coast Live Oak')?.invasive).toBe(false);

    const animals = cardsForDeck('healthy-canyons', 'animals');
    expect(animals.map((c) => c.name)).toEqual(['Mock Healthy Hawk', 'European honey bee']);
    expect(animals.find((c) => c.name === 'European honey bee')?.invasive).toBe(true);
  });

  it('healthy "both" merges plants and animals', () => {
    const both = cardsForDeck('healthy-canyons', 'both');
    expect(both.length).toBe(4);
  });

  it('returns nothing for an unknown deck', () => {
    expect(cardsForDeck('bogus', 'both')).toEqual([]);
  });
});

describe('CardLists page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';
    localStorage.clear();
  });

  const router = () =>
    createMemoryRouter([{ path: '/card-lists', element: <CardLists /> }], { initialEntries: ['/card-lists'] });

  it('shows the healthy-canyons deck when the deck URL param is present', () => {
    mockLocation.search = '?deck=healthy-canyons';
    const r = createMemoryRouter(
      [{ path: '/card-lists', element: <CardLists /> }],
      { initialEntries: ['/card-lists?deck=healthy-canyons'] },
    );
    render(<RouterProvider router={r} />);
    expect(screen.getByTestId('deck-select')).toHaveValue('healthy-canyons');
    expect(screen.getByTestId('card-list')).toHaveTextContent('Coast Live Oak');
    expect(screen.getByTestId('card-list')).not.toHaveTextContent('Acorn Woodpecker');
  });

  it('shows the canyonlands deck by default', () => {
    render(<RouterProvider router={router()} />);
    expect(screen.getByTestId('deck-select')).toHaveValue('canyonlands');
    expect(screen.getByTestId('card-list')).toHaveTextContent('Chamise');
    expect(screen.getByTestId('card-list')).not.toHaveTextContent('Mock Healthy Hawk');
  });

  it('switching to the healthy deck persists the choice and swaps the list', () => {
    render(<RouterProvider router={router()} />);
    fireEvent.change(screen.getByTestId('deck-select'), { target: { value: 'healthy-canyons' } });
    expect(screen.getByTestId('deck-select')).toHaveValue('healthy-canyons');
    expect(screen.getByTestId('card-list')).toHaveTextContent('Coast Live Oak');
    expect(screen.getByTestId('card-list')).not.toHaveTextContent('Acorn Woodpecker');
    // mode filter reset to both for the new deck
    expect(screen.getByTestId('mode-both')).toHaveClass('active');
  });

  it('mode filter switches between plants and animals on the healthy deck', () => {
    mockLocation.search = '?deck=healthy-canyons';
    const r = createMemoryRouter(
      [{ path: '/card-lists', element: <CardLists /> }],
      { initialEntries: ['/card-lists?deck=healthy-canyons'] },
    );
    render(<RouterProvider router={r} />);
    expect(screen.getByTestId('card-list')).toHaveTextContent('Mock Healthy Hawk');
    fireEvent.click(screen.getByTestId('mode-animals'));
    expect(screen.getByTestId('card-list')).toHaveTextContent('Mock Healthy Hawk');
    expect(screen.getByTestId('card-list')).not.toHaveTextContent('Coast Live Oak');
  });

  it('links canyonlands cards back to home without a deck param', () => {
    render(<RouterProvider router={router()} />);
    fireEvent.click(screen.getAllByTestId('card-item')[0]);
    expect(window.location.href).toBe('/?card=Acorn%20Woodpecker');
  });

  it('links healthy cards back to the home view with the deck param', () => {
    mockLocation.search = '?deck=healthy-canyons';
    const r = createMemoryRouter(
      [{ path: '/card-lists', element: <CardLists /> }],
      { initialEntries: ['/card-lists?deck=healthy-canyons'] },
    );
    render(<RouterProvider router={r} />);
    fireEvent.click(screen.getAllByTestId('card-item')[0]);
    expect(window.location.href).toBe('/?deck=healthy-canyons&card=Coast%20Live%20Oak');
  });
});