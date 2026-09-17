import type { Route } from "./+types/card-lists";
import { useState, useMemo, useRef } from "react";
import { birds, plants, invasives } from "~/data/canyonlands";
import { healthyPlants, healthyAnimals, type HealthyCard } from "~/data/healthyCards";
import { deckFromLocationOrStorage, deckLabel, DECKS, modeLabelFor, modesForDeck, type DeckId, type DeckMode } from "~/utils/deckUtils";

// Re-exported for backwards compatibility (tests and other modules import from here).
export { birds, plants, invasives };

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
  const healthyIsInvasive = (c: HealthyCard) => c.native === "non-native";
  if (deck === "healthy") {
    const plantItems = healthyPlants.map((c) => ({
      name: c.name,
      front: c.front,
      back: c.back,
      invasive: healthyIsInvasive(c),
    }));
    const animalItems = healthyAnimals.map((c) => ({
      name: c.name,
      front: c.front,
      back: c.back,
      invasive: healthyIsInvasive(c),
    }));
    if (mode === "plants") return plantItems;
    if (mode === "animals") return animalItems;
    return [...plantItems, ...animalItems];
  }
  const plantItems = plants.map((c) => ({
    name: c.name,
    front: `/cards/${c.front}`,
    back: `/cards/${c.back}`,
    invasive: invasives.includes(c.name),
  }));
  const birdItems = birds.map((c) => ({
    name: c.name,
    front: `/cards/${c.front}`,
    back: `/cards/${c.back}`,
    invasive: invasives.includes(c.name),
  }));
  if (mode === "plants") return plantItems;
  if (mode === "birds") return birdItems;
  return [...birdItems, ...plantItems]; // original page showed birds first
}

export default function CardLists() {
  const [deck, setDeck] = useState<DeckId>(() => deckFromLocationOrStorage(typeof window !== "undefined" ? window.location.search : ""));
  const modes = modesForDeck(deck);
  const [filter, setFilter] = useState<DeckMode>("both");
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
    const mode = modes.includes(filter) ? filter : "both";
    return cardsForDeck(deck, mode).filter(card => card.name.toLowerCase().includes(search.toLowerCase()));
  }, [deck, filter, search, modes]);

  const changeDeck = (next: DeckId) => {
    setDeck(next);
    if (typeof window !== "undefined") localStorage.setItem("deck", next);
    setFilter("both");
  };

  return (
    <main className="card-list-main">
      <div className="controls-container">
        {DECKS.map((d) => (
          <button
            key={d}
            type="button"
            data-testid={`deck-${d}`}
            className={deck === d ? "menu-button active" : "menu-button"}
            onClick={() => changeDeck(d)}
          >
            {deckLabel[d]}
          </button>
        ))}
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
            {modeLabelFor(deck, m)}
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
            onClick={() => window.location.href = `/?${deck === "healthy" ? "deck=healthy&" : ""}card=${encodeURIComponent(card.name)}`}
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