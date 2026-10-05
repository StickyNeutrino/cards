import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useLocation } from 'react-router';
import CardLists from '../../app/routes/card-lists';
import { createMemoryRouter, RouterProvider } from 'react-router';

// Same registry shape as card-lists.deck.test.tsx.
vi.mock('../../app/data/decks', () => {
  const canyonlands = {
    id: 'canyonlands', label: 'Canyonlands', description: '',
    categories: [
      { id: 'birds', label: '🐦 Birds', cards: [
        { name: 'Acorn Woodpecker', front: '/decks/canyonlands/cards/Acorn Woodpecker Front.jpg', back: '/decks/canyonlands/cards/Acorn Woodpecker Back.jpg', invasive: false },
      ] },
      { id: 'plants', label: '🌿 Plants', cards: [
        { name: 'Chamise', front: '/decks/canyonlands/cards/Chamise Front.jpg', back: '/decks/canyonlands/cards/Chamise Back.jpg', invasive: false },
      ] },
    ],
  };
  const healthyCanyons = {
    id: 'healthy-canyons', label: 'Healthy Canyons', description: '',
    categories: [
      { id: 'plants', label: '🌿 Plants', cards: [
        { name: 'Coast Live Oak', front: '/decks/healthy-canyons/cards/Coast Live Oak Front.jpg', back: '/decks/healthy-canyons/cards/Coast Live Oak Back.jpg', invasive: false },
      ] },
      { id: 'animals', label: '🦎 Animals', cards: [
        { name: 'Mock Healthy Hawk', front: '/decks/healthy-canyons/cards/Mock Healthy Hawk Front.jpg', back: '/decks/healthy-canyons/cards/Mock Healthy Hawk Back.jpg', invasive: false },
      ] },
    ],
  };
  return {
    DECK_DEFS: [canyonlands, healthyCanyons],
    DEFAULT_DECK_ID: 'canyonlands',
    ALL_CATEGORY_IDS: ['birds', 'plants', 'animals'],
    getDeckDef: (id: string) => (id === 'canyonlands' ? canyonlands : id === 'healthy-canyons' ? healthyCanyons : undefined),
    defaultInvasive: () => false,
  };
});

// The credits page itself is covered in credits.test.tsx; here we assert the
// card list opens it scoped to the list being viewed.
function CreditsRouteSpy() {
  const location = useLocation();
  return <div data-testid="credits-route-spy" data-search={location.search} />;
}

const mockLocation = { search: '', href: 'http://localhost:3000/card-lists' };
Object.defineProperty(window, 'location', { value: mockLocation, writable: true });

describe('Card lists → credits page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';
    localStorage.clear();
  });

  const renderPage = (initial = '/card-lists') => {
    const router = createMemoryRouter(
      [
        { path: '/card-lists', element: <CardLists /> },
        { path: '/credits', element: <CreditsRouteSpy /> },
      ],
      { initialEntries: [initial] },
    );
    render(<RouterProvider router={router} />);
  };

  it('the credits button opens the credits page for the current card list', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('credits-button'));

    const spy = screen.getByTestId('credits-route-spy');
    expect(spy.getAttribute('data-search')).toBe('?deck=canyonlands&category=both');
  });

  it('the link carries the active deck and category filter', () => {
    // The page resolves its deck from window.location.search at mount (see
    // card-lists.deck.test.tsx).
    mockLocation.search = '?deck=healthy-canyons';
    renderPage('/card-lists?deck=healthy-canyons');
    fireEvent.change(screen.getByTestId('mode-select'), { target: { value: 'animals' } });
    fireEvent.click(screen.getByTestId('credits-button'));

    const spy = screen.getByTestId('credits-route-spy');
    expect(spy.getAttribute('data-search')).toBe('?deck=healthy-canyons&category=animals');
  });
});