// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
export function shuffle(array: any[]) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element...
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array
}

/**
 * Decks are fully data-driven: every deck declares its own categories
 * (Canyonlands: plants + birds; Healthy Canyons: plants + animals; future
 * decks: anything). A "mode" is a category id, or "both" for everything.
 */
export type DeckMode = string; // a category id, or 'both'
export const BOTH_MODE = 'both';

export type DeckId = string;

export interface DeckCategoryLike {
  id: string;
  label: string;
  cards: any[];
}

export interface DeckDefLike {
  id: string;
  label: string;
  categories: DeckCategoryLike[];
}

export const make_deck = (categories: DeckCategoryLike[], mode: DeckMode): string[] => {
  const source =
    mode === BOTH_MODE
      ? categories.flatMap((c) => c.cards)
      : (categories.find((c) => c.id === mode)?.cards ?? []);
  const cards = source.map((card) => card.name);
  return [...new Array(10)].flatMap(() => shuffle([...cards]));
}

/** The category filter options available within a deck, ending with "both".
 *  Canonical order: "plants" first (the core of these decks), then the rest in
 *  manifest order — so the study cycle is stable regardless of manifest layout. */
export function modesForDeck(deck: DeckDefLike): DeckMode[] {
  const sorted = [...deck.categories].sort((a, b) =>
    a.id === 'plants' ? -1 : b.id === 'plants' ? 1 : 0);
  return [...sorted.map((c) => c.id), BOTH_MODE];
}

export function modeLabelFor(deck: DeckDefLike, mode: DeckMode): string {
  if (mode === BOTH_MODE) {
    // Order-independent: emoji sorted by code point gives the stable '🌿🐦 Both'.
    const emoji = [...new Set(deck.categories.map((c) => c.label.split(" ")[0]))].sort().join("");
    return `${emoji} Both`;
  }
  return deck.categories.find((c) => c.id === mode)?.label ?? mode;
}

export function deckLabel(deck: DeckDefLike): string {
  return deck.label;
}

/** The category a deck opens on: "plants" when present (the core of these decks), else the first. */
export function defaultCategoryFor(deck: DeckDefLike): DeckMode {
  return deck.categories.find((c) => c.id === 'plants')?.id ?? deck.categories[0]?.id ?? BOTH_MODE;
}

/** Read the saved deck (URL param wins over localStorage), defaulting to the first deck. */
export function deckFromLocationOrStorage(search: string, knownDeckIds: string[]): DeckId {
  const params = new URLSearchParams(search);
  const fromUrl = params.get('deck');
  if (fromUrl && knownDeckIds.includes(fromUrl)) return fromUrl;
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('deck');
    if (saved && knownDeckIds.includes(saved)) return saved;
  }
  return knownDeckIds[0];
}