import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import Credits from '../../app/routes/credits';
import type { DeckDef } from '../../app/data/decks';

vi.mock('../../app/data/decks', () => ({
  DECK_DEFS: [],
  DEFAULT_DECK_ID: 'canyonlands',
  ALL_CATEGORY_IDS: ['plants'],
  getDeckDef: undefined,
  defaultInvasive: () => false,
}));

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
    ],
  },
]);

vi.mock('../../app/utils/useUploadedDecks', () => ({
  useUploadedDecks: () => ({ decks: uploadedDecks, reload: vi.fn() }),
}));

describe('Credits page with an uploaded deck', () => {
  const renderPage = () =>
    render(
      <RouterProvider
        router={createMemoryRouter([{ path: '/credits', element: <Credits /> }], { initialEntries: ['/credits'] })}
      />,
    );

  it('renders each uploaded card\u2019s photo credits like the built-in decks', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: '🌿 My Curated Deck' })).toBeInTheDocument();

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
    renderPage();

    const ownPhoto = screen.getAllByText('Me Myself')[0].closest('.credits-photo');
    expect(ownPhoto).not.toBeNull();
    expect(ownPhoto!.querySelector('a')).toBeNull();

    // Control: the iNat-backed credit in the same card row does have a link.
    const inat = screen.getAllByText('joodles')[0].closest('.credits-photo');
    expect(inat!.querySelector('a')).not.toBeNull();
  });

  it('search filters uploaded credits too', () => {
    renderPage();
    const search = screen.getByTestId('credits-search');
    fireEvent.change(search, { target: { value: 'joodles' } });
    expect(screen.getByTestId('credits-table')).toHaveTextContent('Curated Sage');
    expect(screen.getByTestId('credits-table')).not.toHaveTextContent('Bob Hawk');

    fireEvent.change(search, { target: { value: 'zzz-no-match' } });
    expect(screen.getByText('No matching credits.')).toBeInTheDocument();
  });
});
