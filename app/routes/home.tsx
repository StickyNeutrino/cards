import type { Route } from "./+types/home";
import { Card } from "~/card/card";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { birds, plants, invasives } from "./card-lists";
import { healthyPlants, healthyAnimals } from "~/data/healthyCards";
import { trackCardView } from "~/viewtrack";
import {
  deckFromLocationOrStorage, make_deck, modesForDeck, type DeckId, type DeckMode,
} from "~/utils/deckUtils";
import { Settings } from "~/components/Settings";
import { PreloadProgress } from "~/components/PreloadProgress";
import { HamburgerMenu } from "~/components/HamburgerMenu";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Flash Cards" },
    { name: "description", content: "SD Canyonlands Flashcards" },
  ];
}

interface CardRef {
  name: string;
  front: string;
  back: string;
  invasive: boolean;
}

function buildCardRefs(
  plants: Array<{ name: string; front: string; back: string }>,
  birds: Array<{ name: string; front: string; back: string }>,
  animals: Array<{ name: string; front: string; back: string }>,
  isInvasive: (card: { name: string; native?: string }) => boolean,
): { plants: CardRef[]; birds: CardRef[]; animals: CardRef[]; byName: Map<string, CardRef>; all: CardRef[] } {
  const toRef = (c: { name: string; front: string; back: string }, prefix: string): CardRef => ({
    name: c.name,
    front: c.front.startsWith("/") ? c.front : `${prefix}${c.front}`,
    back: c.back.startsWith("/") ? c.back : `${prefix}${c.back}`,
    invasive: isInvasive(c),
  });
  const p = plants.map((c) => toRef(c, "/cards/"));
  const b = birds.map((c) => toRef(c, "/cards/"));
  const a = animals.map((c) => toRef(c, ""));
  return {
    plants: p,
    birds: b,
    animals: a,
    byName: new Map([...p, ...b, ...a].map((c) => [c.name, c])),
    all: [...p, ...b, ...a],
  };
}

let max_index = 0;

