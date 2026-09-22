import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataCard, creditLabelFor, type DataCardModel } from '../../app/card/dataCard';

const trioModel: DataCardModel = {
  name: 'Dwarf Nettle',
  layout: 'photo-trio',
  photos: [
    { src: 'blob:main', role: 'main', alt: 'Flowering stalk', credit: { observer: 'joodles', license: 'cc-by-nc' } },
    { src: 'blob:sec1', role: 'secondary', credit: { observer: 'leavenworth', license: 'cc0' } },
    { src: 'blob:sec2', role: 'secondary', credit: { observer: 'susanbar', license: 'all-rights-reserved' } },
  ],
  sciName: 'Urtica urens',
  altNames: ['Burning Nettle'],
  familyCommon: 'Nettle Family',
  familyLatin: 'Urticaceae',
  native: 'non-native',
  invasive: true,
};

describe('creditLabelFor', () => {
  it('formats the license codes for the caption line', () => {
    expect(creditLabelFor('cc0')).toBe('CC0');
    expect(creditLabelFor('cc-by-nc')).toBe('CC BY-NC');
    expect(creditLabelFor('cc-by-nc-sa')).toBe('CC BY-NC-SA');
    expect(creditLabelFor('all-rights-reserved')).toBe('All Rights Reserved');
  });
});

describe('DataCard front', () => {
  it('renders the trio slots in order with credit captions', () => {
    render(<DataCard model={trioModel} face="front" />);

    const photos = screen.getAllByTestId('data-photo');
    expect(photos).toHaveLength(3);
    expect(photos.map((p) => p.getAttribute('data-role'))).toEqual(['main', 'secondary', 'secondary']);

    const images = photos.map((p) => p.querySelector('img'));
    expect(images.map((i) => i?.getAttribute('src'))).toEqual(['blob:main', 'blob:sec1', 'blob:sec2']);
    expect(images[0]).toHaveAttribute('alt', 'Flowering stalk');

    const credits = screen.getAllByTestId('data-credit');
    expect(credits.map((c) => c.textContent)).toEqual([
      '© joodles · CC BY-NC',
      '© leavenworth · CC0',
      '© susanbar · All Rights Reserved',
    ]);
  });

  it('renders a single photo (photo-single) as the main slot only', () => {
    render(
      <DataCard
        model={{
          name: 'Chamise',
          layout: 'photo-single',
          photos: [{ src: 'blob:main', role: 'main', credit: { observer: 'alice', license: 'cc-by' } }],
        }}
        face="front"
      />,
    );

    const photos = screen.getAllByTestId('data-photo');
    expect(photos).toHaveLength(1);
    expect(photos[0]).toHaveAttribute('data-role', 'main');
    expect(screen.getByTestId('data-credit').textContent).toBe('© alice · CC BY');
  });

  it('renders a photo-trio with one photo like a single (main slot only)', () => {
    render(
      <DataCard
        model={{
          name: 'Wrentit',
          layout: 'photo-trio',
          photos: [{ src: 'blob:main', role: 'main', credit: { observer: 'bob', license: 'cc0' } }],
        }}
        face="front"
      />,
    );

    expect(screen.getAllByTestId('data-photo')).toHaveLength(1);
  });

  it('renders only the first two secondary photos even if given extras', () => {
    render(
      <DataCard
        model={{
          name: 'Extra',
          layout: 'photo-trio',
          photos: [
            { src: 'blob:main', role: 'main', credit: { observer: 'a', license: 'cc0' } },
            { src: 'blob:s1', role: 'secondary', credit: { observer: 'b', license: 'cc0' } },
            { src: 'blob:s2', role: 'secondary', credit: { observer: 'c', license: 'cc0' } },
            { src: 'blob:s3', role: 'secondary', credit: { observer: 'd', license: 'cc0' } },
          ],
        }}
        face="front"
      />,
    );

    expect(screen.getAllByTestId('data-photo')).toHaveLength(3);
  });
});

describe('border styles', () => {
  it('renders classic red via the invasive class', () => {
    render(<DataCard model={{ name: 'X', native: 'non-native', invasive: true, border: 'invasive' }} face="back" />);
    expect(screen.getByTestId('data-card-back')).toHaveClass('invasive');
  });

  it('renders other border styles with their color inline', () => {
    render(<DataCard model={{ name: 'X', native: 'native', border: 'rare' }} face="back" />);
    const back = screen.getByTestId('data-card-back');
    expect(back).not.toHaveClass('invasive');
    expect(back).toHaveStyle({ borderColor: '#6d28d9', borderWidth: '6px', borderStyle: 'solid' });
  });

  it('no border style draws no inline border', () => {
    render(<DataCard model={{ name: 'X', native: 'native' }} face="back" />);
    expect(screen.getByTestId('data-card-back')).not.toHaveClass('invasive');
  });
});

