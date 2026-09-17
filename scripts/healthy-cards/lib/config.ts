import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/** Intermediate generation data (species lists, fetch metadata, reports). Committed. */
export const dataDir = path.join(repoRoot, "data", "healthy");
/** Raw downloaded iNat photos + per-taxon metadata. Gitignored cache. */
export const rawDir = path.join(repoRoot, "assets", "healthy-raw");
/** Generated card images served by the app. Committed. */
export const outDir = path.join(repoRoot, "public", "cards-healthy");
/** Generated card manifest module imported by the app. Committed. */
export const appDataFile = path.join(repoRoot, "app", "data", "healthyCards.ts");

export const spreadsheets = {
  plants: "plants.xlsx",
  animals: "animals.xlsx",
} as const;

/** Pixel dimensions of the generated cards; matches the scanned Canyonlands cards. */
export const cardWidth = 750;
export const cardHeight = 1050;

/** iNat API base. */
export const inatApi = "https://api.inaturalist.org/v1";

/** Polite delay between API calls (ms) and number of parallel workers. */
export const apiDelayMs = 1500;
export const fetchConcurrency = 2;

/**
 * Descriptive User-Agent per iNat's guidance (identify the app and point to
 * the project). Used for both API calls and photo downloads.
 */
export const USER_AGENT =
  "native-species-flashcards/1.0 (cards.unimpossy.com; source: github.com/StickyNeutrino/cards)";

/**
 * Photo licenses we accept. "cc0", "cc-by", "cc-by-sa" and "cc-by-nc*" are fine;
 * "nd" variants forbid the cropping we do, so they are excluded.
 */
export function licenseAllowed(code: string | null | undefined): boolean {
  if (!code) return false;
  const c = code.toLowerCase();
  return c === "cc0" || (c.startsWith("cc-") && !c.includes("nd"));
}