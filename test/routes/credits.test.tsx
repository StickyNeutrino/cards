import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Credits from '../../app/routes/credits';
import { createMemoryRouter, RouterProvider } from 'react-router';

// Same registry shape as the card-lists tests: canyonlands is a scanned
// physical deck with no credit data, healthy-canyons carries photo credits
// across two categories.
vi.mock('../../app/data/decks', () => {
  const canyonlands = {
    id: 'canyonlands', label: 'Canyonlands', description: '',
    categories: [
      { id: 'birds', label: '🐦 Birds', cards: [
        { name: 'Acorn Woodpecker', front: '/decks/canyonlands/cards/Acorn Woodpecker Front.jpg', back: '/decks/canyonlands/cards/Acorn Woodpecker Back.jpg', invasive: false },
      ] },
    ],
  };
  const healthyCanyons = {
    id: 'healthy-canyons', label: 'Healthy Canyons', description: '',
    categories: [
      { id: 'plants', label: '🌿 Plants', cards: [
        {
          name: 'Coast Live Oak', front: '/decks/healthy-canyons/cards/Coast Live Oak Front.jpg', back: '/decks/healthy-canyons/cards/Coast Live Oak Back.jpg', invasive: false,
          credits: [
            { observer: 'Alice Nature', license: 'cc-by-nc', observationUrl: 'https://www.inaturalist.org/observations/111', observationId: 111, placeLabel: 'San Diego County' },
            { observer: 'Bob Oak', license: 'cc0', observationUrl: 'https://www.inaturalist.org/observations/222', observationId: 222, placeLabel: 'worldwide' },
          ],
        },
        {
          name: 'Pampas Grass', front: '/decks/healthy-canyons/cards/Pampas Grass Front.jpg', back: '/decks/healthy-canyons/cards/Pampas Grass Back.jpg', invasive: true,
          credits: [
            { observer: 'Dee Grass', license: 'cc-by', observationUrl: 'https://www.inaturalist.org/observations/444', observationId: 444, placeLabel: 'worldwide' },
          ],
        },
      ] },
      { id: 'animals', label: '🦎 Animals', cards: [
        {
          name: 'Mock Healthy Hawk', front: '/decks/healthy-canyons/cards/Mock Healthy Hawk Front.jpg', back: '/decks/healthy-canyons/cards/Mock Healthy Hawk Back.jpg', invasive: false,
          credits: [
            { observer: 'Carol Hawk', license: 'cc-by', observationUrl: 'https://www.inaturalist.org/observations/333', observationId: 333, placeLabel: 'worldwide' },
          ],
        },
      ] },
    ],
  };
  return {
    DECK_DEFS: [canyonlands, healthyCanyons],
    DEFAULT_DECK_ID: 'canyonlands',
    ALL_CATEGORY_IDS: ['birds', 'plants', 'animals'],
    getDeckDef: undefined,
    defaultInvasive: () => false,
  };
});

const mockLocation = { search: '', href: 'http://localhost:3000/credits' };
Object.defineProperty(window, 'location', { value: mockLocation, writable: true });

describe('Credits page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';
    localStorage.clear();
  });

  const renderPage = () =>
    render(
      <RouterProvider
        router={createMemoryRouter([{ path: '/credits', element: <Credits /> }], { initialEntries: ['/credits'] })}
      />,
    );

  it('shows one deck’s credits at a time, scoped by the page controls', () => {
    mockLocation.search = '?deck=healthy-canyons';
    renderPage();

    const table = screen.getByTestId('credits-table');
    expect(table).toHaveTextContent('Coast Live Oak');
    expect(table).toHaveTextContent('Mock Healthy Hawk');
    // The other deck stays out — no all-decks roll-up.
    expect(table).not.toHaveTextContent('Acorn Woodpecker');
    // Each card is listed once, with all of its photos under it.
    expect(within(table).getAllByText('Coast Live Oak')).toHaveLength(1);
  });

  it('honors ?deck= and ?category= links from a card list', () => {
    mockLocation.search = '?deck=healthy-canyons&category=animals';
    renderPage();

    const table = screen.getByTestId('credits-table');
    expect(table).toHaveTextContent('Carol Hawk');
    expect(table).not.toHaveTextContent('Alice Nature');
  });

  it('an unknown category falls back to the whole deck', () => {
    mockLocation.search = '?deck=healthy-canyons&category=bogus';
    renderPage();

    const table = screen.getByTestId('credits-table');
    expect(table).toHaveTextContent('Alice Nature');
    expect(table).toHaveTextContent('Carol Hawk');
  });

  it('the category dropdown narrows the list in place', () => {
    mockLocation.search = '?deck=healthy-canyons';
    renderPage();

    fireEvent.change(screen.getByTestId('category-select'), { target: { value: 'plants' } });
    const table = screen.getByTestId('credits-table');
    expect(table).toHaveTextContent('Alice Nature');
    expect(table).toHaveTextContent('Dee Grass');
    expect(table).not.toHaveTextContent('Carol Hawk');
  });

  it('the deck dropdown swaps decks and resets the card-list filter', () => {
    mockLocation.search = '?deck=healthy-canyons&category=animals';
    renderPage();

    fireEvent.change(screen.getByTestId('deck-select'), { target: { value: 'canyonlands' } });
    // Deck with no credit data shows the empty state instead of another
    // deck's credits.
    expect(screen.getByTestId('credits-empty')).toHaveTextContent('No photo credits for this deck.');
    expect(screen.queryByTestId('credits-table')).not.toBeInTheDocument();
  });

  it('renders license labels and iNat observation links', () => {
    mockLocation.search = '?deck=healthy-canyons';
    renderPage();

    const table = screen.getByTestId('credits-table');
    expect(table).toHaveTextContent('CC BY-NC');
    expect(table).toHaveTextContent('CC0');

    const links = screen.getAllByRole('link', { name: /iNat #\d+/ });
    expect(links.map((l) => l.getAttribute('href'))).toContain('https://www.inaturalist.org/observations/111');
    // "worldwide" places get no suffix; real places do.
    expect(within(table).getAllByRole('link', { name: 'iNat #222' })).toHaveLength(1);
    expect(within(table).getAllByRole('link', { name: 'iNat #111 (San Diego County)' })).toHaveLength(1);
  });
});