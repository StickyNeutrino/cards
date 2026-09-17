import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import Credits from '../../app/routes/credits';

vi.mock('../../app/data/healthyCards', () => ({
  healthyGeneratedAt: '2026-09-17T00:00:00Z',
  healthyPlants: [
    {
      name: 'Coast Live Oak', front: '/cards-healthy/Coast Live Oak Front.jpg', back: '/cards-healthy/Coast Live Oak Back.jpg',
      sciName: 'Quercus agrifolia', commonName: 'Coast Live Oak', familyCommon: null, familyLatin: 'Fagaceae',
      group: 'Plants', category: null, native: 'native', rarity: null, canyons: ['Tecolote South'],
      taxonId: 48624,
      photos: [
        { observer: 'Alice Nature', license: 'cc-by-nc', observationUrl: 'https://www.inaturalist.org/observations/111', observationId: 111, placeLabel: 'San Diego County' },
        { observer: 'Bob Oak', license: 'cc0', observationUrl: 'https://www.inaturalist.org/observations/222', observationId: 222, placeLabel: 'San Diego County' },
      ],
    },
  ],
  healthyAnimals: [
    {
      name: 'Red-tailed Hawk', front: '/cards-healthy/Red-tailed Hawk Front.jpg', back: '/cards-healthy/Red-tailed Hawk Back.jpg',
      sciName: 'Buteo jamaicensis', commonName: 'Red-tailed Hawk', familyCommon: null, familyLatin: 'Accipitridae',
      group: 'Birds', category: 'Hawks & Eagles', native: 'native', rarity: null, canyons: ['Paradise'],
      taxonId: 1001,
      photos: [
        { observer: 'Carol Hawk', license: 'cc-by', observationUrl: 'https://www.inaturalist.org/observations/333', observationId: 333, placeLabel: 'worldwide' },
      ],
    },
  ],
}));

describe('Credits page', () => {
  const renderPage = () =>
    render(
      <RouterProvider
        router={createMemoryRouter([{ path: '/credits', element: <Credits /> }], { initialEntries: ['/credits'] })}
      />,
    );

  it('lists every photo with observer, license, and observation link', () => {
    renderPage();

    const table = screen.getByTestId('credits-table');
    expect(table).toHaveTextContent('Coast Live Oak');
    expect(table).toHaveTextContent('Alice Nature');
    expect(table).toHaveTextContent('CC BY-NC');
    expect(table).toHaveTextContent('Bob Oak');
    expect(table).toHaveTextContent('CC0');
    expect(table).toHaveTextContent('Red-tailed Hawk');
    expect(table).toHaveTextContent('Carol Hawk');
    expect(table).toHaveTextContent('CC BY');

    const links = screen.getAllByRole('link', { name: /iNat #\d+/ });
    expect(links.map((l) => l.getAttribute('href'))).toContain('https://www.inaturalist.org/observations/111');
  });

  it('search filters by card name and photographer', () => {
    renderPage();
    const search = screen.getByTestId('credits-search');
    fireEvent.change(search, { target: { value: 'hawk' } });
    expect(screen.getByTestId('credits-table')).toHaveTextContent('Carol Hawk');
    expect(screen.getByTestId('credits-table')).not.toHaveTextContent('Alice Nature');

    fireEvent.change(search, { target: { value: 'zzz-no-match' } });
    expect(screen.getByText('No matching credits.')).toBeInTheDocument();
  });
});