import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../../app/card/card';

describe('Card', () => {
  let mockWidthRef: { current: HTMLDivElement | null };

  beforeEach(() => {
    mockWidthRef = { current: null };
  });

  it('renders front and back images', () => {
    render(<Card card="Test Card" invasive={false} flipped={false} widthRef={mockWidthRef} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);

    const frontImage = images[0];
    const backImage = images[1];

    expect(frontImage).toHaveAttribute('src', '/cards/Test Card Front.png');
    expect(backImage).toHaveAttribute('src', '/cards/Test Card Back.png');
  });

  it('applies invasive class when invasive is true', () => {
    render(<Card card="Test Card" invasive={true} flipped={false} widthRef={mockWidthRef} />);

    const images = screen.getAllByRole('img');
    const backImage = images[1];
    expect(backImage).toHaveClass('invasive');
  });

  it('does not apply invasive class when invasive is false', () => {
    render(<Card card="Test Card" invasive={false} flipped={false} widthRef={mockWidthRef} />);

    const images = screen.getAllByRole('img');
    const backImage = images[1];
    expect(backImage).not.toHaveClass('invasive');
  });

  it('applies flipped class when flipped is true', () => {
    render(<Card card="Test Card" invasive={false} flipped={true} widthRef={mockWidthRef} />);

    const flipCardInner = screen.getAllByRole('img')[0].parentElement?.parentElement;
    expect(flipCardInner).toHaveClass('flipped');
  });

  it('does not apply flipped class when flipped is false', () => {
    render(<Card card="Test Card" invasive={false} flipped={false} widthRef={mockWidthRef} />);

    const flipCardInner = screen.getAllByRole('img')[0].parentElement?.parentElement;
    expect(flipCardInner).not.toHaveClass('flipped');
  });

  it('sets ref on card-area div', () => {
    render(<Card card="Test Card" invasive={false} flipped={false} widthRef={mockWidthRef} />);

    const cardArea = screen.getAllByRole('img')[0].parentElement?.parentElement?.parentElement;
    expect(cardArea).toBeInTheDocument();
    expect(mockWidthRef.current).toBe(cardArea);
  });

  it('handles special characters in card names', () => {
    render(<Card card="Card with spaces & symbols" invasive={false} flipped={false} widthRef={mockWidthRef} />);

    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('src', '/cards/Card with spaces & symbols Front.png');
    expect(images[1]).toHaveAttribute('src', '/cards/Card with spaces & symbols Back.png');
  });

  it('renders with correct CSS classes', () => {
    const { container } = render(<Card card="Test Card" invasive={false} flipped={false} widthRef={mockWidthRef} />);

    expect(container.querySelector('.card-area')).toBeInTheDocument();
    expect(container.querySelector('.flip-card')).toBeInTheDocument();
    expect(container.querySelector('.flip-card-inner')).toBeInTheDocument();
    expect(container.querySelector('.flip-card-front')).toBeInTheDocument();
    expect(container.querySelector('.flip-card-back')).toBeInTheDocument();
  });

  it('handles empty card name gracefully', () => {
    render(<Card card="" invasive={false} flipped={false} widthRef={mockWidthRef} />);

    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('src', '/cards/ Front.png');
    expect(images[1]).toHaveAttribute('src', '/cards/ Back.png');
  });

  it('maintains ref after re-renders', () => {
    const { rerender } = render(<Card card="Test Card" invasive={false} flipped={false} widthRef={mockWidthRef} />);

    const initialRef = mockWidthRef.current;

    rerender(<Card card="Test Card" invasive={true} flipped={true} widthRef={mockWidthRef} />);

    expect(mockWidthRef.current).toBe(initialRef);
  });
});