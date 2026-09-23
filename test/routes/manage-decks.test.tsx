import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import ManageDecks from '../../app/routes/manage-decks';
import { DEFAULT_DECK_ID } from '../../app/data/decks';

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
      { id: 'plants', label: '🌿 Plants', cards: [
        { name: 'Healthy Oak', front: '/decks/healthy-canyons/cards/Healthy Oak Front.jpg', back: '/decks/healthy-canyons/cards/Healthy Oak Back.jpg', invasive: false },
        { name: 'Invasive Grass', front: '/decks/healthy-canyons/cards/Invasive Grass Front.jpg', back: '/decks/healthy-canyons/cards/Invasive Grass Back.jpg', invasive: true },
      ] },
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

// The uploaded-decks storage is mocked wholesale with a mutable store so the
// page behavior (listing, import feedback, delete flow) can be exercised
// without IndexedDB (covered in test/utils/uploadedDecks.test.ts). The store
// is reset between tests because imports/deletes mutate it.
const uploadedStore = vi.hoisted(() => {
  const makeUploadedDef = () => ({
    id: 'curated-canyon', label: '🌿 My Curated Deck', description: 'User deck', cardFormat: 'data', uploaded: true,
    categories: [
      {
        id: 'plants', label: '🌿 Plants',
        cards: [
          {
            name: 'Curated Sage', layout: 'photo-trio', invasive: false,
            photos: [{ file: 'blob:curated-main', role: 'main', credit: { observer: 'joodles', license: 'cc-by-nc' } }],
            sciName: 'Salvia mellifera',
          },
        ],
      },
    ],
  });
  let stored: Record<string, any> = { 'curated-canyon': makeUploadedDef() };
  return {
    reset: () => { stored = { 'curated-canyon': makeUploadedDef() }; },
    get: () => stored,
  };
});

vi.mock('../../app/utils/uploadedDecks', async (importOriginal) => {
  // formatBytes is a pure formatter — take the real one and only stub the
  // IndexedDB-touching functions.
  const actual = await importOriginal<typeof import('../../app/utils/uploadedDecks')>();
  return {
    ...actual,
    importDeckZip: vi.fn(async () => {
      const stored = uploadedStore.get();
      stored['imported-deck'] = {
        ...stored['curated-canyon'],
        id: 'imported-deck', label: '✨ Imported Deck',
        categories: [{
          id: 'plants', label: '🌿 Plants',
          cards: [{
            name: 'Imported Nettle', layout: 'photo-trio', invasive: false,
            photos: [{ file: 'blob:imported-main', role: 'main', credit: { observer: 'x', license: 'cc0' } }],
          }],
        }],
      };
      return { id: 'imported-deck', label: '✨ Imported Deck' };
    }),
    deleteUploadedDeck: vi.fn(async (id: string) => {
      delete uploadedStore.get()[id];
    }),
    listUploadedDecks: vi.fn(async () => {
      const stored = uploadedStore.get();
      return Object.keys(stored).map((id) => {
        const def = stored[id];
        return { id, label: def.label, description: def.description, cardFormat: 'data', importedAt: '2026-09-19T00:00:00.000Z' };
      });
    }),
    loadUploadedDeck: vi.fn(async (id: string) => {
      const def = uploadedStore.get()[id];
      if (!def) throw new Error(`Uploaded deck "${id}" was not found.`);
      return def;
    }),
    uploadedDeckBytes: vi.fn(async (id: string) => {
      // 1.5 MB of stored manifest + photos, for any known deck.
      return uploadedStore.get()[id] ? 1.5 * 1024 * 1024 : null;
    }),
  };
});

import { importDeckZip, deleteUploadedDeck, listUploadedDecks } from '../../app/utils/uploadedDecks';