describe('variant cards', () => {
  it('shows the clean commonName as the title when the export name carries a variant suffix', () => {
    render(
      <DataCard
        model={{
          name: 'Dudleya edulis (2)',
          commonName: 'Dudleya edulis',
          sciName: 'Dudleya edulis',
          native: 'native',
        }}
        face="back"
      />,
    );

    expect(screen.getByTestId('data-card-title').textContent).toBe('Dudleya edulis');
  });

  it('falls back to name when commonName is absent', () => {
    render(<DataCard model={{ name: 'Chamise', native: 'native' }} face="back" />);
    expect(screen.getByTestId('data-card-title').textContent).toBe('Chamise');
  });

  it('maps an explicit crop window onto the slot', () => {
    render(
      <DataCard
        model={{
          name: 'Oak',
          layout: 'photo-trio',
          photos: [
            { src: 'blob:main', role: 'main', credit: { observer: 'a', license: 'cc0' }, crop: { x: 0.25, y: 0.1, w: 0.5, h: 0.5 } },
          ],
        }}
        face="front"
      />,
    );

    const img = screen.getAllByTestId('data-photo')[0].querySelector('img');
    // The crop region is scaled to fill the slot and offset so the window
    // aligns; object-fit fill prevents double-cropping.
    // maxWidth/maxHeight must be unclamped or the slot CSS re-shrinks the
    // window (the 'crop applied twice' bug).
    expect(img).toHaveStyle({ position: 'absolute', width: '200%', height: '200%', left: '-50%', top: '-20%', objectFit: 'fill', maxWidth: 'none', maxHeight: 'none' });
  });

  it('applies the focal point as object-position on the front photos', () => {
    render(
      <DataCard
        model={{
          name: 'Oak',
          layout: 'photo-trio',
          photos: [
            { src: 'blob:main', role: 'main', credit: { observer: 'a', license: 'cc0' }, focus: { x: 0.5, y: 0.15 } },
            { src: 'blob:sec', role: 'secondary', credit: { observer: 'b', license: 'cc0' } },
          ],
        }}
        face="front"
      />,
    );

    const images = screen.getAllByTestId('data-photo').map((p) => p.querySelector('img'));
    expect(images[0]).toHaveStyle({ objectPosition: '50% 15%' });
    expect(images[1]).not.toHaveStyle({ objectPosition: '50% 50%' });
  });
});

describe('DataCard back', () => {
  it('renders the full text stack', () => {
    render(<DataCard model={trioModel} face="back" />);

    expect(screen.getByTestId('data-card-title').textContent).toBe('Dwarf Nettle');
    expect(screen.getByTestId('data-card-alt-names').textContent).toBe('aka Burning Nettle');
    expect(screen.getByTestId('data-card-sci-name').textContent).toBe('Urtica urens');
    expect(screen.getByTestId('data-card-family-common').textContent).toBe('Nettle Family');
    expect(screen.getByTestId('data-card-family-latin').textContent).toBe('Urticaceae');
    expect(screen.getByTestId('data-card-native').textContent).toBe('Non-native (Invasive)');
  });

  it('omits optional fields that are absent', () => {
    render(
      <DataCard
        model={{ name: 'Chamise', native: 'native' }}
        face="back"
      />,
    );

    expect(screen.getByTestId('data-card-title').textContent).toBe('Chamise');
    expect(screen.queryByTestId('data-card-alt-names')).not.toBeInTheDocument();
    expect(screen.queryByTestId('data-card-sci-name')).not.toBeInTheDocument();
    expect(screen.queryByTestId('data-card-family-common')).not.toBeInTheDocument();
    expect(screen.getByTestId('data-card-native').textContent).toBe('Native');
    expect(screen.queryByTestId('data-card-rarity')).not.toBeInTheDocument();
  });

  it('labels plain non-native status without the invasive suffix', () => {
    render(<DataCard model={{ name: 'X', native: 'non-native' }} face="back" />);
    expect(screen.getByTestId('data-card-native').textContent).toBe('Non-native');
  });

  it('shows the rarity line when present', () => {
    render(<DataCard model={{ name: 'X', rarity: 'CNPS 1B.1' }} face="back" />);
    expect(screen.getByTestId('data-card-rarity').textContent).toBe('CNPS 1B.1');
  });

  it('applies the invasive border class to the back canvas', () => {
    const { container, rerender } = render(<DataCard model={trioModel} face="back" invasive />);
    expect(screen.getByTestId('data-card-back')).toHaveClass('invasive');
    expect(container.querySelector('.data-card')).toHaveClass('invasive');

    rerender(<DataCard model={trioModel} face="back" />);
    expect(screen.getByTestId('data-card-back')).not.toHaveClass('invasive');
  });

  it('does not apply the invasive border to the front', () => {
    render(<DataCard model={trioModel} face="front" />);
    expect(screen.getByTestId('data-card-front')).not.toHaveClass('invasive');
  });
});
