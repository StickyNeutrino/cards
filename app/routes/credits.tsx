import type { Route } from "./+types/credits";
import { useMemo, useState } from "react";
import { DECK_DEFS, type DeckDef, type PhotoCredit } from "~/data/decks";
import { useUploadedDecks } from "~/utils/useUploadedDecks";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Photo Credits - Flash Cards" },
    { name: "description", content: "Attribution for the iNaturalist photos used on generated card decks" },
  ];
}

interface Credit {
  deckId: string;
  deckLabel: string;
  cardName: string;
  observer: string;
  license: string;
  observationUrl: string;
  observationId: number;
  placeLabel: string;
}

interface CardCredits {
  cardName: string;
  credits: Credit[];
}

interface DeckCredits {
  deckId: string;
  deckLabel: string;
  locationName?: string;
  cards: CardCredits[];
}

function collectCredits(decks: DeckDef[]): Credit[] {
  const credits: Credit[] = [];
  for (const deck of decks) {
    for (const category of deck.categories) {
      for (const card of category.cards) {
        // Data cards may omit the flattened credits list; derive it from the
        // per-photo credits instead.
        const cardCredits: PhotoCredit[] = card.credits?.length
          ? card.credits.map((c) => ({ ...c }))
          : (card.photos ?? []).map((p) => p.credit);
        for (const photo of cardCredits) {
          credits.push({
            deckId: deck.id,
            deckLabel: deck.label,
            cardName: card.name,
            observer: photo.observer,
            license: photo.license,
            observationUrl: photo.observationUrl ?? photo.sourceUrl ?? '',
            observationId: photo.observationId ?? 0,
            placeLabel: photo.placeLabel ?? '',
          });
        }
      }
    }
  }
  return credits;
}

/**
 * Group credits by deck, then by card, so each card is listed once with all
 * of its photos. Cards are sorted alphabetically for easy scanning.
 */
function groupCredits(credits: Credit[], decks: DeckDef[]): DeckCredits[] {
  const locations = new Map(decks.map((d) => [d.id, d.location?.name]));
  const deckMap = new Map<string, { label: string; cards: Map<string, Credit[]> }>();
  for (const credit of credits) {
    let deck = deckMap.get(credit.deckId);
    if (!deck) {
      deck = { label: credit.deckLabel, cards: new Map() };
      deckMap.set(credit.deckId, deck);
    }
    let photos = deck.cards.get(credit.cardName);
    if (!photos) {
      photos = [];
      deck.cards.set(credit.cardName, photos);
    }
    photos.push(credit);
  }
  return [...deckMap.entries()].map(([deckId, deck]) => ({
    deckId,
    deckLabel: deck.label,
    locationName: locations.get(deckId),
    cards: [...deck.cards.entries()]
      .map(([cardName, credits]) => ({ cardName, credits }))
      .sort((a, b) => a.cardName.localeCompare(b.cardName, undefined, { sensitivity: "base" })),
  }));
}

const licenseLabel = (code: string): string => {
  if (!code) return "(no license)";
  if (code.toLowerCase() === "cc0") return "CC0";
  // User-uploaded decks may declare their own photos all-rights-reserved.
  if (code.toLowerCase() === "all-rights-reserved") return "All Rights Reserved";
  return code.toLowerCase().replace(/^cc-/, "CC ").toUpperCase();
};

const placeSuffix = (placeLabel: string): string =>
  placeLabel && placeLabel !== "worldwide" ? ` (${placeLabel})` : "";

export default function Credits() {
  const { decks: uploadedDecks } = useUploadedDecks();
  const allDecks = useMemo(() => [...DECK_DEFS, ...uploadedDecks], [uploadedDecks]);
  const allCredits = useMemo(() => collectCredits(allDecks), [allDecks]);
  const [search, setSearch] = useState("");

  const decks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? allCredits.filter(
          (c) =>
            c.cardName.toLowerCase().includes(q) ||
            c.observer.toLowerCase().includes(q),
        )
      : allCredits;
    return groupCredits(filtered, allDecks);
  }, [allCredits, search]);

  return (
    <main className="credits-main">
      <div className="credits-card">
        <a href="/" className="credits-back">&larr; Back to Flash Cards</a>
        <h1>Photo Credits</h1>
        <p className="credits-intro">
          Generated decks use photographs contributed by naturalists on{" "}
          <a href="https://www.inaturalist.org" target="_blank" rel="noreferrer">iNaturalist</a>{" "}
          under Creative Commons licenses. Each card credits its photographers; the full
          attributions are listed below.
        </p>
        <input
          type="search"
          className="search-input"
          placeholder="Search by card or photographer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="credits-search"
        />
        {decks.map((deck) => (
          <section key={deck.deckId} className="credits-deck">
            <h2>{deck.deckLabel}</h2>
            {deck.locationName && (
              <p className="credits-location" data-testid="credits-location">
                📍 {deck.locationName}
              </p>
            )}
            <table className="credits-table" data-testid="credits-table">
              <thead>
                <tr>
                  <th scope="col">Card</th>
                  <th scope="col">Photos</th>
                </tr>
              </thead>
              <tbody>
                {deck.cards.map(({ cardName, credits }) => (
                  <tr key={cardName}>
                    <th scope="row" className="credits-card-name">{cardName}</th>
                    <td className="credits-photos">
                      {credits.map((c, i) => (
                        <div key={`${c.observationId}-${i}`} className="credits-photo">
                          <span className="credits-observer">{c.observer}</span>
                          <span className="credits-license">{licenseLabel(c.license)}</span>
                          {c.observationUrl ? (
                            <a href={c.observationUrl} target="_blank" rel="noreferrer">
                              {c.observationId ? `iNat #${c.observationId}` : 'Source'}
                              {placeSuffix(c.placeLabel)}
                            </a>
                          ) : (
                            <span>{placeSuffix(c.placeLabel)}</span>
                          )}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
        {decks.length === 0 && <p className="credits-empty">No matching credits.</p>}
      </div>
    </main>
  );
}