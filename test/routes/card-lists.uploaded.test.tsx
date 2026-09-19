import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import CardLists, { cardsForDef } from '../../app/routes/card-lists';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { DeckDef } from '../../app/data/decks';

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
    getDeckDef: (id: string) => (id === 'canyonlands' ? canyonlands : undefined),
    defaultInvasive: () => false,
  };
});

// Uploaded decks storage mocked via the hook (see test/utils/uploadedDecks.test.ts
// for the storage layer itself); vi.hoisted so the factory can reference it.
const uploadedDecks = vi.hoisted((): DeckDef[] => [
  {
    id: 'curated-canyon', label: '🌿 My Curated Deck', description: 'User deck', cardFormat: 'data', uploaded: true,
    categories: [
      {
        id: 'plants', label: '🌿 Plants',
        cards: [
          {
            name: 'Curated Sage', layout: 'photo-trio', invasive: false,
            photos: [
              { file: 'blob:curated-main', role: 'main', credit: { observer: 'joodles', license: 'cc-by-nc' } },
              { file: 'blob:curated-s1', role: 'secondary', credit: { observer: 'l', license: 'cc0' } },
            ],
            altNames: ['Black Sage'],
          },
          {
            name: 'Curated Arundo', layout: 'photo-single', invasive: true,
            photos: [{ file: 'blob:arundo', role: 'main', credit: { observer: 'a', license: 'cc0' } }],
          },
        ],
      },
      {
        id: 'birds', label: '🐦 Birds',
        cards: [
          { name: 'Curated Wrentit', layout: 'photo-single', invasive: false,
            photos: [{ file: 'blob:wrentit', role: 'main', credit: { observer: 'b', license: 'cc0' } }] },
        ],
      },
    ],
  },
]);

vi.mock('../../app/utils/useUploadedDecks', () => ({
  useUploadedDecks: () => ({ decks: uploadedDecks, reload: vi.fn() }),
}));

const mockLocation = { search: '', href: 'http://localhost:3000/card-lists' };
Object.defineProperty(window, 'location', { value: mockLocation, writable: true });

describe('CardLists with an uploaded deck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';
    localStorage.clear();
  });

  const router = (initial = '/card-lists') =>
    createMemoryRouter([{ path: '/card-lists', element: <CardLists /> }], { initialEntries: [initial] });

  it('lists the uploaded deck in the dropdown with the uploaded marker', async () => {
    render(<RouterProvider router={router()} />);
    const select = await waitFor(() => {
      const select = screen.getByTestId('deck-select');
      expect(within(select).getAllByRole('option')).toHaveLength(2);
      return select;
    });
    const options = within(select).getAllByRole('option') as HTMLOptionElement[];
    expect(options.map((o) => o.value)).toEqual(['canyonlands', 'curated-canyon']);
    expect(options[1].textContent).toContain('(uploaded)');
  });

  it('shows uploaded cards with the main photo as the thumbnail', async () => {
    mockLocation.search = '?deck=curated-canyon';
    render(<RouterProvider router={router('/card-lists?deck=curated-canyon')} />);

    await waitFor(() => {
      expect(screen.getByTestId('card-list')).toHaveTextContent('Curated Sage');
    });
    expect(screen.getByTestId('card-list')).toHaveTextContent('Curated Arundo');
    expect(screen.getByTestId('card-list')).not.toHaveTextContent('Chamise');

    const items = screen.getAllByTestId('card-item');
    const sage = items.find((el) => el.getAttribute('data-card-name') === 'Curated Sage')!;
    expect(sage.querySelector('img')).toHaveAttribute('src', 'blob:curated-main');
    // The invasive flag carries over to the list item styling.
    const arundo = items.find((el) => el.getAttribute('data-card-name') === 'Curated Arundo')!;
    expect(arundo).toHaveClass('invasive');
  });

  it('mode filters work with the uploaded deck\u2019s own categories', async () => {
    mockLocation.search = '?deck=curated-canyon';
    render(<RouterProvider router={router('/card-lists?deck=curated-canyon')} />);
    await waitFor(() => {
      expect(screen.getByTestId('card-list')).toHaveTextContent('Curated Sage');
    });

    fireEvent.click(screen.getByTestId('mode-birds'));
    expect(screen.getByTestId('card-list')).toHaveTextContent('Curated Wrentit');
    expect(screen.getByTestId('card-list')).not.toHaveTextContent('Curated Sage');
  });

  it('search works on uploaded cards including alt names', async () => {
    mockLocation.search = '?deck=curated-canyon';
    render(<RouterProvider router={router('/card-lists?deck=curated-canyon')} />);
    await waitFor(() => {
      expect(screen.getByTestId('card-list')).toHaveTextContent('Curated Sage');
    });

    fireEvent.change(screen.getByPlaceholderText('Search cards...'), { target: { value: 'black sage' } });
    expect(screen.getByTestId('card-list')).toHaveTextContent('Curated Sage');
    expect(screen.getByTestId('card-list')).not.toHaveTextContent('Curated Arundo');
  });

  it('links uploaded cards back to home with the deck param', async () => {
    mockLocation.search = '?deck=curated-canyon';
    render(<RouterProvider router={router('/card-lists?deck=curated-canyon')} />);
    await waitFor(() => {
      expect(screen.getByTestId('card-list')).toHaveTextContent('Curated Sage');
    });

    fireEvent.click(screen.getAllByTestId('card-item')[0]);
    expect(window.location.href).toBe('/?deck=curated-canyon&card=Curated%20Sage');
  });
});

describe('cardsForDef (data decks)', () => {
  it('uses the main photo as the thumbnail and resolves invasive flags', () => {
    const cards = cardsForDef(uploadedDecks[0], 'both');
    expect(cards.map((c) => c.name)).toEqual(['Curated Sage', 'Curated Arundo', 'Curated Wrentit']);
    expect(cards[0].thumbnail).toBe('blob:curated-main');
    expect(cards[1].invasive).toBe(true);
    expect(cards[0].invasive).toBe(false);
  });
});
