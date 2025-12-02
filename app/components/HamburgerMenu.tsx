import { forwardRef } from "react";

interface HamburgerMenuProps {
  mode: 'plants' | 'birds' | 'both';
  changeModeClicked: React.MouseEventHandler<HTMLButtonElement>;
  settingsClicked: React.MouseEventHandler<HTMLButtonElement>;
  cardListsClicked: React.MouseEventHandler<HTMLButtonElement>;
}

export const HamburgerMenu = forwardRef<HTMLDivElement, HamburgerMenuProps>(({ mode, changeModeClicked, settingsClicked, cardListsClicked }, ref) => {
  return (
    <div className="hamburger-menu" ref={ref}>
      <button onClick={changeModeClicked} className="menu-button">
        {mode === 'plants' ? "🌿 Plants" : mode === 'birds' ? "🐦 Birds" : "🌿🐦 Both"}
      </button>
      <button
        onClick={cardListsClicked}
        className="menu-button ml-2"
        title="Card Lists"
      >
        📋 Card Lists
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