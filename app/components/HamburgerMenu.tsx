import { forwardRef } from "react";
import { deckLabel, DECKS, modeLabelFor, type DeckId, type DeckMode } from "~/utils/deckUtils";

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
  deck = "canyonlands",
  changeModeClicked,
  changeDeckClicked,
  settingsClicked,
  cardListsClicked,
  creditsClicked,
}, ref) => {
  return (
    <div className="hamburger-menu" ref={ref}>
      <button onClick={changeModeClicked} className="menu-button" data-testid="mode-button">
        {modeLabelFor(deck, mode)}
      </button>
      {DECKS.map((d) => (
        <button
          key={d}
          onClick={(e) => { e.stopPropagation(); changeDeckClicked?.(d); }}
          className={d === deck ? "menu-button active" : "menu-button"}
          data-testid={`deck-button-${d}`}
          title={d === deck ? "Current deck" : "Switch deck"}
        >
          {deckLabel[d]}
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