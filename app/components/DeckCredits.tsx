import { useMemo } from "react";
import type { DeckDef, PhotoCredit } from "~/data/decks";

interface Credit {
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

function collectDeckCredits(def: DeckDef): Credit[] {
  const credits: Credit[] = [];
  for (const category of def.categories) {
    for (const card of category.cards) {
      // Data cards may omit the flattened credits list; derive it from the
      // per-photo credits instead.
      const cardCredits: PhotoCredit[] = card.credits?.length
        ? card.credits.map((c) => ({ ...c }))
        : (card.photos ?? []).map((p) => p.credit);
      for (const photo of cardCredits) {
        credits.push({
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
  return credits;
}

/**
 * Group credits by card so each card is listed once with all of its photos.
 * Cards are sorted alphabetically for easy scanning.
 */
function groupByCard(credits: Credit[]): CardCredits[] {
  const cards = new Map<string, Credit[]>();
  for (const credit of credits) {
    let photos = cards.get(credit.cardName);
    if (!photos) {
      photos = [];
      cards.set(credit.cardName, photos);
    }
    photos.push(credit);
  }
  return [...cards.entries()]
    .map(([cardName, credits]) => ({ cardName, credits }))
    .sort((a, b) => a.cardName.localeCompare(b.cardName, undefined, { sensitivity: "base" }));
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

interface DeckCreditsProps {
  def: DeckDef;
  /** When given, only these cards' credits render — e.g. just the category
   *  the visitor followed from a card list. Absent = the whole deck. */
  cardNames?: Set<string>;
}

/**
 * Photo credits for a single deck, on the dedicated credits page. The page
 * is opened from a specific deck (manage decks) or card list (card lists
 * page), so it never mixes every deck into one list.
 */
export function DeckCredits({ def, cardNames }: DeckCreditsProps) {
  const cards = useMemo(() => {
    const all = groupByCard(collectDeckCredits(def));
    return cardNames ? all.filter((c) => cardNames.has(c.cardName)) : all;
  }, [def, cardNames]);

  return (
    <div className="deck-credits" data-testid="deck-credits">
      {def.location?.name && (
        <p className="credits-location" data-testid="credits-location">
          📍 {def.location.name}
        </p>
      )}
      {cards.length > 0 ? (
        <table className="credits-table" data-testid="credits-table">
          <thead>
            <tr>
              <th scope="col">Card</th>
              <th scope="col">Photos</th>
            </tr>
          </thead>
          <tbody>
            {cards.map(({ cardName, credits }) => (
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
      ) : (
        <p className="credits-empty" data-testid="credits-empty">
          No photo credits{cardNames ? " for this card list" : " for this deck"}.
        </p>
      )}
    </div>
  );
}