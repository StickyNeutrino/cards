import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import Credits from '../../app/routes/credits';

vi.mock('../../app/data/decks', () => ({
  DECK_DEFS: [
    {
      id: 'healthy-canyons', label: 'Healthy Canyons', description: '',
      categories: [
        { id: 'plants', label: 'Plants', cards: [
          {
            name: 'Coast Live Oak', front: '/decks/healthy-canyons/cards/Coast Live Oak Front.jpg', back: '/decks/healthy-canyons/cards/Coast Live Oak Back.jpg', invasive: false,
            sciName: 'Quercus agrifolia', native: 'native', rarity: null, credits: [
              { observer: 'Alice Nature', license: 'cc-by-nc', observationUrl: 'https://www.inaturalist.org/observations/111', observationId: 111, placeLabel: 'San Diego County' },
              { observer: 'Bob Oak', license: 'cc0', observationUrl: 'https://www.inaturalist.org/observations/222', observationId: 222, placeLabel: 'San Diego County' },
            ],
          },
        ] },
        { id: 'animals', label: 'Animals', cards: [
          {
            name: 'Red-tailed Hawk', front: '/decks/healthy-canyons/cards/Red-tailed Hawk Front.jpg', back: '/decks/healthy-canyons/cards/Red-tailed Hawk Back.jpg', invasive: false,
            sciName: 'Buteo jamaicensis', native: 'native', rarity: null, credits: [
              { observer: 'Carol Hawk', license: 'cc-by', observationUrl: 'https://www.inaturalist.org/observations/333', observationId: 333, placeLabel: 'worldwide' },
            ],
          },
        ] },
      ],
    },
  ],
  DEFAULT_DECK_ID: 'healthy-canyons',
  ALL_CATEGORY_IDS: ['plants', 'animals'],
  getDeckDef: undefined,
  defaultInvasive: () => false,
}));

describe('Credits page', () => {
  const renderPage = () =>
    render(
      <RouterProvider
        router={createMemoryRouter([{ path: '/credits', element: <Credits /> }], { initialEntries: ['/credits'] })}
      />,
    );

  it('groups photos by deck and card, with observer, license, and observation link', () => {
    renderPage();

    // The deck name is a section heading, not a column repeated on every row.
    expect(screen.getAllByText('Healthy Canyons')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Healthy Canyons' })).toBeInTheDocument();

    const table = screen.getByTestId('credits-table');
    expect(table).toHaveTextContent('Coast Live Oak');
    expect(table).toHaveTextContent('Alice Nature');
    expect(table).toHaveTextContent('CC BY-NC');
    expect(table).toHaveTextContent('Bob Oak');
    expect(table).toHaveTextContent('CC0');
    expect(table).toHaveTextContent('Red-tailed Hawk');
    expect(table).toHaveTextContent('Carol Hawk');
    expect(table).toHaveTextContent('CC BY');

    // Each card is listed once, with all of its photos under it.
    expect(screen.getAllByText('Coast Live Oak')).toHaveLength(1);

    const links = screen.getAllByRole('link', { name: /iNat #\d+/ });
    expect(links.map((l) => l.getAttribute('href'))).toContain('https://www.inaturalist.org/observations/111');
  });

  it('search filters by card name and photographer', () => {
    renderPage();
    const search = screen.getByTestId('credits-search');
    fireEvent.change(search, { target: { value: 'hawk' } });
    expect(screen.getByTestId('credits-table')).toHaveTextContent('Carol Hawk');
    expect(screen.getByTestId('credits-table')).not.toHaveTextContent('Alice Nature');

    fireEvent.change(search, { target: { value: 'zzz-no-match' } });
    expect(screen.getByText('No matching credits.')).toBeInTheDocument();
  });
});