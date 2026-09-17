import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import Home from '../../app/routes/home';

vi.mock('../../app/data/decks', () => {
  const canyonlands = {
    id: 'canyonlands', label: 'Canyonlands', description: '',
    categories: [
      { id: 'plants', label: '🌿 Plants', cards: [{ name: 'Mock Plant 1', front: '/cards/Mock Plant 1 Front.jpg', back: '/cards/Mock Plant 1 Back.jpg', invasive: false }] },
      { id: 'birds', label: '🐦 Birds', cards: [{ name: 'Mock Bird 1', front: '/cards/Mock Bird 1 Front.jpg', back: '/cards/Mock Bird 1 Back.jpg', invasive: false }] },
    ],
  };
  const healthyCanyons = { id: 'healthy-canyons', label: 'Healthy Canyons', description: '', categories: [] };
  return {
    DECK_DEFS: [canyonlands, healthyCanyons],
    DEFAULT_DECK_ID: 'canyonlands',
    ALL_CATEGORY_IDS: ['plants', 'birds'],
    getDeckDef: (id: string) => (id === 'canyonlands' ? canyonlands : id === 'healthy-canyons' ? healthyCanyons : undefined),
    defaultInvasive: () => false,
  };
});
vi.mock('../../app/viewtrack', () => ({ trackCardView: vi.fn() }));

const mockLocation = { search: '', href: 'http://localhost:3000/' };
Object.defineProperty(window, 'location', { value: mockLocation, writable: true });
Object.defineProperty(window, 'history', { value: { replaceState: vi.fn() }, writable: true });

describe('Home with an empty Healthy Canyons deck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';
    localStorage.clear();
  });

  it('shows a friendly notice instead of a broken card area', async () => {
    const user = userEvent.setup();
    render(
      <RouterProvider router={createMemoryRouter([{ path: '/', element: <Home /> }])} />,
    );

    await user.click(screen.getByTestId('deck-button-healthy-canyons'));

    expect(await screen.findByTestId('deck-empty')).toBeInTheDocument();
    expect(screen.getByTestId('deck-empty')).toHaveTextContent('No cards in this deck yet.');
  });

  it('keeps the hamburger menu working while the empty deck is shown', async () => {
    const user = userEvent.setup();
    render(
      <RouterProvider router={createMemoryRouter([{ path: '/', element: <Home /> }])} />,
    );

    await user.click(screen.getByTestId('deck-button-healthy-canyons'));
    await screen.findByTestId('deck-empty');

    // Both deck buttons remain rendered and the mode button still works
    expect(screen.getByTestId('deck-button-canyonlands')).toBeInTheDocument();
    expect(screen.getByTestId('deck-button-healthy-canyons')).toBeInTheDocument();
    await user.click(screen.getByTestId('mode-button'));
    // The empty deck has no categories, so the only mode left is "both"
    expect(screen.getByTestId('mode-button').textContent?.trim()).toBe('Both');
  });

  it('shows the notice immediately when the healthy deck is saved', () => {
    (localStorage.getItem as any).mockImplementation((key: string) =>
      key === 'deck' ? 'healthy-canyons' : null);
    mockLocation.search = '?deck=healthy-canyons';
    render(
      <RouterProvider router={createMemoryRouter([{ path: '/', element: <Home /> }])} />,
    );
    expect(screen.getByTestId('deck-empty')).toBeInTheDocument();
  });
});