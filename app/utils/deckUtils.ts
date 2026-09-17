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

export type DeckMode = 'plants' | 'birds' | 'animals' | 'both';
export type DeckId = 'canyonlands' | 'healthy';

export const make_deck = (
  mode: DeckMode,
  plants: any[],
  birds: any[],
  animals: any[] = [],
) => {
  let cards: string[];
  if (mode === 'plants') {
    cards = plants.map(card => card.name);
  } else if (mode === 'birds') {
    cards = birds.map(card => card.name);
  } else if (mode === 'animals') {
    cards = animals.map(card => card.name);
  } else { // both
    cards = [...plants, ...birds, ...animals].map(card => card.name);
  }
  return [...new Array(10)].flatMap(() => shuffle([...cards]));
}

/** The category filter options available within a deck. */
export function modesForDeck(deck: DeckId): DeckMode[] {
  return deck === 'healthy' ? ['plants', 'animals', 'both'] : ['plants', 'birds', 'both'];
}

export const DECKS: DeckId[] = ['canyonlands', 'healthy'];

export const deckLabel: Record<DeckId, string> = {
  canyonlands: '🏔 Canyonlands',
  healthy: '🌿 Healthy Canyons',
};

export const modeLabel: Record<DeckMode, string> = {
  plants: '🌿 Plants',
  birds: '🐦 Birds',
  animals: '🦎 Animals',
  both: '🌿🐦 Both',
};

export function modeLabelFor(deck: DeckId, mode: DeckMode): string {
  if (deck === 'healthy' && mode === 'plants') return '🌿 Plants';
  if (deck === 'healthy' && mode === 'animals') return '🦎 Animals';
  if (deck === 'healthy' && mode === 'both') return '🌿🦎 Both';
  return modeLabel[mode];
}

/** Read the saved deck (URL param wins over localStorage), defaulting to canyonlands. */
export function deckFromLocationOrStorage(search: string): DeckId {
  const params = new URLSearchParams(search);
  const fromUrl = params.get('deck');
  if (fromUrl === 'healthy' || fromUrl === 'canyonlands') return fromUrl;
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('deck');
    if (saved === 'healthy') return 'healthy';
  }
  return 'canyonlands';
}