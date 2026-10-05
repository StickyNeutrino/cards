import type { Route } from "./+types/credits";
import { useEffect, useMemo, useState } from "react";
import { DECK_DEFS, type DeckDef } from "~/data/decks";
import { useUploadedDecks } from "~/utils/useUploadedDecks";
import { DeckCredits } from "~/components/DeckCredits";
import {
  deckFromLocationOrStorage, modesForDeck, modeLabelFor, allLabelFor,
  BOTH_MODE, type DeckId, type DeckMode,
} from "~/utils/deckUtils";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Photo Credits - Flash Cards" },
    { name: "description", content: "Attribution for the iNaturalist photos used on generated card decks" },
  ];
}

/**
 * Photo credits for ONE deck (opened from the manage decks page or a card
 * list), never every deck at once. `?deck=<id>` picks the deck and
 * `?category=<id>` narrows it to the card list the visitor was viewing
 * ("both" = the whole deck). The dropdowns re-scope the page in place.
 */
export default function Credits() {
  const { decks: uploadedDecks } = useUploadedDecks();
  const allDecks = useMemo(() => [...DECK_DEFS, ...uploadedDecks], [uploadedDecks]);
  const [deck, setDeck] = useState<DeckId>(() =>
    deckFromLocationOrStorage(typeof window !== "undefined" ? window.location.search : "", DECK_DEFS.map((d) => d.id)));
  // Uploaded decks are only known after mount; honor a linked uploaded deck then.
  useEffect(() => {
    if (uploadedDecks.length === 0 || typeof window === "undefined") return;
    const resolved = deckFromLocationOrStorage(window.location.search, allDecks.map((d) => d.id));
    if (resolved !== deck) setDeck(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedDecks]);
  const activeDef = allDecks.find((d) => d.id === deck) ?? DECK_DEFS[0];
  const modes = modesForDeck(activeDef);

  const [category, setCategory] = useState<DeckMode>(() => {
    if (typeof window === "undefined") return BOTH_MODE;
    const fromUrl = new URLSearchParams(window.location.search).get("category");
    return fromUrl ?? BOTH_MODE;
  });
  // The dropdown can only offer categories this deck has; an unknown or
  // missing one (fresh link, deck switch) falls back to the whole deck.
  const activeCategory = modes.includes(category) ? category : BOTH_MODE;

  // The card list this page was opened from (whole deck when "both").
  const cardNames = useMemo(() => (
    activeCategory === BOTH_MODE
      ? undefined
      : new Set(activeDef.categories.find((c) => c.id === activeCategory)?.cards.map((c) => c.name) ?? [])
  ), [activeDef, activeCategory]);

  const changeDeck = (next: DeckId) => {
    setDeck(next);
    setCategory(BOTH_MODE);
    if (typeof window !== "undefined") localStorage.setItem("deck", next);
  };

  if (!activeDef) return null;

  return (
    <main className="credits-main">
      <div className="credits-card">
        <a href="/" className="credits-back">&larr; Back to Flash Cards</a>
        <h1>Photo Credits</h1>
        <p className="credits-intro">
          Photographs are contributed by naturalists on{" "}
          <a href="https://www.inaturalist.org" target="_blank" rel="noreferrer">iNaturalist</a>{" "}
          under Creative Commons licenses. These credits are for{" "}
          <strong>{activeDef.label}</strong>
          {activeCategory !== BOTH_MODE && (
            <>
              {" "}— <strong>{modeLabelFor(activeDef, activeCategory)}</strong> cards only
            </>
          )}. Switch the deck or card list below to see other attributions.
        </p>
        <div className="credits-controls">
          <select
            className="menu-button deck-select"
            data-testid="deck-select"
            aria-label="Select deck"
            value={deck}
            onChange={(e) => changeDeck(e.target.value as DeckId)}
          >
            {allDecks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}{d.uploaded ? ' (uploaded)' : ''}
              </option>
            ))}
          </select>
          <select
            className="menu-button deck-select"
            data-testid="category-select"
            aria-label="Filter by category"
            value={activeCategory}
            onChange={(e) => setCategory(e.target.value as DeckMode)}
          >
            <option value={BOTH_MODE}>{allLabelFor(activeDef)}</option>
            {modes.filter((m) => m !== BOTH_MODE).map((m) => (
              <option key={m} value={m}>{modeLabelFor(activeDef, m)}</option>
            ))}
          </select>
        </div>
        <DeckCredits def={activeDef} cardNames={cardNames} />
      </div>
    </main>
  );
}