export default function Home() {
  const navigate = useNavigate();
  const [cardIndex, setIndex] = useState(0);
  if (cardIndex < 0) { setIndex(0) }

  const [deck, setDeck] = useState<DeckId>(() => {
    if (typeof window !== 'undefined') {
      return deckFromLocationOrStorage(window.location.search);
    }
    return 'canyonlands';
  });

  const [mode, setMode] = useState<DeckMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has("both")) return 'both';
      if (params.has("birds")) return 'birds';
      if (params.has("animals")) return 'animals';
      if (params.has("plants")) return 'plants';
      const saved = localStorage.getItem('mode');
      if (saved === 'plants' || saved === 'birds' || saved === 'animals' || saved === 'both') return saved;
      return 'plants';
    }
    return 'plants';
  })

  const cardRefs = useMemo(() => ({
    canyonlands: buildCardRefs(plants, birds, [], (c) => invasives.includes(c.name)),
    healthy: buildCardRefs(healthyPlants, [], healthyAnimals, (c) => c.native === "non-native"),
  }), []);
  const activeDeck = deck === 'healthy' ? cardRefs.healthy : cardRefs.canyonlands;

  const makeDeck = useCallback((d: DeckId, m: DeckMode) => {
    const refs = d === 'healthy' ? cardRefs.healthy : cardRefs.canyonlands;
    return make_deck(m, refs.plants, refs.birds, refs.animals);
  }, [cardRefs]);

  const [deckNames, setDeckNames] = useState<string[]>(() => makeDeck(deck, mode));
  const [preloadProgress, setPreloadProgress] = useState<{ current: number; total: number; isVisible: boolean }>({
    current: 0,
    total: 0,
    isVisible: false
  });
  const preloadKey = deck === 'healthy' ? 'pwa-cards-preloaded-healthy' : 'pwa-cards-preloaded';
  const [isPreloaded, setIsPreloaded] = useState(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(preloadKeyFor(deck)) === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsPreloaded(localStorage.getItem(preloadKeyFor(deck)) === 'true');
    }
  }, [deck]);
  const [isPreloading, setIsPreloading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLDivElement>(null);

  const [selectedCard, setSelectedCard] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      return params.get('card');
    }
    return null;
  });

  const [flipSpeed, setFlipSpeed] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flipSpeed');
      if (saved !== null) {
        const num = parseFloat(saved);
        if (!isNaN(num) && num >= 0 && num <= 2.0) {
          return saved;
        }
      }
    }
    return '0.8';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('flipSpeed', flipSpeed);
    }
  }, [flipSpeed]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mode', mode);
    }
  }, [mode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('deck', deck);
    }
  }, [deck]);

  const deckIsEmpty = deckNames.length === 0;
  const currentCardName = deckIsEmpty ? null : deckNames[cardIndex % deckNames.length];
  const nextCardName = deckIsEmpty ? null : deckNames[(cardIndex + 1) % deckNames.length];
  const currentCard = currentCardName ? activeDeck.byName.get(currentCardName) : undefined;
  const nextCard = nextCardName ? activeDeck.byName.get(nextCardName) : undefined;

  const makeDeckCallback = useCallback(() => {
    setDeckNames(makeDeck(deck, mode));
    max_index = 0;
  }, [deck, mode, makeDeck]);

  useEffect(makeDeckCallback, [makeDeckCallback]);

  // If the saved mode does not exist in this deck, fall back to plants.
  useEffect(() => {
    if (!modesForDeck(deck).includes(mode)) {
      setMode('plants');
    }
  }, [deck, mode]);

  useEffect(() => {
    if (selectedCard) {
      const index = deckNames.findIndex(card => card === selectedCard);
      if (index !== -1) {
        setIndex(index);
      } else {
        // Card not found in current deck: switch mode so it is.
        const inPlants = activeDeck.plants.some(plant => plant.name === selectedCard);
        const inBirds = activeDeck.birds.some(bird => bird.name === selectedCard);
        const inAnimals = activeDeck.animals.some(animal => animal.name === selectedCard);
        if (inPlants && mode !== 'plants' && mode !== 'both') {
          setMode('plants');
        } else if (inBirds && mode !== 'birds' && mode !== 'both') {
          setMode('birds');
        } else if (inAnimals && mode !== 'animals' && mode !== 'both') {
          setMode('animals');
        } else if (mode !== 'both' && ((inPlants && inBirds) || (inPlants && inAnimals) || (inBirds && inAnimals))) {
          setMode('both');
        }
      }
    }
  }, [selectedCard, deckNames]);

  // Separate effect to handle URL cleanup after mode change
  useEffect(() => {
    if (selectedCard && deckNames.length > 0) {
      const index = deckNames.findIndex(card => card === selectedCard);
      if (index !== -1) {
        const url = new URL(window.location.href);
        url.searchParams.delete('card');
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [selectedCard, deckNames]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location && window.history && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("plants");
      url.searchParams.delete("birds");
      url.searchParams.delete("animals");
      url.searchParams.delete("both");
      if (deck === 'healthy') {
        url.searchParams.set("deck", "healthy");
      } else {
        url.searchParams.delete("deck");
      }
      if (mode !== 'plants') {
        url.searchParams.set(mode, "true");
      }
      window.history.replaceState({}, "", url.toString());
    }
  }, [mode, deck]);

  const nextAction = () => {
    if (flipped) {
      setFlipped(false);
      setTimeout(() => setIndex(prev => prev + 1), parseFloat(flipSpeed) * 1000/2);
    } else {
      setIndex(prev => prev + 1);
    }
  };

  const backAction = () => {
    if (flipped) {
      setFlipped(false);
      setTimeout(() => setIndex(prev => prev - 1), parseFloat(flipSpeed) * 1000 /2);
    } else {
      setIndex(prev => prev - 1);
    }
  };

  if (cardIndex > max_index) {
    max_index = cardIndex;
    trackCardView();
  }

  const [flipped, setFlipped] = useState(false);

  const toggleFlipped = () => {
    setFlipped(!flipped)
  };

  useEffect(() => {
    const handleKeyDown = (event: { key: any; preventDefault: () => void; }) => {
      switch (event.key) {
        case 'ArrowUp':
          setFlipped(true)
          break;
        case ' ':
          setFlipped(prev => !prev)
          break;
        case 'ArrowRight':
          nextAction();
          break;
        case 'ArrowLeft':
          backAction();
          break;
        case 'Escape':
          setShowSettings(false);
          break;
      }
    };
    const handleKeyUp = (event: { key: any; }) => {
      switch (event.key) {
        case 'ArrowUp':
          setFlipped(false);
          break;
      };
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (hamburgerRef.current && settingsRef.current
      && !hamburgerRef.current.contains(event.target as Node)
      && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  // The nav button row matches the visible card's width. The card's <img>
  // element is replaced whenever the deck changes, so track the element itself
  // (not just its size) and re-attach the ResizeObserver to each new element.
  const [cardImg, setCardImg] = useState<HTMLImageElement | null>(null);
  const [elementWidth, setElementWidth] = useState(0);

  useLayoutEffect(() => {
    if (!cardImg) return;
    const update = () => setElementWidth(cardImg.offsetWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(cardImg);
    return () => observer.disconnect();
  }, [cardImg]);

  const toggleMode = () => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('card');
      window.history.replaceState({}, "", url.toString());
    }
    const modes = modesForDeck(deck);
    const nextMode = modes[(modes.indexOf(mode) + 1) % modes.length] as DeckMode;
    setMode(nextMode);
    setSelectedCard(null);
    setFlipped(false); // Show the front of the new deck's first card
    setIndex(0); // Reset to first card when switching
  };

  const switchDeck = (next: DeckId) => {
    if (next === deck) return;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('card');
      window.history.replaceState({}, "", url.toString());
    }
    setDeck(next);
    setMode('plants');
    setSelectedCard(null);
    setFlipped(false);
    setIndex(0);
  };

  const changeModeClicked = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleMode()
  }

  const settingsButtonClicked = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowSettings(!showSettings)
  }

  const cardListsButtonClicked = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate('/card-lists')
  }

  const creditsButtonClicked = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate('/credits')
  }

  const handlePreloadCards = () => {
    if (isPreloaded || isPreloading) return;

    setIsPreloading(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(preloadKey, 'true');
    }

    const imageUrls: string[] = [];

    // Add all card images of the active deck
    activeDeck.all.forEach(card => {
      imageUrls.push(card.front);
      imageUrls.push(card.back);
    });

    let loadedCount = 0;

    setPreloadProgress({ current: 0, total: imageUrls.length, isVisible: true });

    for (let i = 0; i < imageUrls.length; i++) {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        setPreloadProgress(prev => ({ ...prev, current: loadedCount }));
        if (loadedCount === imageUrls.length) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(preloadKey, 'true');
            localStorage.setItem('pwa-cards-version', '3');
          }
          setIsPreloaded(true);
          setIsPreloading(false);
          setTimeout(() => {
            setPreloadProgress(prev => ({ ...prev, isVisible: false }));
          }, 2000);
        }
      };
      img.onerror = () => {
        loadedCount++;
        setPreloadProgress(prev => ({ ...prev, current: loadedCount }));
        if (loadedCount === imageUrls.length) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(preloadKey, 'true');
            localStorage.setItem('pwa-cards-version', '3');
          }
          setIsPreloaded(true);
          setIsPreloading(false);
          setTimeout(() => {
            setPreloadProgress(prev => ({ ...prev, isVisible: false }));
          }, 2000);
        }
      };
      img.src = imageUrls[i];
    }
  };

  return (
  <main onClick={() => {setFlipped(false); setShowSettings(false)}}>
    <HamburgerMenu
      ref={hamburgerRef}
      mode={mode}
      deck={deck}
      changeModeClicked={changeModeClicked}
      changeDeckClicked={switchDeck}
      settingsClicked={settingsButtonClicked}
      cardListsClicked={cardListsButtonClicked}
      creditsClicked={creditsButtonClicked}
    />

    <Settings
      ref={settingsRef}
      showSettings={showSettings}
      flipSpeed={flipSpeed}
      setFlipSpeed={setFlipSpeed}
      isPreloaded={isPreloaded}
      isPreloading={isPreloading}
      handlePreloadCards={handlePreloadCards}
    />

    <PreloadProgress
      current={preloadProgress.current}
      total={preloadProgress.total}
      isVisible={preloadProgress.isVisible}
    />

    {deckIsEmpty ? (
      <div className="deck-empty" data-testid="deck-empty">
        No cards in this deck yet.
      </div>
    ) : (
      <Card
        card={currentCardName}
        flipped={flipped}
        widthRef={setCardImg}
        flipSpeed={parseFloat(flipSpeed)}
        onClick={toggleFlipped}
        front={currentCard?.front}
        back={currentCard?.back}
        invasive={currentCard?.invasive}
      />
    )}
    <div id="button-container" style={{ width: `calc(${elementWidth}px)`, fontSize: `${elementWidth / 28.125}px` }}>
      <button id="back-button" className="control-button" onClick={backAction}>
        <img src="/arrow-left-solid-full.svg" alt="Previous card" />
      </button>
      <button id="next-button" className="control-button" onClick={nextAction}>
        <img src="/arrow-right-solid-full.svg" alt="Next card" />
      </button>
    </div>
    {nextCard && <link rel="preload" href={nextCard.front} as="image" />}
    {nextCard && <link rel="preload" href={nextCard.back} as="image" />}
  </main>)
}

function preloadKeyFor(deck: DeckId): string {
  return deck === 'healthy' ? 'pwa-cards-preloaded-healthy' : 'pwa-cards-preloaded';
}