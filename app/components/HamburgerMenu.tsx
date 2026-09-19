import { forwardRef, useEffect, useState } from "react";
import { modeLabelFor, type DeckId, type DeckMode } from "~/utils/deckUtils";
import { DECK_DEFS, type DeckDef } from "~/data/decks";

export type DeckUploadState = {
  status: 'idle' | 'importing' | 'success' | 'error';
  message?: string;
};

interface HamburgerMenuProps {
  mode: DeckMode;
  deck?: DeckId;
  /** Every deck offered in the dropdown (built-ins + uploaded); defaults to the built-in registry. */
  decks?: DeckDef[];
  changeModeClicked: React.MouseEventHandler<HTMLButtonElement>;
  changeDeckClicked?: (deck: DeckId) => void;
  /** Called with the chosen .zip file; import, feedback, and switching are the parent's job. */
  uploadDeckClicked?: (file: File) => void;
  uploadState?: DeckUploadState;
  /** Called once the in-menu confirm has been clicked; only uploaded decks show the affordance. */
  deleteDeckClicked?: (deck: DeckId) => void;
  settingsClicked: React.MouseEventHandler<HTMLButtonElement>;
  cardListsClicked: React.MouseEventHandler<HTMLButtonElement>;
  creditsClicked?: React.MouseEventHandler<HTMLButtonElement>;
}

export const HamburgerMenu = forwardRef<HTMLDivElement, HamburgerMenuProps>(({
  mode,
  deck = DECK_DEFS[0]?.id ?? 'canyonlands',
  decks,
  changeModeClicked,
  changeDeckClicked,
  uploadDeckClicked,
  uploadState,
  deleteDeckClicked,
  settingsClicked,
  cardListsClicked,
  creditsClicked,
}, ref) => {
  const deckList = decks ?? DECK_DEFS;
  const activeDef = deckList.find((d) => d.id === deck) ?? deckList[0];

  // Deleting is a two-step inline confirm so it works without native dialogs.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  useEffect(() => {
    setConfirmingDelete(false);
  }, [deck]);

  const importing = uploadState?.status === 'importing';
  return (
    <div className="hamburger-menu" ref={ref}>
      <button onClick={changeModeClicked} className="menu-button" data-testid="mode-button">
        {activeDef ? modeLabelFor(activeDef, mode) : mode}
      </button>
      <select
        className="menu-button ml-2 deck-select"
        data-testid="deck-select"
        aria-label="Select deck"
        value={deck}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => { setConfirmingDelete(false); changeDeckClicked?.(e.target.value as DeckId); }}
      >
        {deckList.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}{d.uploaded ? ' (uploaded)' : ''}
          </option>
        ))}
      </select>
      {deleteDeckClicked && activeDef?.uploaded && (
        confirmingDelete ? (
          <>
            <button
              className="menu-button ml-2 danger"
              data-testid="delete-deck-confirm"
              title="Really delete this deck"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmingDelete(false);
                deleteDeckClicked(deck);
              }}
            >
              🗑 Delete “{activeDef.label}”?
            </button>
            <button
              className="menu-button ml-2"
              data-testid="delete-deck-cancel"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmingDelete(false);
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            className="menu-button ml-2"
            data-testid="delete-deck-button"
            title={`Delete ${activeDef.label}`}
            onClick={(e) => {
              e.stopPropagation();
              setConfirmingDelete(true);
            }}
          >
            🗑
          </button>
        )
      )}
      {uploadDeckClicked && (
        <label
          className={`menu-button ml-2${importing ? ' importing' : ''}`}
          data-testid="upload-deck-button"
          title="Upload a deck .zip exported by Deck Curator"
        >
          {importing ? '⏳ Importing…' : '⬆️ Upload deck (.zip)…'}
          <input
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            className="upload-input"
            data-testid="upload-deck-input"
            disabled={importing}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadDeckClicked(file);
              e.target.value = '';
            }}
          />
        </label>
      )}
      <button
        onClick={cardListsClicked}
        className="menu-button ml-2"
        title="Card Lists"
      >
        📋 Card List
      </button>
      <button
        onClick={creditsClicked}
        className="menu-button ml-2"
        title="Photo Credits"
        data-testid="credits-button"
      >
        🖼️ Credits
      </button>
      <button
        onClick={settingsClicked}
        className="menu-button ml-2"
        title="Settings"
      >
        <img src="/gear-solid-full.svg" style={{height: "1.5em"}}/>
      </button>
      {uploadState && (uploadState.status === 'success' || uploadState.status === 'error') && (
        <div className={`upload-status ${uploadState.status}`} data-testid="upload-status" role="status">
          {uploadState.status === 'success' ? '✅ ' : '⚠️ '}{uploadState.message}
        </div>
      )}
    </div>
  );
})

HamburgerMenu.displayName = 'HamburgerMenu';
