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
      { id: 'birds', label: '🐦 Birds', cards: [{ name: 'Mock Bird 1', front: '/cards/Mock Bird 1 Front.jpg', back: '/cards/Mock Bird 1 Back.jpg', invasive: false }] },
    ],
  };
  const healthyCanyons = {
    id: 'healthy-canyons', label: 'Healthy Canyons', description: '',
    categories: [
      { id: 'plants', label: '🌿 Plants', cards: [
        { name: 'Healthy Oak', front: '/decks/healthy-canyons/cards/Healthy Oak Front.jpg', back: '/decks/healthy-canyons/cards/Healthy Oak Back.jpg', invasive: false },
        { name: 'Invasive Grass', front: '/decks/healthy-canyons/cards/Invasive Grass Front.jpg', back: '/decks/healthy-canyons/cards/Invasive Grass Back.jpg', invasive: true },
      ] },
      { id: 'animals', label: '🦎 Animals', cards: [
        { name: 'Healthy Hawk', front: '/decks/healthy-canyons/cards/Healthy Hawk Front.jpg', back: '/decks/healthy-canyons/cards/Healthy Hawk Back.jpg', invasive: false },
      ] },
    ],
  };
  return {
    DECK_DEFS: [canyonlands, healthyCanyons],
    DEFAULT_DECK_ID: 'canyonlands',
    ALL_CATEGORY_IDS: ['plants', 'birds', 'animals'],
    getDeckDef: (id: string) => (id === 'canyonlands' ? canyonlands : id === 'healthy-canyons' ? healthyCanyons : undefined),
    defaultInvasive: (name: string) => name === 'Invasive Grass',
  };
});
vi.mock('../../app/viewtrack', () => ({ trackCardView: vi.fn() }));

const mockLocation = { search: '', href: 'http://localhost:3000/' };
Object.defineProperty(window, 'location', { value: mockLocation, writable: true });
const mockHistory = { replaceState: vi.fn() };
Object.defineProperty(window, 'history', { value: mockHistory, writable: true });

describe('Home deck switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.search = '';
    mockHistory.replaceState.mockClear();
  });

  const renderHome = () =>
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <Home /> }])} />);

  it('switches to the healthy-canyons deck via the deck picker', async () => {
    renderHome();

    await userEvent.selectOptions(screen.getByTestId('deck-select'), 'healthy-canyons');

    await waitFor(() => {
      const card = screen.getByTestId('card');
      expect(['Healthy Oak', 'Invasive Grass']).toContain(card.getAttribute('data-card'));
    });
  });

  it('flags non-native healthy cards as invasive', async () => {
    mockLocation.search = '?deck=healthy-canyons';
    renderHome();

    const card = screen.getByTestId('card');
    const name = card.getAttribute('data-card');
    if (name === 'Invasive Grass') {
      expect(card).toHaveAttribute('data-invasive', 'true');
    } else {
      expect(card).toHaveAttribute('data-invasive', 'false');
    }
  });

  it('resets to the first category and updates the URL when switching decks', async () => {
    mockLocation.search = '?birds=true';
    renderHome();
    expect(screen.getByTestId('mode-button').textContent).toBe('🐦 Birds');

    await userEvent.selectOptions(screen.getByTestId('deck-select'), 'healthy-canyons');

    await waitFor(() => {
      expect(screen.getByTestId('mode-button').textContent).toBe('🌿 Plants');
    });
    await waitFor(() => {
      expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', expect.stringContaining('deck=healthy-canyons'));
    });
  });

  it('deep-links to a healthy card with ?deck=healthy-canyons&card=', async () => {
    mockLocation.search = '?deck=healthy-canyons&card=Healthy%20Hawk';
    renderHome();

    await waitFor(() => {
      // The animals category is auto-selected because the card is an animal
      expect(screen.getByTestId('card')).toHaveAttribute('data-card', 'Healthy Hawk');
    });
  });
});