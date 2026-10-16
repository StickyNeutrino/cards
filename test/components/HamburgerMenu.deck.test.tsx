import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { HamburgerMenu } from '../../app/components/HamburgerMenu';

// HamburgerMenu reads the real deck registry (app/data/decks.ts):
// canyonlands (🏔 Canyonlands; plants, birds) is the only bundled deck —
// uploaded decks are appended by callers that have them.
describe('HamburgerMenu deck picker', () => {
  const defaultProps = {
    mode: 'plants' as const,
    deck: 'canyonlands' as const,
    changeModeClicked: vi.fn(),
    changeDeckClicked: vi.fn(),
    settingsClicked: vi.fn(),
    cardListsClicked: vi.fn(),
  };

  it('renders a deck dropdown with the bundled deck selected', () => {
    render(<HamburgerMenu {...defaultProps} />);

    const select = screen.getByTestId('deck-select');
    expect(select).toHaveValue('canyonlands');
    const options = within(select).getAllByRole('option') as HTMLOptionElement[];
    expect(options.map((o) => o.value)).toEqual(['canyonlands']);
    expect(options[0]).toHaveTextContent('Canyonlands');
  });

  it('calls changeDeckClicked with the chosen deck', () => {
    const changeDeckClicked = vi.fn();
    render(<HamburgerMenu {...defaultProps} changeDeckClicked={changeDeckClicked} />);

    fireEvent.change(screen.getByTestId('deck-select'), { target: { value: 'canyonlands' } });
    expect(changeDeckClicked).toHaveBeenCalledWith('canyonlands');
  });

  it('labels the mode button per deck', () => {
    const { rerender } = render(<HamburgerMenu {...defaultProps} deck="canyonlands" mode="birds" />);
    expect(screen.getByTestId('mode-button').textContent).toBe('🐦 Birds');

    rerender(<HamburgerMenu {...defaultProps} deck="canyonlands" mode="both" />);
    expect(screen.getByTestId('mode-button').textContent).toBe('🌿🐦 Both');
  });

  it('keeps the mode button working alongside the deck buttons', () => {
    const changeModeClicked = vi.fn();
    render(<HamburgerMenu {...defaultProps} changeModeClicked={changeModeClicked} />);

    fireEvent.click(screen.getByTestId('mode-button'));
    expect(changeModeClicked).toHaveBeenCalledTimes(1);
  });
});
