import canyonlands from "./decks/canyonlands.json" with { type: "json" };
import healthyCanyons from "./decks/healthy-canyons.json" with { type: "json" };

/**
 * Each deck is a standalone repository under decks/<id>/ with its own
 * manifest.json. `scripts/sync-decks.ts` copies that manifest here (with the
 * survey's per-canyon data stripped — that stays in the private deck repo),
 * and the copies are committed so builds and tests work without the private
 * repos checked out. Adding a deck = add its manifest here.
 */

export interface CardCredit {
  observer: string;
  license: string;
  observationUrl: string;
  observationId: number;
  placeLabel: string;
}

export interface DeckCard {
  name: string;
  front: string;
  back: string;
  invasive: boolean;
  sciName?: string;
  commonName?: string;
  /** Alternate common names (e.g. "Toyon" is also "Christmas Berry"). */
  altNames?: string[];
  native?: "native" | "non-native" | "unknown";
  rarity?: string | null;
  credits?: CardCredit[];
}

export interface DeckCategory {
  id: string;
  label: string;
  cards: DeckCard[];
}

export interface DeckDef {
  id: string;
  label: string;
  description: string;
  categories: DeckCategory[];
}

const canyonlandsDeck = canyonlands as unknown as DeckDef;
const healthyCanyonsDeck = healthyCanyons as DeckDef;

export const DECK_DEFS: DeckDef[] = [canyonlandsDeck, healthyCanyonsDeck];

export const DEFAULT_DECK_ID: string = DECK_DEFS[0]?.id ?? "canyonlands";

export function getDeckDef(id: string): DeckDef | undefined {
  return DECK_DEFS.find((d) => d.id === id);
}

/** All category ids used across decks — for scrubbing stale mode URL params. */
export const ALL_CATEGORY_IDS: string[] = [
  ...new Set(DECK_DEFS.flatMap((d) => d.categories.map((c) => c.id))),
];

/**
 * Default invasive lookup for the Card component when a deck isn't specified:
 * a card name flagged invasive in any deck is treated as invasive.
 */
const defaultInvasiveNames: Set<string> = new Set(
  DECK_DEFS.flatMap((d) => d.categories.flatMap((c) => c.cards.filter((x) => x.invasive).map((x) => x.name))),
);

export function defaultInvasive(cardName: string): boolean {
  return defaultInvasiveNames.has(cardName);
}
