import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Credits from '../../app/routes/credits';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { DeckDef } from '../../app/data/decks';

// A built-in deck must exist: the page resolves the active deck against the
// built-in registry first and re-resolves once uploaded decks load.
vi.mock('../../app/data/decks', () => {
  const canyonlands = {
    id: 'canyonlands', label: 'Canyonlands', description: '',
    categories: [
      { id: 'plants', label: '🌿 Plants', cards: [
        { name: 'Chamise', front: '/decks/canyonlands/cards/Chamise Front.jpg', back: '/decks/canyonlands/cards/Chamise Back.jpg', invasive: false },
      ] },
    ],
  };
  return {
    DECK_DEFS: [canyonlands],
    DEFAULT_DECK_ID: 'canyonlands',
    ALL_CATEGORY_IDS: ['plants'],
    getDeckDef: undefined,
    defaultInvasive: () => false,
  };
});

// Uploaded decks come through the hook; the storage layer is covered in
// test/utils/uploadedDecks.test.ts.
const uploadedDecks = vi.hoisted((): DeckDef[] => [
  {
    id: 'curated-canyon', label: '🌿 My Curated Deck', description: '', cardFormat: 'data', uploaded: true,
    categories: [
      {
        id: 'plants', label: '🌿 Plants',
        cards: [
          {
            name: 'Curated Sage', layout: 'photo-trio', invasive: false,
            photos: [
              // iNat-backed photo: full credit with observation link
              {
                file: 'blob:main', role: 'main',
                credit: {
                  observer: 'joodles', license: 'cc-by-nc',
                  observationUrl: 'https://www.inaturalist.org/observations/38238174',
                  observationId: 38238174, placeLabel: 'San Diego County',
                },
              },
              // User's own photo: no observation link, all-rights-reserved
              { file: 'blob:s1', role: 'secondary', credit: { observer: 'Me Myself', license: 'all-rights-reserved' } },
            ],
          },
          // Card relying on the flattened credits list instead of photos
          {
            name: 'Curated Wrentit', layout: 'photo-single', invasive: false,
            credits: [
              { observer: 'Bob Hawk', license: 'cc-by', observationUrl: 'https://www.inaturalist.org/observations/333', observationId: 333, placeLabel: 'worldwide' },
            ],
          },
        ],
      },
      {
        id: 'birds', label: '🐦 Birds',
        cards: [
          { name: 'Curated Cactus Wren', layout: 'photo-single', invasive: false,
            photos: [{ file: 'blob:wren', role: 'main', credit: { observer: 'Wren Watcher', license: 'cc0' } }] },
        ],
      },
    ],
  },
]);

vi.mock('../../app/utils/useUploadedDecks', () => ({
  useUploadedDecks: () => ({ decks: uploadedDecks, reload: vi.fn() }),
}));

const mockLocation = { search: '', href: 'http://localhost:3000/credits' };
Object.defineProperty(window, 'location', { value: mockLocation, writable: true });

describe('Credits page with an uploaded deck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderPage = (search: string) => {
    mockLocation.search = search;
    render(
      <RouterProvider
        router={createMemoryRouter([{ path: '/credits', element: <Credits /> }], { initialEntries: ['/credits'] })}
      />,
    );
  };

  it('renders each uploaded card’s photo credits like the built-in decks', () => {
    renderPage('?deck=curated-canyon');

    const table = screen.getByTestId('credits-table');
    expect(table).toHaveTextContent('Curated Sage');
    expect(table).toHaveTextContent('joodles');
    expect(table).toHaveTextContent('CC BY-NC');
    expect(table).toHaveTextContent('Me Myself');
    expect(table).toHaveTextContent('All Rights Reserved');
    expect(table).toHaveTextContent('Curated Wrentit');
    expect(table).toHaveTextContent('Bob Hawk');

    const links = screen.getAllByRole('link', { name: /iNat #\d+/ });
    expect(links.map((l) => l.getAttribute('href'))).toContain('https://www.inaturalist.org/observations/38238174');
  });

  it('photos without an observation link render without a link', () => {
    renderPage('?deck=curated-canyon');

    const ownPhoto = screen.getAllByText('Me Myself')[0].closest('.credits-photo');
    expect(ownPhoto).not.toBeNull();
    expect(ownPhoto!.querySelector('a')).toBeNull();

    // Control: the iNat-backed credit in the same card row does have a link.
    const inat = screen.getAllByText('joodles')[0].closest('.credits-photo');
    expect(inat!.querySelector('a')).not.toBeNull();
  });

  it('the category filter narrows the credits to that card list', () => {
    renderPage('?deck=curated-canyon&category=birds');

    const table = screen.getByTestId('credits-table');
    expect(table).toHaveTextContent('Curated Cactus Wren');
    expect(table).not.toHaveTextContent('Curated Sage');
    expect(table).not.toHaveTextContent('Bob Hawk');
  });
});