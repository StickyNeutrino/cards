import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import Home from '../../app/routes/home';

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

// Spy on the deck builder: the reshuffle regression this suite guards is
// make_deck being re-run when photo bytes stream in (which visibly changes
// the card under the user).
vi.mock('../../app/utils/deckUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/utils/deckUtils')>();
  return { ...actual, make_deck: vi.fn((...args: Parameters<typeof actual.make_deck>) => actual.make_deck(...args)) };
});
import { make_deck } from '../../app/utils/deckUtils';

// The light deck is stored (uploadedDecks) and its photos stream from the
// network on demand (lightPhotos). Both are mocked: these tests exercise the
// study page's behavior around them, not the storage/fetch layers themselves
// (covered in test/utils/*).
const URL_A = 'https://inaturalist-open-data.s3.amazonaws.com/photos/201/original.jpg';
const URL_B = 'https://inaturalist-open-data.s3.amazonaws.com/photos/202/original.jpg';
const URL_C = 'https://inaturalist-open-data.s3.amazonaws.com/photos/203/original.jpg';
const credit = { observer: 'joodles', license: 'cc-by-nc' };

const lightDef = {
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
          sciName: 'Salvia lightii', native: 'native',
        },
        {
          name: 'Light Oak', layout: 'photo-single', invasive: false,
          photos: [{ file: '', url: URL_B, role: 'main', credit }],
        },
        {
          name: 'Light Fern', layout: 'photo-single', invasive: false,
          photos: [{ file: '', url: URL_C, role: 'main', credit }],
        },
      ],
    },
  ],
};

