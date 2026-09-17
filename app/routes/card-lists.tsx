import type { Route } from "./+types/card-lists";
import { useState, useMemo, useRef } from "react";
import { DECK_DEFS, getDeckDef } from "~/data/decks";
import {
  deckFromLocationOrStorage, modesForDeck, modeLabelFor,
  BOTH_MODE, type DeckId, type DeckMode,
} from "~/utils/deckUtils";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Card Lists - Flash Cards" },
    { name: "description", content: "Browse all available flash cards" },
  ];
}

export interface CardItem {
  name: string;
  front: string;
  back: string;
  invasive: boolean;
}

export function cardsForDeck(deck: DeckId, mode: DeckMode): CardItem[] {
  const def = getDeckDef(deck);
  if (!def) return [];
  const categories =
    mode === BOTH_MODE ? def.categories : def.categories.filter((c) => c.id === mode);
  return categories.flatMap((c) =>
    c.cards.map((card) => ({
      name: card.name,
      front: card.front,
      back: card.back,
      invasive: card.invasive,
    })),
  );
}

export default function CardLists() {
  const knownDeckIds = DECK_DEFS.map((d) => d.id);
  const [deck, setDeck] = useState<DeckId>(() =>
    deckFromLocationOrStorage(typeof window !== "undefined" ? window.location.search : "", knownDeckIds));
  const modes = modesForDeck(getDeckDef(deck) ?? DECK_DEFS[0]);
  const [filter, setFilter] = useState<DeckMode>(BOTH_MODE);
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[data-testid="card-item"]') ?? []
    );
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (current === -1) return;
    e.preventDefault();
    const next = e.key === 'ArrowDown' ? current + 1 : current - 1;
    items[next]?.focus();
  };

  const allCards = useMemo(() => {
    const mode = modes.includes(filter) ? filter : BOTH_MODE;
    return cardsForDeck(deck, mode).filter(card => card.name.toLowerCase().includes(search.toLowerCase()));
  }, [deck, filter, search, modes]);

  const changeDeck = (next: DeckId) => {
    setDeck(next);
    if (typeof window !== "undefined") localStorage.setItem("deck", next);
    setFilter(BOTH_MODE);
  };

  return (
    <main className="card-list-main">
      <div className="controls-container">
        <select
          className="menu-button deck-select"
          data-testid="deck-select"
          aria-label="Select deck"
          value={deck}
          onChange={(e) => changeDeck(e.target.value as DeckId)}
        >
          {DECK_DEFS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div className="controls-container">
        {modes.map((m) => (
          <button
            key={m}
            type="button"
            data-testid={`mode-${m}`}
            className={filter === m ? "menu-button active" : "menu-button"}
            onClick={() => setFilter(m)}
          >
            {modeLabelFor(getDeckDef(deck) ?? DECK_DEFS[0], m)}
          </button>
        ))}
        <input
          type="search"
          className="search-input"
          placeholder="Search cards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div
        className="card-list-container"
        data-testid="card-list"
        ref={listRef}
        onKeyDown={handleListKeyDown}
      >
        {allCards.map((card, index) => (
          <button
            key={index}
            className={`card-list-item ${card.invasive ? "invasive" : ""}`}
            data-testid="card-item"
            data-card-name={card.name}
            onClick={() => window.location.href = `/?${deck !== DECK_DEFS[0]?.id ? `deck=${deck}&` : ""}card=${encodeURIComponent(card.name)}`}
          >
            <img
              src={card.front}
              alt={`${card.name} front`}
              className="card-thumbnail"
            />
            <span className="card-name">{card.name}</span>
          </button>
        ))}
      </div>
    </main>
  );
}