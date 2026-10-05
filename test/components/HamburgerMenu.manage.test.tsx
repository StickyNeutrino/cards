import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { HamburgerMenu } from '../../app/components/HamburgerMenu';
import { MANAGE_DECKS_OPTION } from '../../app/utils/deckUtils';
import type { DeckDef } from '../../app/data/decks';

const uploadedDeck: DeckDef = {
  id: 'curated-canyon',
  label: '🌿 My Curated Deck',
  description: '',
  cardFormat: 'data',
  uploaded: true,
  categories: [{ id: 'plants', label: '🌿 Plants', cards: [] }],
};

const defaultProps = {
  mode: 'plants' as const,
  deck: 'canyonlands' as const,
  changeModeClicked: vi.fn(),
  changeDeckClicked: vi.fn(),
  settingsClicked: vi.fn(),
  cardListsClicked: vi.fn(),
};

describe('HamburgerMenu manage decks affordance', () => {
  it('appends a Manage decks entry to the dropdown and calls manageDecksClicked when picked', () => {
    const manageDecksClicked = vi.fn();
    render(<HamburgerMenu {...defaultProps} manageDecksClicked={manageDecksClicked} />);

    const select = screen.getByTestId('deck-select');
    const manageOption = within(select).getByRole('option', { name: /Manage decks/ }) as HTMLOptionElement;
    expect(manageOption.value).toBe(MANAGE_DECKS_OPTION);

    fireEvent.change(select, { target: { value: MANAGE_DECKS_OPTION } });
    expect(manageDecksClicked).toHaveBeenCalledTimes(1);
    // No deck switch happened.
    expect(defaultProps.changeDeckClicked).not.toHaveBeenCalled();
  });

  it('snaps the dropdown back to the active deck when the manage entry is picked', () => {
    render(<HamburgerMenu {...defaultProps} manageDecksClicked={vi.fn()} />);

    const select = screen.getByTestId('deck-select');
    fireEvent.change(select, { target: { value: MANAGE_DECKS_OPTION } });
    expect(select).toHaveValue('canyonlands');
  });

  it('omits the manage entry when no handler is provided', () => {
    render(<HamburgerMenu {...defaultProps} />);
    expect(screen.queryByRole('option', { name: /Manage decks/ })).not.toBeInTheDocument();
  });

  it('marks uploaded decks in the dropdown', () => {
    render(<HamburgerMenu {...defaultProps} decks={[uploadedDeck]} deck="curated-canyon" />);
    const select = screen.getByTestId('deck-select');
    const option = within(select).getByRole('option', { name: /My Curated Deck/ }) as HTMLOptionElement;
    expect(option.textContent).toContain('(uploaded)');
    expect(option.value).toBe('curated-canyon');
  });

  it('never renders upload or delete controls (they live on the manage decks page)', () => {
    render(
      <HamburgerMenu
        {...defaultProps}
        deck="curated-canyon"
        decks={[uploadedDeck]}
        manageDecksClicked={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('upload-deck-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('upload-deck-input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-deck-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('upload-status')).not.toBeInTheDocument();
  });
});