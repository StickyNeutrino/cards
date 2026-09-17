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
      {DECK_DEFS.map((d) => (
        <button
          key={d.id}
          onClick={(e) => { e.stopPropagation(); changeDeckClicked?.(d.id); }}
          className={d.id === deck ? "menu-button active" : "menu-button"}
          data-testid={`deck-button-${d.id}`}
          title={d.id === deck ? "Current deck" : "Switch deck"}
        >
          {d.label}
        </button>
      ))}
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