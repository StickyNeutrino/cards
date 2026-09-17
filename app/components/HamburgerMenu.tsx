import { forwardRef } from "react";
import { modeLabelFor, type DeckId, type DeckMode } from "~/utils/deckUtils";
import { DECK_DEFS } from "~/data/decks";

interface HamburgerMenuProps {
  mode: DeckMode;
  deck?: DeckId;
  changeModeClicked: React.MouseEventHandler<HTMLButtonElement>;
  changeDeckClicked?: (deck: DeckId) => void;
  settingsClicked: React.MouseEventHandler<HTMLButtonElement>;
  cardListsClicked: React.MouseEventHandler<HTMLButtonElement>;
  creditsClicked?: React.MouseEventHandler<HTMLButtonElement>;
}

export const HamburgerMenu = forwardRef<HTMLDivElement, HamburgerMenuProps>(({
  mode,
  deck = DECK_DEFS[0]?.id ?? 'canyonlands',
  changeModeClicked,
  changeDeckClicked,
  settingsClicked,
  cardListsClicked,
  creditsClicked,
}, ref) => {
  const activeDef = DECK_DEFS.find((d) => d.id === deck) ?? DECK_DEFS[0];
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
        onChange={(e) => changeDeckClicked?.(e.target.value as DeckId)}
      >
        {DECK_DEFS.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>
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
    </div>
  );
})

HamburgerMenu.displayName = 'HamburgerMenu';