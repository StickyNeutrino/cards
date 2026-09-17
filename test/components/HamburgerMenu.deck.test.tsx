import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HamburgerMenu } from '../../app/components/HamburgerMenu';

// HamburgerMenu reads the real deck registry (app/data/decks.json):
// canyonlands (🏔 Canyonlands; birds, plants) and healthy-canyons (🌿 Healthy Canyons).
describe('HamburgerMenu deck picker', () => {
  const defaultProps = {
    mode: 'plants' as const,
    deck: 'canyonlands' as const,
    changeModeClicked: vi.fn(),
    changeDeckClicked: vi.fn(),
    settingsClicked: vi.fn(),
    cardListsClicked: vi.fn(),
    creditsClicked: vi.fn(),
  };

  it('renders both deck buttons with the active deck highlighted', () => {
    render(<HamburgerMenu {...defaultProps} />);

    const canyonlands = screen.getByTestId('deck-button-canyonlands');
    const healthy = screen.getByTestId('deck-button-healthy-canyons');
    expect(canyonlands).toHaveClass('active');
    expect(healthy).not.toHaveClass('active');
    expect(canyonlands).toHaveTextContent('Canyonlands');
    expect(healthy).toHaveTextContent('Healthy Canyons');
  });

  it('highlights the healthy deck when it is active', () => {
    render(<HamburgerMenu {...defaultProps} deck="healthy-canyons" />);

    expect(screen.getByTestId('deck-button-healthy-canyons')).toHaveClass('active');
    expect(screen.getByTestId('deck-button-canyonlands')).not.toHaveClass('active');
  });

  it('calls changeDeckClicked with the target deck', () => {
    const changeDeckClicked = vi.fn();
    render(<HamburgerMenu {...defaultProps} changeDeckClicked={changeDeckClicked} />);

    fireEvent.click(screen.getByTestId('deck-button-healthy-canyons'));
    expect(changeDeckClicked).toHaveBeenCalledWith('healthy-canyons');

    fireEvent.click(screen.getByTestId('deck-button-canyonlands'));
    expect(changeDeckClicked).toHaveBeenCalledWith('canyonlands');
  });

  it('labels the mode button per deck', () => {
    const { rerender } = render(<HamburgerMenu {...defaultProps} deck="healthy-canyons" mode="animals" />);
    expect(screen.getByTestId('mode-button').textContent).toBe('🦎 Animals');

    rerender(<HamburgerMenu {...defaultProps} deck="healthy-canyons" mode="both" />);
    expect(screen.getByTestId('mode-button').textContent).toBe('🌿🦎 Both');
  });

  it('renders a credits button that calls creditsClicked', () => {
    const creditsClicked = vi.fn();
    render(<HamburgerMenu {...defaultProps} creditsClicked={creditsClicked} />);

    fireEvent.click(screen.getByTestId('credits-button'));
    expect(creditsClicked).toHaveBeenCalledTimes(1);
  });

  it('keeps the mode button working alongside the deck buttons', () => {
    const changeModeClicked = vi.fn();
    render(<HamburgerMenu {...defaultProps} changeModeClicked={changeModeClicked} />);

    fireEvent.click(screen.getByTestId('mode-button'));
    expect(changeModeClicked).toHaveBeenCalledTimes(1);
  });
});