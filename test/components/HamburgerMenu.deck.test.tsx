import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
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

  it('renders a deck dropdown with both decks and the active deck selected', () => {
    render(<HamburgerMenu {...defaultProps} />);

    const select = screen.getByTestId('deck-select');
    expect(select).toHaveValue('canyonlands');
    const options = within(select).getAllByRole('option') as HTMLOptionElement[];
    expect(options.map((o) => o.value)).toEqual(['canyonlands', 'healthy-canyons']);
    expect(options[0]).toHaveTextContent('Canyonlands');
    expect(options[1]).toHaveTextContent('Healthy Canyons');
  });

  it('shows the healthy deck as selected when it is active', () => {
    render(<HamburgerMenu {...defaultProps} deck="healthy-canyons" />);

    expect(screen.getByTestId('deck-select')).toHaveValue('healthy-canyons');
  });

  it('calls changeDeckClicked with the chosen deck', () => {
    const changeDeckClicked = vi.fn();
    render(<HamburgerMenu {...defaultProps} changeDeckClicked={changeDeckClicked} />);

    fireEvent.change(screen.getByTestId('deck-select'), { target: { value: 'healthy-canyons' } });
    expect(changeDeckClicked).toHaveBeenCalledWith('healthy-canyons');

    fireEvent.change(screen.getByTestId('deck-select'), { target: { value: 'canyonlands' } });
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