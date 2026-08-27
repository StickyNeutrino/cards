import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from '../../app/card/card';

function mockHoverCapability(capable: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: capable && query === '(hover: hover) and (pointer: fine)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
}

describe('Card', () => {
  let mockWidthRef: { current: HTMLDivElement | null };

  beforeEach(() => {
    mockWidthRef = { current: null };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders front and back images with correct sources', () => {
    render(<Card card="Test Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('src', '/cards/Test Card Front.jpg');
    expect(images[1]).toHaveAttribute('src', '/cards/Test Card Back.jpg');
  });

  it('applies invasive class conditionally', () => {
    const { rerender } = render(<Card card="Arundo" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} />);
    expect(screen.getAllByRole('img')[0]).not.toHaveClass('invasive');
    expect(screen.getAllByRole('img')[1]).toHaveClass('invasive');

    rerender(<Card card="White Sage" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} />);
    expect(screen.getAllByRole('img')[0]).not.toHaveClass('invasive');
    expect(screen.getAllByRole('img')[1]).not.toHaveClass('invasive');
  });

  it('applies flipped class conditionally', () => {
    const { rerender } = render(<Card card="Test Card" flipped={true} widthRef={mockWidthRef} flipSpeed={0.8} />);
    expect(screen.getAllByRole('img')[0].parentElement?.parentElement).toHaveClass('flipped');

    rerender(<Card card="Test Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} />);
    expect(screen.getAllByRole('img')[0].parentElement?.parentElement).not.toHaveClass('flipped');
  });

  it('sets ref on card-area div', () => {
    render(<Card card="Test Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} />);

    const cardArea = screen.getAllByRole('img')[0].parentElement?.parentElement?.parentElement;
    expect(cardArea).toBeInTheDocument();
    expect(mockWidthRef.current).toBe(cardArea);
  });

  it('handles special characters in card names', () => {
    render(<Card card="Card with spaces & symbols" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} />);

    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('src', '/cards/Card with spaces & symbols Front.jpg');
    expect(images[1]).toHaveAttribute('src', '/cards/Card with spaces & symbols Back.jpg');
  });

  it('renders with correct CSS classes', () => {
    const { container } = render(<Card card="Test Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} />);

    expect(container.querySelector('.card-area')).toBeInTheDocument();
    expect(container.querySelector('.flip-card')).toBeInTheDocument();
    expect(container.querySelector('.flip-card-inner')).toBeInTheDocument();
    expect(container.querySelector('.flip-card-front')).toBeInTheDocument();
    expect(container.querySelector('.flip-card-back')).toBeInTheDocument();
  });

  it('handles empty card name', () => {
    render(<Card card="" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} />);

    const images = screen.queryAllByRole('img');
    expect(images).toHaveLength(0);
  });

  it('maintains ref after re-renders', () => {
    const { rerender } = render(<Card card="Test Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} />);
    const initialRef = mockWidthRef.current;
    rerender(<Card card="Test Card" flipped={true} widthRef={mockWidthRef} flipSpeed={0.8} />);
    expect(mockWidthRef.current).toBe(initialRef);
  });

  it('handles undefined and null widthRef', () => {
    expect(() => render(<Card card="Test Card" flipped={false} widthRef={undefined as any} flipSpeed={0.8} />)).not.toThrow();
    expect(() => render(<Card card="Test Card" flipped={false} widthRef={null as any} flipSpeed={0.8} />)).not.toThrow();
  });

  it('handles missing image files', () => {
    render(<Card card="Nonexistent Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} />);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('src', '/cards/Nonexistent Card Front.jpg');
    expect(images[1]).toHaveAttribute('src', '/cards/Nonexistent Card Back.jpg');
  });

  it('does not apply flip-card-inner-animated class when flipSpeed is 0', () => {
    const { container } = render(<Card card="Test Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0} />);
    const flipCardInner = container.querySelector('.flip-card-inner');
    expect(flipCardInner).not.toHaveClass('flip-card-inner-animated');
  });

  it('toggles exactly once per tap when touchend is followed by the synthesized click', () => {
    const onClick = vi.fn();
    render(<Card card="Test Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} onClick={onClick} />);
    const card = screen.getByTestId('card');

    fireEvent.touchEnd(card);
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not toggle from touchend alone', () => {
    const onClick = vi.fn();
    render(<Card card="Test Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} onClick={onClick} />);

    fireEvent.touchEnd(screen.getByTestId('card'));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('toggles once per plain click', () => {
    const onClick = vi.fn();
    render(<Card card="Test Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} onClick={onClick} />);
    const card = screen.getByTestId('card');

    fireEvent.click(card);
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('stops click propagation so tapping the card does not trigger ancestor handlers', () => {
    const onClick = vi.fn();
    const ancestorClick = vi.fn();
    render(
      <div onClick={ancestorClick}>
        <Card card="Test Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} onClick={onClick} />
      </div>
    );

    fireEvent.click(screen.getByTestId('card'));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(ancestorClick).not.toHaveBeenCalled();
  });

  it('previews the back face while hovered on hover-capable devices', () => {
    mockHoverCapability(true);
    render(<Card card="Test Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} />);
    const card = screen.getByTestId('card');

    fireEvent.mouseEnter(card);
    expect(card).toHaveAttribute('data-flipped', 'true');

    fireEvent.mouseLeave(card);
    expect(card).toHaveAttribute('data-flipped', 'false');
  });

  it('clears the hover preview on click so the card returns to the front under the pointer', () => {
    mockHoverCapability(true);
    const onClick = vi.fn();
    render(<Card card="Test Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} onClick={onClick} />);
    const card = screen.getByTestId('card');

    fireEvent.mouseEnter(card);
    expect(card).toHaveAttribute('data-flipped', 'true');

    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(card).toHaveAttribute('data-flipped', 'false');
  });

  it('does not preview on hover for devices without a hover-capable pointer', () => {
    mockHoverCapability(false);
    render(<Card card="Test Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} />);
    const card = screen.getByTestId('card');

    fireEvent.mouseEnter(card);
    expect(card).toHaveAttribute('data-flipped', 'false');
  });

  it('clears the hover preview when the card is unflipped by other means such as the keyboard', () => {
    mockHoverCapability(true);
    const { rerender } = render(<Card card="Test Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} />);
    const card = screen.getByTestId('card');

    fireEvent.mouseEnter(card);
    expect(card).toHaveAttribute('data-flipped', 'true');

    rerender(<Card card="Test Card" flipped={true} widthRef={mockWidthRef} flipSpeed={0.8} />);
    expect(card).toHaveAttribute('data-flipped', 'true');

    rerender(<Card card="Test Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} />);
    expect(card).toHaveAttribute('data-flipped', 'false');
  });
});