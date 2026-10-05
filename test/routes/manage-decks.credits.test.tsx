import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useLocation } from 'react-router';
import { createMemoryRouter, RouterProvider } from 'react-router';
import ManageDecks from '../../app/routes/manage-decks';

vi.mock('../../app/data/decks', () => {
  const canyonlands = {
    id: 'canyonlands', label: 'Canyonlands', description: '',
    categories: [
      { id: 'plants', label: '🌿 Plants', cards: [
        { name: 'Mock Plant 1', front: '/cards/Mock Plant 1 Front.jpg', back: '/cards/Mock Plant 1 Back.jpg', invasive: false },
      ] },
    ],
  };
  const healthyCanyons = {
    id: 'healthy-canyons', label: 'Healthy Canyons', description: '',
    categories: [
      { id: 'plants', label: '🌿 Plants', cards: [
        { name: 'Coast Live Oak', front: '/decks/healthy-canyons/cards/Coast Live Oak Front.jpg', back: '/decks/healthy-canyons/cards/Coast Live Oak Back.jpg', invasive: false },
      ] },
    ],
  };
  return {
    DECK_DEFS: [canyonlands, healthyCanyons],
    DEFAULT_DECK_ID: 'canyonlands',
    ALL_CATEGORY_IDS: ['plants'],
    getDeckDef: undefined,
    defaultInvasive: () => false,
  };
});

// Uploaded decks come through the hook (storage covered in
// test/utils/uploadedDecks.test.ts).
const uploadedDecks = vi.hoisted(() => [
  {
    id: 'curated-canyon', label: '🌿 My Curated Deck', description: 'User deck', cardFormat: 'data', uploaded: true,
    categories: [
      { id: 'plants', label: '🌿 Plants', cards: [] },
    ],
  },
]);

vi.mock('../../app/utils/useUploadedDecks', () => ({
  useUploadedDecks: () => ({ decks: uploadedDecks, reload: vi.fn() }),
}));

vi.mock('../../app/utils/uploadedDecks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/utils/uploadedDecks')>();
  return {
    ...actual,
    deleteUploadedDeck: vi.fn(async () => {}),
    uploadedDeckBytes: vi.fn(async () => null),
  };
});

// The credits page itself is covered in credits.test.tsx; here we assert the
// deck row opens it scoped to that deck.
function CreditsRouteSpy() {
  const location = useLocation();
  return <div data-testid="credits-route-spy" data-search={location.search} />;
}

describe('Manage decks → credits page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReset();
  });

  const renderPage = () => {
    const router = createMemoryRouter(
      [
        { path: '/', element: <div data-testid="home-stub" /> },
        { path: '/decks', element: <ManageDecks /> },
        { path: '/credits', element: <CreditsRouteSpy /> },
      ],
      { initialEntries: ['/decks'] },
    );
    render(<RouterProvider router={router} />);
  };

  it('every deck row opens the credits page scoped to that deck', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('deck-credits-button-healthy-canyons'));
    expect(screen.getByTestId('credits-route-spy').getAttribute('data-search')).toBe('?deck=healthy-canyons');
  });

  it('an uploaded deck row links to its own credits', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('deck-credits-button-curated-canyon'));
    expect(screen.getByTestId('credits-route-spy').getAttribute('data-search')).toBe('?deck=curated-canyon');
  });
});