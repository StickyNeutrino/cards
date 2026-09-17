import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import Home from '../../app/routes/home';

vi.mock('../../app/routes/card-lists', () => ({
  birds: [{ name: 'Mock Bird 1', front: 'Mock Bird 1 Front.jpg', back: 'Mock Bird 1 Back.jpg' }],
  plants: [{ name: 'Mock Plant 1', front: 'Mock Plant 1 Front.jpg', back: 'Mock Plant 1 Back.jpg' }],
  invasives: [],
}));
vi.mock('../../app/data/healthyCards', () => ({
  healthyGeneratedAt: '',
  healthyPlants: [
    {
      name: 'Healthy Oak', front: '/cards-healthy/Healthy Oak Front.jpg', back: '/cards-healthy/Healthy Oak Back.jpg',
      sciName: 'Quercus healthy', commonName: 'Healthy Oak', familyCommon: null, familyLatin: 'Fagaceae',
      group: 'Plants', category: null, native: 'native', rarity: null, canyons: [], taxonId: 1, photos: [],
    },
    {
      name: 'Invasive Grass', front: '/cards-healthy/Invasive Grass Front.jpg', back: '/cards-healthy/Invasive Grass Back.jpg',
      sciName: 'Grass invasiva', commonName: 'Invasive Grass', familyCommon: null, familyLatin: 'Poaceae',
      group: 'Plants', category: null, native: 'non-native', rarity: null, canyons: [], taxonId: 2, photos: [],
    },
  ],
  healthyAnimals: [
    {
      name: 'Healthy Hawk', front: '/cards-healthy/Healthy Hawk Front.jpg', back: '/cards-healthy/Healthy Hawk Back.jpg',
      sciName: 'Buteo healthy', commonName: 'Healthy Hawk', familyCommon: null, familyLatin: 'Accipitridae',
      group: 'Birds', category: null, native: 'native', rarity: null, canyons: [], taxonId: 3, photos: [],
    },
  ],
}));
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

  it('switches to the healthy deck via the deck picker', async () => {
    renderHome();

    await userEvent.click(screen.getByTestId('deck-button-healthy'));

    await waitFor(() => {
      const card = screen.getByTestId('card');
      expect(['Healthy Oak', 'Invasive Grass']).toContain(card.getAttribute('data-card'));
    });
  });

  it('flags non-native healthy cards as invasive', async () => {
    mockLocation.search = '?deck=healthy';
    renderHome();

    // default mode is plants; shuffle may show either plant first
    const card = screen.getByTestId('card');
    const name = card.getAttribute('data-card');
    await waitFor(() => {
      expect(card.getAttribute('data-card')).toBe(name);
    });
    if (name === 'Invasive Grass') {
      expect(card).toHaveAttribute('data-invasive', 'true');
    } else {
      expect(card).toHaveAttribute('data-invasive', 'false');
    }
  });

  it('resets to plants mode and updates the URL when switching decks', async () => {
    mockLocation.search = '?birds=true';
    renderHome();
    expect(screen.getByTestId('mode-button').textContent).toBe('🐦 Birds');

    await userEvent.click(screen.getByTestId('deck-button-healthy'));

    await waitFor(() => {
      expect(screen.getByTestId('mode-button').textContent).toBe('🌿 Plants');
    });
    await waitFor(() => {
      expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', expect.stringContaining('deck=healthy'));
    });
  });

  it('deep-links to a healthy card with ?deck=healthy&card=', async () => {
    mockLocation.search = '?deck=healthy&card=Healthy%20Hawk';
    renderHome();

    await waitFor(() => {
      // The animals mode is auto-selected because the card is an animal
      expect(screen.getByTestId('card')).toHaveAttribute('data-card', 'Healthy Hawk');
    });
  });
});