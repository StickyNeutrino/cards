import type { Route } from "./+types/credits";
import { useMemo, useState } from "react";
import { DECK_DEFS } from "~/data/decks";

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
  cards: CardCredits[];
}

function collectCredits(): Credit[] {
  const credits: Credit[] = [];
  for (const deck of DECK_DEFS) {
    for (const category of deck.categories) {
      for (const card of category.cards) {
        for (const photo of card.credits ?? []) {
          credits.push({
            deckId: deck.id,
            deckLabel: deck.label,
            cardName: card.name,
            observer: photo.observer,
            license: photo.license,
            observationUrl: photo.observationUrl,
            observationId: photo.observationId,
            placeLabel: photo.placeLabel,
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
function groupCredits(credits: Credit[]): DeckCredits[] {
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
    cards: [...deck.cards.entries()]
      .map(([cardName, credits]) => ({ cardName, credits }))
      .sort((a, b) => a.cardName.localeCompare(b.cardName, undefined, { sensitivity: "base" })),
  }));
}

const licenseLabel = (code: string): string => {
  if (!code) return "(no license)";
  if (code.toLowerCase() === "cc0") return "CC0";
  return code.toLowerCase().replace(/^cc-/, "CC ").toUpperCase();
};

const placeSuffix = (placeLabel: string): string =>
  placeLabel && placeLabel !== "worldwide" ? ` (${placeLabel})` : "";

export default function Credits() {
  const allCredits = useMemo(collectCredits, []);
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
    return groupCredits(filtered);
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
                          <a href={c.observationUrl} target="_blank" rel="noreferrer">
                            iNat #{c.observationId}
                            {placeSuffix(c.placeLabel)}
                          </a>
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