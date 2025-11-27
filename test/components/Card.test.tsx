import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../../app/card/card';

describe('Card', () => {
  let mockWidthRef: { current: HTMLDivElement | null };

  beforeEach(() => {
    mockWidthRef = { current: null };
  });

  it('renders front and back images with correct sources', () => {
    render(<Card card="Test Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0.8} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('src', '/cards/Test Card Front.png');
    expect(images[1]).toHaveAttribute('src', '/cards/Test Card Back.png');
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
    expect(images[0]).toHaveAttribute('src', '/cards/Card with spaces & symbols Front.png');
    expect(images[1]).toHaveAttribute('src', '/cards/Card with spaces & symbols Back.png');
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
    expect(images[0]).toHaveAttribute('src', '/cards/Nonexistent Card Front.png');
    expect(images[1]).toHaveAttribute('src', '/cards/Nonexistent Card Back.png');
  });

  it('does not apply flip-card-inner-animated class when flipSpeed is 0', () => {
    const { container } = render(<Card card="Test Card" flipped={false} widthRef={mockWidthRef} flipSpeed={0} />);
    const flipCardInner = container.querySelector('.flip-card-inner');
    expect(flipCardInner).not.toHaveClass('flip-card-inner-animated');
  });
});