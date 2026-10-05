import { forwardRef } from "react";
import { modeLabelFor, type DeckId, type DeckMode, MANAGE_DECKS_OPTION } from "~/utils/deckUtils";
import { DECK_DEFS, type DeckDef } from "~/data/decks";

interface HamburgerMenuProps {
  mode: DeckMode;
  deck?: DeckId;
  /** Every deck offered in the dropdown (built-ins + uploaded); defaults to the built-in registry. */
  decks?: DeckDef[];
  changeModeClicked: React.MouseEventHandler<HTMLButtonElement>;
  changeDeckClicked?: (deck: DeckId) => void;
  /** Called when the "Manage decks…" dropdown entry is picked; uploading and
   *  deleting decks live on the manage decks page (/decks), not in this menu. */
  manageDecksClicked?: () => void;
  settingsClicked: React.MouseEventHandler<HTMLButtonElement>;
  cardListsClicked: React.MouseEventHandler<HTMLButtonElement>;
}

export const HamburgerMenu = forwardRef<HTMLDivElement, HamburgerMenuProps>(({
  mode,
  deck = DECK_DEFS[0]?.id ?? 'canyonlands',
  decks,
  changeModeClicked,
  changeDeckClicked,
  manageDecksClicked,
  settingsClicked,
  cardListsClicked,
}, ref) => {
  const deckList = decks ?? DECK_DEFS;
  const activeDef = deckList.find((d) => d.id === deck) ?? deckList[0];

  const changeDeck = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (next === MANAGE_DECKS_OPTION) {
      // Not a deck: snap the dropdown back to the active deck and open the
      // manage decks page instead.
      e.target.value = deck;
      manageDecksClicked?.();
      return;
    }
    changeDeckClicked?.(next as DeckId);
  };

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
        onChange={changeDeck}
      >
        {deckList.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}{d.uploaded ? ' (uploaded)' : ''}
          </option>
        ))}
        {manageDecksClicked && (
          <option value={MANAGE_DECKS_OPTION}>⚙️ Manage decks…</option>
        )}
      </select>
      <button
        onClick={cardListsClicked}
        className="menu-button ml-2"
        title="Card Lists"
      >
        📋 Card List
      </button>
      <button
        onClick={settingsClicked}
        className="menu-button ml-2"
        title="Settings"
      >
        <img src="/gear-solid-full.svg" style={{height: "1.5em"}}/>
      </button>
    </div>
  );
})

HamburgerMenu.displayName = 'HamburgerMenu';