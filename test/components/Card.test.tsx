import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../../app/card/card';

describe('Card', () => {
  it('renders front and back images', () => {
    const mockWidthRef = { current: null };
    render(<Card card="Test Card" invasive={false} flipped={false} widthRef={mockWidthRef} />);

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);

    const frontImage = images[0];
    const backImage = images[1];

    expect(frontImage).toHaveAttribute('src', '/cards/Test Card Front.png');
    expect(backImage).toHaveAttribute('src', '/cards/Test Card Back.png');
  });

  it('applies invasive class when invasive is true', () => {
    const mockWidthRef = { current: null };
    render(<Card card="Test Card" invasive={true} flipped={false} widthRef={mockWidthRef} />);

    const images = screen.getAllByRole('img');
    const backImage = images[1];
    expect(backImage).toHaveClass('invasive');
  });

  it('does not apply invasive class when invasive is false', () => {
    const mockWidthRef = { current: null };
    render(<Card card="Test Card" invasive={false} flipped={false} widthRef={mockWidthRef} />);

    const images = screen.getAllByRole('img');
    const backImage = images[1];
    expect(backImage).not.toHaveClass('invasive');
  });

  it('applies flipped class when flipped is true', () => {
    const mockWidthRef = { current: null };
    render(<Card card="Test Card" invasive={false} flipped={true} widthRef={mockWidthRef} />);

    const flipCardInner = screen.getAllByRole('img')[0].parentElement?.parentElement;
    expect(flipCardInner).toHaveClass('flipped');
  });

  it('does not apply flipped class when flipped is false', () => {
    const mockWidthRef = { current: null };
    render(<Card card="Test Card" invasive={false} flipped={false} widthRef={mockWidthRef} />);

    const flipCardInner = screen.getAllByRole('img')[0].parentElement?.parentElement;
    expect(flipCardInner).not.toHaveClass('flipped');
  });

  it('sets ref on card-area div', () => {
    const mockWidthRef = { current: null };
    render(<Card card="Test Card" invasive={false} flipped={false} widthRef={mockWidthRef} />);

    const cardArea = screen.getAllByRole('img')[0].parentElement?.parentElement?.parentElement;
    expect(cardArea).toBeInTheDocument();
    expect(mockWidthRef.current).toBe(cardArea);
  });
});