describe('Manage decks page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadedStore.reset();
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReset();
  });

  const renderPage = () =>
    render(
      <RouterProvider
        router={createMemoryRouter([
          { path: '/', element: <div data-testid="home-stub" /> },
          { path: '/decks', element: <ManageDecks /> },
        ], { initialEntries: ['/decks'] })}
      />,
    );

  it('lists built-in and uploaded decks with card counts, and delete only for uploaded ones', async () => {
    renderPage();

    const list = await screen.findByTestId('decks-list');
    await waitFor(() => {
      expect(within(list).getAllByTestId(/deck-row-/)).toHaveLength(3);
    });

    const canyonRow = within(list).getByTestId('deck-row-canyonlands');
    expect(canyonRow).toHaveTextContent('Canyonlands');
    expect(canyonRow).toHaveTextContent('1 card');
    expect(within(canyonRow).queryByTestId('delete-deck-button')).not.toBeInTheDocument();

    const healthyRow = within(list).getByTestId('deck-row-healthy-canyons');
    expect(healthyRow).toHaveTextContent('2 cards');

    const uploadedRow = within(list).getByTestId('deck-row-curated-canyon');
    expect(uploadedRow).toHaveTextContent('My Curated Deck');
    expect(uploadedRow).toHaveTextContent('(uploaded)');
    expect(within(uploadedRow).getByTestId('delete-deck-button')).toBeInTheDocument();
    expect(listUploadedDecks).toHaveBeenCalled();
  });

  it('shows the stored size for uploaded decks and none for built-ins', async () => {
    renderPage();

    const uploadedRow = await screen.findByTestId('deck-row-curated-canyon');
    await waitFor(() => {
      expect(uploadedRow).toHaveTextContent('1 card · 1.5 MB');
    });
    // Built-in decks are part of the app: count only, with an explanation.
    const canyonRow = screen.getByTestId('deck-row-canyonlands');
    expect(canyonRow).toHaveTextContent('1 card');
    expect(canyonRow).not.toHaveTextContent('·');
    expect(within(canyonRow).getByTestId('deck-storage')).toHaveAttribute(
      'title',
      'Part of the app — not stored in this browser',
    );
    // Uploaded rows do not claim to be app parts.
    expect(within(uploadedRow).getByTestId('deck-storage')).not.toHaveAttribute('title');
  });

  it('imports a zip, shows success feedback, and the new deck appears in the list', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('deck-row-curated-canyon');

    const input = screen.getByTestId('upload-deck-input');
    await user.upload(input, new File(['PK…'], 'my-deck.zip', { type: 'application/zip' }));

    const status = await screen.findByTestId('upload-status');
    expect(status).toHaveTextContent('Imported “✨ Imported Deck”');
    expect(status).toHaveClass('success');

    // The list refreshes and includes the imported deck, with its size.
    await waitFor(() => {
      expect(screen.getByTestId('deck-row-imported-deck')).toHaveTextContent('1.5 MB');
    });
  });

  it('shows an inline error and stays on the page when the import fails', async () => {
    vi.mocked(importDeckZip).mockRejectedValueOnce(
      new Error('This file doesn’t look like a deck archive: manifest.json is missing.'),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('deck-row-curated-canyon');

    const input = screen.getByTestId('upload-deck-input');
    await user.upload(input, new File(['junk'], 'bad.zip', { type: 'application/zip' }));

    const status = await screen.findByTestId('upload-status');
    expect(status).toHaveTextContent('manifest.json is missing');
    expect(status).toHaveClass('error');
    // Still on the manage page (no navigation to the study page).
    expect(screen.queryByTestId('home-stub')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('deck-row-curated-canyon')).toBeInTheDocument();
    });
  });

  it('deletes an uploaded deck only after the inline confirm, and cancel disarms', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = await screen.findByTestId('deck-row-curated-canyon');

    // First click arms the confirm; nothing deleted yet.
    await user.click(within(row).getByTestId('delete-deck-button'));
    const confirm = screen.getByTestId('delete-deck-confirm');
    expect(confirm).toHaveTextContent('Delete “🌿 My Curated Deck”?');

    // Cancel disarms.
    await user.click(screen.getByTestId('delete-deck-cancel'));
    expect(screen.queryByTestId('delete-deck-confirm')).not.toBeInTheDocument();

    // Second round: confirm deletes and the row disappears.
    await user.click(within(screen.getByTestId('deck-row-curated-canyon')).getByTestId('delete-deck-button'));
    await user.click(screen.getByTestId('delete-deck-confirm'));

    expect(deleteUploadedDeck).toHaveBeenCalledWith('curated-canyon');
    await waitFor(() => {
      expect(screen.queryByTestId('deck-row-curated-canyon')).not.toBeInTheDocument();
    });
  });

  it('resets the saved active deck to the default when that deck is deleted', async () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => (key === 'deck' ? 'curated-canyon' : null),
    );
    const user = userEvent.setup();
    renderPage();
    const row = await screen.findByTestId('deck-row-curated-canyon');

    await user.click(within(row).getByTestId('delete-deck-button'));
    await user.click(screen.getByTestId('delete-deck-confirm'));

    expect(localStorage.setItem).toHaveBeenCalledWith('deck', DEFAULT_DECK_ID);
    await waitFor(() => {
      expect(screen.queryByTestId('deck-row-curated-canyon')).not.toBeInTheDocument();
    });
  });

  it('returns to the study page via the back button', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId('decks-list');

    await user.click(screen.getByTestId('back-button'));

    await waitFor(() => {
      expect(screen.getByTestId('home-stub')).toBeInTheDocument();
    });
  });
});