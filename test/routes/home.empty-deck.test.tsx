import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  healthyPlants: [],
  healthyAnimals: [],
}));
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

    await user.click(screen.getByTestId('deck-button-healthy'));

    expect(await screen.findByTestId('deck-empty')).toBeInTheDocument();
    expect(screen.getByTestId('deck-empty')).toHaveTextContent('No cards in this deck yet.');
  });

  it('keeps the hamburger menu working while the empty deck is shown', async () => {
    const user = userEvent.setup();
    render(
      <RouterProvider router={createMemoryRouter([{ path: '/', element: <Home /> }])} />,
    );

    await user.click(screen.getByTestId('deck-button-healthy'));
    await screen.findByTestId('deck-empty');

    // Both deck buttons remain rendered and the mode button still works
    expect(screen.getByTestId('deck-button-canyonlands')).toBeInTheDocument();
    expect(screen.getByTestId('deck-button-healthy')).toBeInTheDocument();
    await user.click(screen.getByTestId('mode-button'));
    expect(screen.getByTestId('mode-button').textContent).toBe('🦎 Animals');
  });

  it('shows the notice immediately when the healthy deck is saved', () => {
    (localStorage.getItem as any).mockImplementation((key: string) =>
      key === 'deck' ? 'healthy' : null);
    mockLocation.search = '?deck=healthy';
    render(
      <RouterProvider router={createMemoryRouter([{ path: '/', element: <Home /> }])} />,
    );
    expect(screen.getByTestId('deck-empty')).toBeInTheDocument();
  });
});