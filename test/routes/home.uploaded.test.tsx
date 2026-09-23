import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import Home from '../../app/routes/home';
import { MANAGE_DECKS_OPTION } from '../../app/utils/deckUtils';

vi.mock('../../app/data/decks', () => {
  const canyonlands = {
    id: 'canyonlands', label: 'Canyonlands', description: '',
    categories: [
      { id: 'plants', label: '🌿 Plants', cards: [{ name: 'Mock Plant 1', front: '/cards/Mock Plant 1 Front.jpg', back: '/cards/Mock Plant 1 Back.jpg', invasive: false }] },
    ],
  };
  const healthyCanyons = {
    id: 'healthy-canyons', label: 'Healthy Canyons', description: '',
    categories: [
      { id: 'plants', label: '🌿 Plants', cards: [{ name: 'Healthy Oak', front: '/decks/healthy-canyons/cards/Healthy Oak Front.jpg', back: '/decks/healthy-canyons/cards/Healthy Oak Back.jpg', invasive: false }] },
    ],
  };
  return {
    DECK_DEFS: [canyonlands, healthyCanyons],
    DEFAULT_DECK_ID: 'canyonlands',
    ALL_CATEGORY_IDS: ['plants'],
    getDeckDef: (id: string) => (id === 'canyonlands' ? canyonlands : id === 'healthy-canyons' ? healthyCanyons : undefined),
    defaultInvasive: () => false,
  };
});
vi.mock('../../app/viewtrack', () => ({ trackCardView: vi.fn() }));

// The uploaded-decks storage is mocked wholesale: these tests exercise the
// route behavior around it (dropdown, rendering, manage navigation), not
// IndexedDB itself (covered in test/utils/uploadedDecks.test.ts).
vi.mock('../../app/utils/uploadedDecks', () => {
  const uploadedDef = {
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
            sciName: 'Salvia mellifera', altNames: ['Black Sage'],
            familyCommon: 'Mint Family', familyLatin: 'Lamiaceae', native: 'native', rarity: null,
          },
          {
            name: 'Curated Arundo', layout: 'photo-single', invasive: true,
            photos: [{ file: 'blob:arundo', role: 'main', credit: { observer: 'a', license: 'cc0' } }],
          },
        ],
      },
    ],
  };
  const byId: Record<string, unknown> = { 'curated-canyon': uploadedDef };
  return {
    DeckImportError: class DeckImportError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'DeckImportError';
      }
    },
    listUploadedDecks: vi.fn(async () => [
      { id: 'curated-canyon', label: '🌿 My Curated Deck', description: 'User deck', cardFormat: 'data', importedAt: '2026-09-19T00:00:00.000Z' },
    ]),
    loadUploadedDeck: vi.fn(async (id: string) => {
      const def = byId[id];
      if (!def) throw new Error(`Uploaded deck "${id}" was not found.`);
      return def;
    }),
  };
});

import { listUploadedDecks, loadUploadedDeck } from '../../app/utils/uploadedDecks';

const mockLocation = { search: '', href: 'http://localhost:3000/' };
Object.defineProperty(window, 'location', { value: mockLocation, writable: true });
const mockHistory = { replaceState: vi.fn() };
Object.defineProperty(window, 'history', { value: mockHistory, writable: true });

describe('Home with uploaded decks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // mockImplementation calls from earlier tests must not leak into others.
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReset();
    mockLocation.search = '';
    mockHistory.replaceState.mockClear();
  });

  const renderHome = () =>
    render(
      <RouterProvider
        router={createMemoryRouter([
          { path: '/', element: <Home /> },
          { path: '/decks', element: <div data-testid="manage-decks-stub" /> },
        ])}
      />,
    );

  it('lists uploaded decks in the dropdown alongside the built-ins, with a marker', async () => {
    renderHome();

    const select = await waitFor(() => {
      const select = screen.getByTestId('deck-select');
      expect(within(select).getAllByRole('option')).toHaveLength(4);
      return select;
    });
    const options = within(select).getAllByRole('option') as HTMLOptionElement[];
    expect(options.map((o) => o.value)).toEqual(['canyonlands', 'healthy-canyons', 'curated-canyon', MANAGE_DECKS_OPTION]);
    expect(options[2].textContent).toContain('My Curated Deck');
    expect(options[2].textContent).toContain('(uploaded)');
    expect(options[3].textContent).toContain('Manage decks');
    expect(listUploadedDecks).toHaveBeenCalled();
  });

  it('opens the manage decks page from the dropdown entry', async () => {
    const user = userEvent.setup();
    renderHome();
    await screen.findByTestId('deck-select');

    await user.selectOptions(screen.getByTestId('deck-select'), MANAGE_DECKS_OPTION);

    await waitFor(() => {
      expect(screen.getByTestId('manage-decks-stub')).toBeInTheDocument();
    });
  });

  it('opens an uploaded deck from the URL, renders its data card, and flips it', async () => {
    mockLocation.search = '?deck=curated-canyon';
    renderHome();

    // make_deck shuffles, so the first card can be any card of the category.
    await waitFor(() => {
      expect(['Curated Sage', 'Curated Arundo']).toContain(screen.getByTestId('card').getAttribute('data-card'));
    });
    const card = screen.getByTestId('card');
    const name = card.getAttribute('data-card')!;
    // Data cards render as HTML faces, not <img> faces.
    expect(screen.getByTestId('data-card-front')).toBeInTheDocument();
    expect(screen.getByTestId('data-card-title').textContent).toBe(name);
    // The mode button uses the uploaded deck's own category label.
    expect(screen.getByTestId('mode-button').textContent).toBe('🌿 Plants');

    fireEvent.click(card);
    expect(card).toHaveAttribute('data-flipped', 'true');
    expect(screen.getByTestId('data-card-back')).toBeInTheDocument();
  });

  it('opens an uploaded deck saved in localStorage without a URL param', async () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => (key === 'deck' ? 'curated-canyon' : null),
    );
    renderHome();

    await waitFor(() => {
      expect(['Curated Sage', 'Curated Arundo']).toContain(screen.getByTestId('card').getAttribute('data-card'));
    });
    expect(screen.getByTestId('deck-select')).toHaveValue('curated-canyon');
    // The active uploaded deck is written back to the URL.
    await waitFor(() => {
      expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', expect.stringContaining('deck=curated-canyon'));
    });
  });

  it('flags invasive uploaded cards via the explicit flag, not the built-in registry', async () => {
    mockLocation.search = '?deck=curated-canyon&card=Curated%20Arundo';
    renderHome();

    await waitFor(() => {
      expect(screen.getByTestId('card')).toHaveAttribute('data-card', 'Curated Arundo');
    });
    expect(screen.getByTestId('card')).toHaveAttribute('data-invasive', 'true');
  });

  it('hides the offline-preload affordance for data decks (photos come from IndexedDB)', async () => {
    mockLocation.search = '?deck=curated-canyon';
    const user = userEvent.setup();
    renderHome();
    await waitFor(() => {
      expect(['Curated Sage', 'Curated Arundo']).toContain(screen.getByTestId('card').getAttribute('data-card'));
    });

    await user.click(screen.getByTitle('Settings'));
    expect(await screen.findByText('Settings')).toBeInTheDocument();
    expect(screen.queryByText('Download for Offline')).not.toBeInTheDocument();
  });
});
