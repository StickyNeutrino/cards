import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

// The light deck's photos have no local bytes yet: empty `file`, remote `url`.
const URL_A = 'https://inaturalist-open-data.s3.amazonaws.com/photos/201/original.jpg';
const URL_B = 'https://inaturalist-open-data.s3.amazonaws.com/photos/202/original.jpg';
const credit = { observer: 'joodles', license: 'cc-by-nc' };

const lightDef: DeckDef = {
  id: 'light-deck', label: '⚡ Light Deck', description: 'Streams its photos', cardFormat: 'data', format: 'lite', uploaded: true,
  categories: [
    {
      id: 'plants', label: '🌿 Plants',
      cards: [
        {
          name: 'Light Sage', layout: 'photo-trio', invasive: false,
          photos: [
            { file: '', url: URL_A, role: 'main', credit },
            { file: '', url: URL_B, role: 'secondary', credit },
          ],
        },
        {
          name: 'Light Oak', layout: 'photo-single', invasive: false,
          photos: [{ file: '', url: URL_B, role: 'main', credit }],
        },
      ],
    },
  ],
};

const applyPhotos = vi.hoisted(() => vi.fn());

vi.mock('../../app/utils/useUploadedDecks', () => ({
  useUploadedDecks: () => ({ decks: [lightDef], reload: vi.fn(), applyPhotos }),
}));

vi.mock('../../app/utils/lightPhotos', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/utils/lightPhotos')>();
  return {
    ...actual,
    ensureLightPhotos: vi.fn(async () => ({ cached: new Map<string, string>(), failed: [] as string[] })),
    areLightPhotosCached: vi.fn(async () => false),
  };
});

import { ensureLightPhotos, areLightPhotosCached } from '../../app/utils/lightPhotos';

const mockLocation = { search: '', href: 'http://localhost:3000/card-lists' };
Object.defineProperty(window, 'location', { value: mockLocation, writable: true });

describe('CardLists with a light deck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';
    localStorage.clear();
    vi.mocked(ensureLightPhotos).mockResolvedValue({ cached: new Map(), failed: [] });
    vi.mocked(areLightPhotosCached).mockResolvedValue(false);
  });

  const router = (initial = '/card-lists') =>
    createMemoryRouter([{ path: '/card-lists', element: <CardLists /> }], { initialEntries: [initial] });

  it('renders thumbnails of photos that are not cached yet from their remote URLs', async () => {
    mockLocation.search = '?deck=light-deck';
    render(<RouterProvider router={router('/card-lists?deck=light-deck')} />);

    await waitFor(() => {
      expect(screen.getByTestId('card-list')).toHaveTextContent('Light Sage');
    });
    const srcs = screen.getAllByTestId('card-item').flatMap((item) =>
      Array.from(item.querySelectorAll('img')).map((img) => img.getAttribute('src')),
    );
    expect(srcs).toContain(URL_A);
    expect(srcs).toContain(URL_B);
  });

  it('fetches the whole deck into the cache and swaps the thumbnails to local bytes', async () => {
    mockLocation.search = '?deck=light-deck';
    vi.mocked(ensureLightPhotos).mockResolvedValue({
      cached: new Map([[URL_A, 'blob:warm-a'], [URL_B, 'blob:warm-b']]),
      failed: [],
    });
    render(<RouterProvider router={router('/card-lists?deck=light-deck')} />);

    // Every photo of the deck was requested at once.
    await waitFor(() => {
      expect(ensureLightPhotos).toHaveBeenCalledWith('light-deck', expect.arrayContaining([URL_A, URL_B]));
    });
    // The fetched bytes were swapped into the deck's photos.
    await waitFor(() => {
      expect(applyPhotos).toHaveBeenCalledWith('light-deck', expect.any(Map));
    });
    const swapped = applyPhotos.mock.calls[0][1] as Map<string, string>;
    expect(swapped.get(URL_A)).toBe('blob:warm-a');
    expect(swapped.get(URL_B)).toBe('blob:warm-b');
  });

  it('marks the deck downloaded for offline use once everything is cached', async () => {
    mockLocation.search = '?deck=light-deck';
    vi.mocked(ensureLightPhotos).mockResolvedValue({
      cached: new Map([[URL_A, 'blob:warm-a'], [URL_B, 'blob:warm-b']]),
      failed: [],
    });
    vi.mocked(areLightPhotosCached).mockResolvedValue(true);
    render(<RouterProvider router={router('/card-lists?deck=light-deck')} />);

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('pwa-cards-preloaded-light-deck', 'true');
    });
  });

  it('resolves uncached light photos to the remote url in cardsForDef', () => {
    const items = cardsForDef(lightDef, 'plants');
    const sage = items.find((card) => card.name === 'Light Sage')!;
    expect(sage.dataModel!.photos!.map((p) => p.src)).toEqual([URL_A, URL_B]);
  });
});
