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

/**
 * Photo credit on a data-driven card (DECK_FORMAT.md "PhotoCredit"). Unlike
 * the pre-rendered decks' CardCredit, the observation link/id are optional:
 * user-supplied photos may have no iNat observation behind them.
 */
export interface PhotoCredit {
  observer: string;
  license: string;
  sourceUrl?: string;
  observationUrl?: string;
  observationId?: number;
  placeLabel?: string;
}

export interface DeckCardPhoto {
  /** Archive-relative path for imported decks; resolved to a blob: URL by loadUploadedDeck.
   *  For moving media this is the still frame the curator picked. Light decks
   *  (format "lite") have no bundled files — they carry `url` instead, and
   *  the app fetches those bytes once at import and caches them under the
   *  same key space. */
  file: string;
  /** Remote source of the photo (light decks only). Present in the imported
   *  manifest; loadUploadedDeck resolves the cached bytes into `file`. */
  url?: string;
  role: "main" | "secondary";
  alt?: string;
  credit: PhotoCredit;
  /** Explicit crop window (normalized 0..1) over the source photo; maps onto the slot. */
  crop?: { x: number; y: number; w: number; h: number };
  /** Legacy focal point (0..1) for cover-cropping; default center. */
  focus?: { x: number; y: number };
  /** Moving media (animated GIF / video): the clip itself; `file` above is
   *  the display still. Cards render the still; players may add playback. */
  animation?: { file: string; kind: "gif" | "video"; durationSec?: number };
}

/** Colored card border tags (DECK_FORMAT.md). "invasive" is the classic red
 *  marker and also sets the legacy `invasive: true` flag for image decks. */
export type DeckCardBorder = "invasive" | "caution" | "rare" | "notable";

export interface DeckCard {
  name: string;
  /** Image decks only: pre-rendered card faces. Data decks (cardFormat
   *  "data") have neither and are drawn by app/card/dataCard.tsx instead. */
  front?: string;
  back?: string;
  invasive?: boolean;
  border?: DeckCardBorder;
  sciName?: string;
  commonName?: string;
  /** Alternate common names (e.g. "Toyon" is also "Christmas Berry"). */
  altNames?: string[];
  familyCommon?: string;
  familyLatin?: string;
  native?: "native" | "non-native" | "unknown";
  rarity?: string | null;
  taxonId?: number;
  /** Data decks only: "photo-trio" (1 main + up to 2 secondary) or "photo-single". */
  layout?: "photo-trio" | "photo-single";
  photos?: DeckCardPhoto[];
  credits?: CardCredit[];
}

export interface DeckCategory {
  id: string;
  label: string;
  cards: DeckCard[];
}

export interface DeckLocation {
  name?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export interface DeckDef {
  id: string;
  label: string;
  description: string;
  /** Where the deck is relevant (optional; shown on the credits page). */
  location?: DeckLocation;
  categories: DeckCategory[];
  /** "data" decks are rendered as HTML (see DECK_FORMAT.md); image decks
   *  (absent cardFormat) use pre-rendered front/back JPGs. */
  cardFormat?: "data";
  /** True for decks loaded from IndexedDB. Never present in manifests — the
   *  app sets it so the UI can show the "uploaded" marker and delete affordance. */
  uploaded?: boolean;
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
