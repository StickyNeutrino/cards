import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from '../../app/card/card';
import type { DataCardModel } from '../../app/card/dataCard';

// How data-driven cards ride inside the existing flip-card: same DOM wrapper
// (card-area → flip-card → flip-card-inner → two absolutely-positioned faces),
// same data-testid/attributes, but HTML faces instead of <img> elements.

const model: DataCardModel = {
  name: 'Dwarf Nettle',
  layout: 'photo-trio',
  photos: [
    { src: 'blob:main', role: 'main', credit: { observer: 'joodles', license: 'cc-by-nc' } },
    { src: 'blob:s1', role: 'secondary', credit: { observer: 'l', license: 'cc0' } },
    { src: 'blob:s2', role: 'secondary', credit: { observer: 's', license: 'cc0' } },
  ],
  sciName: 'Urtica urens',
};

describe('Card with a data-driven card (dataCard prop)', () => {
  let widthRef: { current: HTMLImageElement | null };

  beforeEach(() => {
    widthRef = { current: null };
  });

  it('renders HTML faces instead of <img> elements inside the flip-card', () => {
    const { container } = render(
      <Card card="Dwarf Nettle" flipped={false} widthRef={widthRef} flipSpeed={0.8} dataCard={model} />,
    );

    // Same wrapper structure and classes as image cards.
    expect(container.querySelector('.card-area')).toBeInTheDocument();
    expect(container.querySelector('.flip-card')).toBeInTheDocument();
    expect(container.querySelector('.flip-card-inner')).toBeInTheDocument();
    expect(screen.getByTestId('card')).toHaveAttribute('data-card', 'Dwarf Nettle');
    expect(screen.getByTestId('card')).toHaveAttribute('data-flipped', 'false');

    // Faces are divs carrying the same flip-card classes (plus data-face).
    const front = container.querySelector('.flip-card-front');
    const back = container.querySelector('.flip-card-back');
    expect(front?.tagName).toBe('DIV');
    expect(back?.tagName).toBe('DIV');
    expect(front).toHaveClass('data-face');
    expect(back).toHaveClass('data-face');

    // No <img> at the face level; the photos live inside the canvas.
    expect(screen.queryAllByRole('img')).toHaveLength(3);
    expect(screen.getByTestId('data-card-front')).toBeInTheDocument();
    expect(screen.getByTestId('data-card-back')).toBeInTheDocument();
  });

  it('flips via the same mechanism when clicked', () => {
    const onClick = vi.fn();
    render(<Card card="Dwarf Nettle" flipped={false} widthRef={widthRef} flipSpeed={0.8} onClick={onClick} dataCard={model} />);

    fireEvent.click(screen.getByTestId('card'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows the flipped state on the card area attribute', () => {
    const { rerender } = render(
      <Card card="Dwarf Nettle" flipped={true} widthRef={widthRef} flipSpeed={0.8} dataCard={model} />,
    );
    expect(screen.getByTestId('card')).toHaveAttribute('data-flipped', 'true');

    rerender(<Card card="Dwarf Nettle" flipped={false} widthRef={widthRef} flipSpeed={0.8} dataCard={model} />);
    expect(screen.getByTestId('card')).toHaveAttribute('data-flipped', 'false');
  });

  it('attaches widthRef to the back canvas so the button row can match its width', () => {
    render(<Card card="Dwarf Nettle" flipped={false} widthRef={widthRef} flipSpeed={0.8} dataCard={model} />);
    expect(widthRef.current).toBe(screen.getByTestId('data-card-back'));
  });

  it('applies the invasive border on the back canvas via the invasive prop', () => {
    const { rerender } = render(
      <Card card="Dwarf Nettle" flipped={false} widthRef={widthRef} flipSpeed={0.8} dataCard={model} invasive={true} />,
    );
    expect(screen.getByTestId('data-card-back')).toHaveClass('invasive');

    rerender(<Card card="Dwarf Nettle" flipped={false} widthRef={widthRef} flipSpeed={0.8} dataCard={model} invasive={false} />);
    expect(screen.getByTestId('data-card-back')).not.toHaveClass('invasive');
  });

  it('still renders image cards as <img> faces when dataCard is absent', () => {
    render(<Card card="Test Card" flipped={false} widthRef={widthRef} flipSpeed={0.8} front="/f.jpg" back="/b.jpg" />);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveClass('flip-card-front');
    expect(images[1]).toHaveClass('flip-card-back');
    expect(screen.queryByTestId('data-card-front')).not.toBeInTheDocument();
  });
});
