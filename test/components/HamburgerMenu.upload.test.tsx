import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { HamburgerMenu } from '../../app/components/HamburgerMenu';
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
  creditsClicked: vi.fn(),
};

describe('HamburgerMenu upload/delete affordances', () => {
  it('offers an upload control with a hidden .zip file input', () => {
    const uploadDeckClicked = vi.fn();
    render(<HamburgerMenu {...defaultProps} uploadDeckClicked={uploadDeckClicked} />);

    const label = screen.getByTestId('upload-deck-button');
    expect(label).toHaveTextContent('Upload deck (.zip)…');
    const input = screen.getByTestId('upload-deck-input') as HTMLInputElement;
    expect(input).toHaveAttribute('accept', '.zip,application/zip,application/x-zip-compressed');
    expect(input.closest('label')).toBe(label);
  });

  it('hands the chosen file to uploadDeckClicked and clears the input', () => {
    const uploadDeckClicked = vi.fn();
    render(<HamburgerMenu {...defaultProps} uploadDeckClicked={uploadDeckClicked} />);

    const input = screen.getByTestId('upload-deck-input') as HTMLInputElement;
    const file = new File(['PK'], 'my-deck.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(uploadDeckClicked).toHaveBeenCalledWith(file);
    expect(input.value).toBe('');
  });

  it('ignores a change event with no file', () => {
    const uploadDeckClicked = vi.fn();
    render(<HamburgerMenu {...defaultProps} uploadDeckClicked={uploadDeckClicked} />);
    fireEvent.change(screen.getByTestId('upload-deck-input'), { target: { files: [] } });
    expect(uploadDeckClicked).not.toHaveBeenCalled();
  });

  it('shows a spinner label while importing and the status chip afterwards', () => {
    const { rerender } = render(
      <HamburgerMenu {...defaultProps} uploadDeckClicked={vi.fn()} uploadState={{ status: 'importing' }} />,
    );
    expect(screen.getByTestId('upload-deck-button')).toHaveTextContent('Importing');
    expect(screen.queryByTestId('upload-status')).not.toBeInTheDocument();

    rerender(
      <HamburgerMenu
        {...defaultProps}
        uploadDeckClicked={vi.fn()}
        uploadState={{ status: 'success', message: 'Imported “🌿 My Deck”' }}
      />,
    );
    const status = screen.getByTestId('upload-status');
    expect(status).toHaveTextContent('Imported “🌿 My Deck”');
    expect(status).toHaveClass('success');

    rerender(
      <HamburgerMenu
        {...defaultProps}
        uploadDeckClicked={vi.fn()}
        uploadState={{ status: 'error', message: 'manifest.json is missing' }}
      />,
    );
    expect(screen.getByTestId('upload-status')).toHaveTextContent('manifest.json is missing');
    expect(screen.getByTestId('upload-status')).toHaveClass('error');
  });

  it('marks uploaded decks in the dropdown', () => {
    render(<HamburgerMenu {...defaultProps} decks={[uploadedDeck]} deck="curated-canyon" />);
    const select = screen.getByTestId('deck-select');
    const option = within(select).getByRole('option', { name: /My Curated Deck/ }) as HTMLOptionElement;
    expect(option.textContent).toContain('(uploaded)');
    expect(option.value).toBe('curated-canyon');
  });

  it('shows the delete affordance only for the active uploaded deck, with a two-step confirm', () => {
    const deleteDeckClicked = vi.fn();
    const { rerender } = render(
      <HamburgerMenu
        {...defaultProps}
        deck="curated-canyon"
        decks={[uploadedDeck]}
        deleteDeckClicked={deleteDeckClicked}
      />,
    );

    // First click arms the confirm; nothing deleted yet.
    fireEvent.click(screen.getByTestId('delete-deck-button'));
    expect(deleteDeckClicked).not.toHaveBeenCalled();
    expect(screen.getByTestId('delete-deck-confirm')).toHaveTextContent('Delete “🌿 My Curated Deck”?');

    // Cancel disarms.
    fireEvent.click(screen.getByTestId('delete-deck-cancel'));
    expect(screen.queryByTestId('delete-deck-confirm')).not.toBeInTheDocument();

    // Second round: confirm deletes.
    fireEvent.click(screen.getByTestId('delete-deck-button'));
    fireEvent.click(screen.getByTestId('delete-deck-confirm'));
    expect(deleteDeckClicked).toHaveBeenCalledWith('curated-canyon');
  });

  it('does not show the delete affordance for built-in decks', () => {
    const canyonlands: DeckDef = {
      id: 'canyonlands', label: 'Canyonlands', description: '',
      categories: [{ id: 'plants', label: '🌿 Plants', cards: [] }],
    };
    render(
      <HamburgerMenu
        {...defaultProps}
        deck="canyonlands"
        decks={[canyonlands, uploadedDeck]}
        deleteDeckClicked={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('delete-deck-button')).not.toBeInTheDocument();
  });

  it('does not show upload or delete controls when the parent does not handle them', () => {
    render(<HamburgerMenu {...defaultProps} decks={[uploadedDeck]} deck="curated-canyon" />);
    expect(screen.queryByTestId('upload-deck-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-deck-button')).not.toBeInTheDocument();
  });
});
