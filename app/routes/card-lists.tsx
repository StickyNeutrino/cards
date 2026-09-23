import type { Route } from "./+types/card-lists";
import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { DECK_DEFS, getDeckDef, type DeckDef } from "~/data/decks";
import {
  deckFromLocationOrStorage, modesForDeck, modeLabelFor, allLabelFor,
  BOTH_MODE, MANAGE_DECKS_OPTION, type DeckId, type DeckMode,
} from "~/utils/deckUtils";
import { useUploadedDecks } from "~/utils/useUploadedDecks";
import { DataCard, type DataCardModel } from "~/card/dataCard";

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
  altNames?: string[];
  /** Data decks: front model for rendering the card itself as the thumbnail. */
  dataModel?: DataCardModel;
}

export function cardsForDef(def: DeckDef, mode: DeckMode): CardItem[] {
  const categories =
    mode === BOTH_MODE ? def.categories : def.categories.filter((c) => c.id === mode);
  return categories.flatMap((c) =>
    c.cards.map((card) => ({
      name: card.name,
      front: card.front ?? '',
      back: card.back ?? '',
      invasive: card.invasive ?? false,
      altNames: card.altNames,
      dataModel: def.cardFormat === 'data'
        ? {
            name: card.name,
            commonName: card.commonName,
            layout: card.layout,
            photos: (card.photos ?? []).map((p) => ({
              src: p.file,
              role: p.role,
              alt: p.alt,
              credit: p.credit,
              crop: p.crop,
              focus: p.focus,
            })),
          }
        : undefined,
    })),
  );
}

export function cardsForDeck(deck: DeckId, mode: DeckMode): CardItem[] {
  const def = getDeckDef(deck);
  if (!def) return [];
  return cardsForDef(def, mode);
}

export default function CardLists() {
  const navigate = useNavigate();
  const { decks: uploadedDecks } = useUploadedDecks();
  const allDecks = useMemo(() => [...DECK_DEFS, ...uploadedDecks], [uploadedDecks]);
  const [deck, setDeck] = useState<DeckId>(() =>
    deckFromLocationOrStorage(typeof window !== "undefined" ? window.location.search : "", DECK_DEFS.map((d) => d.id)));
  // Uploaded decks are only known after mount; honor a saved/linked uploaded deck then.
  useEffect(() => {
    if (uploadedDecks.length === 0 || typeof window === "undefined") return;
    const resolved = deckFromLocationOrStorage(window.location.search, allDecks.map((d) => d.id));
    if (resolved !== deck) setDeck(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedDecks]);
  const activeDef = allDecks.find((d) => d.id === deck) ?? DECK_DEFS[0];
  const modes = modesForDeck(activeDef);
  const [filter, setFilter] = useState<DeckMode>(BOTH_MODE);
  // The dropdown can only offer modes this deck actually has; if the saved
  // filter doesn't exist here (e.g. right after a deck switch), fall back to
  // "all" for both the select value and the card list.
  const activeMode = modes.includes(filter) ? filter : BOTH_MODE;
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
    const q = search.toLowerCase();
    return cardsForDef(activeDef, activeMode).filter(card =>
      card.name.toLowerCase().includes(q) ||
      (card.altNames ?? []).some(alt => alt.toLowerCase().includes(q)));
  }, [activeDef, activeMode, search]);

  const changeDeck = (next: DeckId) => {
    setDeck(next);
    if (typeof window !== "undefined") localStorage.setItem("deck", next);
    setFilter(BOTH_MODE);
  };

  const changeDeckFromSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (next === MANAGE_DECKS_OPTION) {
      // Not a deck: snap the dropdown back and open the manage decks page.
      e.target.value = deck;
      navigate('/decks');
      return;
    }
    changeDeck(next as DeckId);
  };

  const changeModeFromSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value as DeckMode);
  };

  return (
    <main className="card-list-main">
      {/* One compact, always-stuck bar: deck, category and search inline.
          It stays pinned to the top while the card list scrolls under it. */}
      <div className="controls-bar">
        <div className="controls-container">
          <select
            className="menu-button deck-select"
            data-testid="deck-select"
            aria-label="Select deck"
            value={deck}
            onChange={changeDeckFromSelect}
          >
            {allDecks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}{d.uploaded ? ' (uploaded)' : ''}
              </option>
            ))}
            <option value={MANAGE_DECKS_OPTION}>⚙️ Manage decks…</option>
          </select>
          {/* Category dropdown: the closed control always shows the selected
              category (the old button row only hinted at it with a border),
              and it scales to decks with many categories. First entry is
              "all" — '🌿🐦 Both' for two-category decks, '🌿🐦🦎 All'
              otherwise. */}
          <select
            className="menu-button deck-select"
            data-testid="mode-select"
            aria-label="Filter by category"
            value={activeMode}
            onChange={changeModeFromSelect}
          >
            <option value={BOTH_MODE}>{allLabelFor(activeDef)}</option>
            {modes.filter((m) => m !== BOTH_MODE).map((m) => (
              <option key={m} value={m}>{modeLabelFor(activeDef, m)}</option>
            ))}
          </select>
          <input
            type="search"
            className="search-input"
            placeholder="Search cards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
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
            {card.dataModel ? (
              <span className="card-thumbnail data-thumb" aria-hidden>
                <DataCard model={card.dataModel} face="front" />
              </span>
            ) : (
              <img
                src={card.front}
                alt={`${card.name} front`}
                className="card-thumbnail"
              />
            )}
            <span className="card-name">{card.name}</span>
          </button>
        ))}
      </div>
    </main>
  );
}