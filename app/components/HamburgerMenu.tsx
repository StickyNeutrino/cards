import { forwardRef } from "react";

interface HamburgerMenuProps {
  mode: 'plants' | 'birds' | 'both';
  toggleMode: () => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
}

export const HamburgerMenu = forwardRef<HTMLDivElement, HamburgerMenuProps>(({ mode, toggleMode, showSettings, setShowSettings }, ref) => {
  return (
    <div className="hamburger-menu">
      <button onClick={(e) => { e.stopPropagation(); toggleMode(); }} className="menu-button">
        {mode === 'plants' ? "🌿 Plants" : mode === 'birds' ? "🐦 Birds" : "🌿🐦 Both"}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setShowSettings(!showSettings);
        }}
        className="menu-button ml-2"
        title="Settings"
      >
        <img src="/gear-solid-full.svg" style={{height: "1.5em"}}/>
      </button>
    </div>
  );
})