vi.mock('../../app/utils/uploadedDecks', () => ({
  listUploadedDecks: vi.fn(async () => [
    { id: 'light-deck', label: '⚡ Light Deck', description: 'Streams its photos', cardFormat: 'data', importedAt: '2026-10-01T00:00:00.000Z' },
  ]),
  loadUploadedDeck: vi.fn(async (id: string) => {
    if (id !== 'light-deck') throw new Error(`Uploaded deck "${id}" was not found.`);
    return lightDef;
  }),
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

const mockLocation = { search: '', href: 'http://localhost:3000/' };
Object.defineProperty(window, 'location', { value: mockLocation, writable: true });
const mockHistory = { replaceState: vi.fn() };
Object.defineProperty(window, 'history', { value: mockHistory, writable: true });

describe('Home with a light deck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReset();
    mockLocation.search = '';
    mockHistory.replaceState.mockClear();
    vi.mocked(ensureLightPhotos).mockResolvedValue({ cached: new Map(), failed: [] });
    vi.mocked(areLightPhotosCached).mockResolvedValue(false);
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

  it('shows the deck immediately, rendering uncached photos from their remote URLs', async () => {
    mockLocation.search = '?deck=light-deck';
    renderHome();

    await waitFor(() => {
      expect(['Light Sage', 'Light Oak', 'Light Fern']).toContain(screen.getByTestId('card').getAttribute('data-card'));
    });
    // No local bytes yet: the photo slots point at the remote sources.
    const mainImg = document.querySelector('[data-testid="data-photo"][data-role="main"] img')!;
    expect([URL_A, URL_B, URL_C]).toContain(mainImg.getAttribute('src'));
  });

  it('warms the cache a few cards ahead while studying', async () => {
    mockLocation.search = '?deck=light-deck';
    renderHome();
    await waitFor(() => {
      expect(['Light Sage', 'Light Oak', 'Light Fern']).toContain(screen.getByTestId('card').getAttribute('data-card'));
    });
    await waitFor(() => {
      expect(ensureLightPhotos).toHaveBeenCalledWith('light-deck', expect.arrayContaining([URL_A, URL_B]));
    });

    // Advancing warms the upcoming cards again.
    const callsBefore = vi.mocked(ensureLightPhotos).mock.calls.length;
    const user = userEvent.setup();
    await user.click(document.getElementById('next-button')!);
    await waitFor(() => {
      expect(vi.mocked(ensureLightPhotos).mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  it('does not reshuffle the study order while photos stream in', async () => {
    mockLocation.search = '?deck=light-deck';
    // Hold every look-ahead batch open so no patch lands until this test
    // releases one — that makes the observation points deterministic.
    let release!: (result: { cached: Map<string, string>; failed: string[] }) => void;
    vi.mocked(ensureLightPhotos).mockImplementation(
      () => new Promise((resolve) => { release = resolve; }),
    );
    renderHome();
    await waitFor(() => {
      expect(['Light Sage', 'Light Oak', 'Light Fern']).toContain(screen.getByTestId('card').getAttribute('data-card'));
    });

    const nameBefore = screen.getByTestId('card').getAttribute('data-card');
    const buildsBefore = vi.mocked(make_deck).mock.calls.length;
    const ensureCallsBefore = vi.mocked(ensureLightPhotos).mock.calls.length;

    // One batch of photos lands in the cache and is swapped into the deck.
    release({ cached: new Map([[URL_A, 'blob:warm-a']]), failed: [] });
    // The patch re-runs the look-ahead (it asks for the next uncached URLs),
    // which is exactly the point where a reshuffle would have been triggered.
    await waitFor(() => {
      expect(vi.mocked(ensureLightPhotos).mock.calls.length).toBeGreaterThan(ensureCallsBefore);
    });

    // The deck order was NOT rebuilt: same card still under the user.
    expect(vi.mocked(make_deck).mock.calls.length).toBe(buildsBefore);
    expect(screen.getByTestId('card').getAttribute('data-card')).toBe(nameBefore);
  });

  it('swaps cached bytes into the cards as they land', async () => {
    mockLocation.search = '?deck=light-deck';
    vi.mocked(ensureLightPhotos).mockResolvedValue({
      cached: new Map([[URL_A, 'blob:warm-a'], [URL_B, 'blob:warm-b'], [URL_C, 'blob:warm-c']]),
      failed: [],
    });
    vi.mocked(areLightPhotosCached).mockResolvedValue(true);
    renderHome();

    await waitFor(() => {
      const mainImg = document.querySelector('[data-testid="data-photo"][data-role="main"] img')!;
      expect(mainImg.getAttribute('src')).toMatch(/^blob:warm-/);
    });
    // Nothing renders from the network anymore.
    document.querySelectorAll('img').forEach((img) => {
      expect(img.getAttribute('src')!.startsWith('https://')).toBe(false);
    });
    // A fully cached deck counts as downloaded for offline use.
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('pwa-cards-preloaded-light-deck', 'true');
    });
  });

  it('offers Download for Offline and fetches the whole deck with progress', async () => {
    mockLocation.search = '?deck=light-deck';
    const user = userEvent.setup();
    renderHome();
    await waitFor(() => {
      expect(['Light Sage', 'Light Oak', 'Light Fern']).toContain(screen.getByTestId('card').getAttribute('data-card'));
    });

    await user.click(screen.getByTitle('Settings'));
    const button = await screen.findByText('Download for Offline');
    await user.click(button);

    // The whole deck's photos were requested, with progress reporting.
    expect(ensureLightPhotos).toHaveBeenCalledWith(
      'light-deck',
      expect.arrayContaining([URL_A, URL_B]),
      expect.objectContaining({ onProgress: expect.any(Function) }),
    );
    expect(await screen.findByText('Cards Downloaded')).toBeInTheDocument();
    expect(localStorage.setItem).toHaveBeenCalledWith('pwa-cards-preloaded-light-deck', 'true');
  });

  it('reports a download that could not fetch every photo, and offers a retry', async () => {
    mockLocation.search = '?deck=light-deck';
    vi.mocked(ensureLightPhotos).mockResolvedValue({
      cached: new Map([[URL_A, 'blob:warm-a']]),
      failed: [URL_B],
    });
    const user = userEvent.setup();
    renderHome();
    await waitFor(() => {
      expect(['Light Sage', 'Light Oak', 'Light Fern']).toContain(screen.getByTestId('card').getAttribute('data-card'));
    });

    await user.click(screen.getByTitle('Settings'));
    await user.click(await screen.findByText('Download for Offline'));

    expect(await screen.findByTestId('preload-error')).toHaveTextContent('Could not fetch 1 photo');
    // The button is usable again for a retry.
    expect(screen.getByText('Download for Offline')).toBeInTheDocument();
  });
});
