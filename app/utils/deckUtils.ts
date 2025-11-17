// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
export function shuffle(array: any[]) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array
}

export const make_deck = (mode: 'plants' | 'birds' | 'both', plants: any[], birds: any[]) => {
  let cards: string[];
  if (mode === 'plants') {
    cards = plants.map(card => card.name);
  } else if (mode === 'birds') {
    cards = birds.map(card => card.name);
  } else { // both
    cards = [...plants, ...birds].map(card => card.name);
  }
  return [...new Array(10)].flatMap(() => [...cards]);
}