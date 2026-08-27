import type { Route } from "./+types/home";
import { Card } from "~/card/card";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { birds, plants } from "./card-lists";
import { trackCardView } from "~/viewtrack";
import { make_deck } from "~/utils/deckUtils";
import { Settings } from "~/components/Settings";
import { PreloadProgress } from "~/components/PreloadProgress";
import { HamburgerMenu } from "~/components/HamburgerMenu";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Flash Cards" },
    { name: "description", content: "SD Canyonlands Flashcards" },
  ];
}


let max_index = 0;

export default function Home() {
  const navigate = useNavigate();
  const [cardIndex, setIndex] = useState(0);
  if (cardIndex < 0) { setIndex(0) }

  const [mode, setMode] = useState<'plants' | 'birds' | 'both'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has("both")) return 'both';
      if (params.has("birds")) return 'birds';
      const saved = localStorage.getItem('mode');
      if (saved === 'plants' || saved === 'birds' || saved === 'both') return saved;
      return 'plants'; // Changed default to 'plants'
    }
    return 'plants';
  })
  const [deck, setDeck] = useState(make_deck(mode, plants, birds))
  const [preloadProgress, setPreloadProgress] = useState<{ current: number; total: number; isVisible: boolean }>({
    current: 0,
    total: 0,
    isVisible: false
  });
  const [isPreloaded, setIsPreloaded] = useState(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('pwa-cards-preloaded') === 'true';
    }
    return false;
  });
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

  const currentCard = deck[cardIndex % deck.length];
  const nextCard = deck[(cardIndex + 1) % deck.length];

  const makeDeckCallback = useCallback(() => {setDeck(make_deck(mode, plants, birds)); max_index = 0}, [mode])

  useEffect(makeDeckCallback, [makeDeckCallback]);

  useEffect(() => {
    if (selectedCard) {
      const index = deck.findIndex(card => card === selectedCard);
      if (index !== -1) {
        setIndex(index);
      } else {
        // Card not found in current deck, check if it's in birds or plants
        const isBird = birds.some(bird => bird.name === selectedCard);
        const isPlant = plants.some(plant => plant.name === selectedCard);
        if (isBird && mode !== 'birds' && mode !== 'both') {
          setMode('birds');
        } else if (isPlant && mode !== 'plants' && mode !== 'both') {
          setMode('plants');
        } else if (mode === 'plants' && isBird) {
          setMode('both');
        } else if (mode === 'birds' && isPlant) {
          setMode('both');
        }
      }
    }
  }, [selectedCard, deck]);
  useEffect(() => {
    if (!selectedCard && deck.length > 0) {
      setSelectedCard(deck[0].name);
    }
  }, [deck, selectedCard]);

  // Separate effect to handle URL cleanup after mode change
  useEffect(() => {
    if (selectedCard && deck.length > 0) {
      const index = deck.findIndex(card => card.name === selectedCard);
      if (index !== -1) {
        const url = new URL(window.location.href);
        url.searchParams.delete('card');
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [selectedCard, deck]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location && window.history && window.history.replaceState) {
      const url = new URL(window.location.href);
      url.searchParams.delete("plants");
      url.searchParams.delete("birds");
      url.searchParams.delete("both");
      if (mode !== 'plants') {
        url.searchParams.set(mode, "true");
      }
      window.history.replaceState({}, "", url.toString());
    }
  }, [mode]);
  
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

  const elementRef = useRef<HTMLDivElement>(null);
  const [elementWidth, setElementWidth] = useState(0);

  useLayoutEffect(() => {
    if (elementRef.current) {
      setElementWidth(elementRef.current.offsetWidth);
    }
  }, []);

  const toggleMode = () => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('card');
      window.history.replaceState({}, "", url.toString());
    }
    const nextMode = mode === 'plants' ? 'birds' : mode === 'birds' ? 'both' : 'plants';
    setMode(nextMode);
    setSelectedCard(null);
    setIndex(0); // Reset to first card when switching
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

  const handlePreloadCards = () => {
    if (isPreloaded || isPreloading) return;

    setIsPreloading(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pwa-cards-preloaded', 'true');
    }

    const imageUrls: string[] = [];

    // Add all bird and plant card images
    [...birds, ...plants].forEach(card => {
      imageUrls.push(`/cards/${card.front}`);
      imageUrls.push(`/cards/${card.back}`);
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
            localStorage.setItem('pwa-cards-preloaded', 'true');
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
            localStorage.setItem('pwa-cards-preloaded', 'true');
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
    <HamburgerMenu ref={hamburgerRef} mode={mode} changeModeClicked={changeModeClicked} settingsClicked={settingsButtonClicked} cardListsClicked={cardListsButtonClicked} />

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

    <Card card={currentCard} flipped={flipped} widthRef={elementRef} flipSpeed={parseFloat(flipSpeed)} onClick={toggleFlipped}/>
    <div id="button-container" style={{ width: `calc(${elementWidth}px)` }}>
      <button id="back-button" className="control-button" onClick={backAction}>
        <img src="/arrow-left-solid-full.svg" alt="Previous card" />
      </button>
      <button id="next-button" className="control-button" onClick={nextAction}>
        <img src="/arrow-right-solid-full.svg" alt="Next card" />
      </button>
    </div>
    {nextCard && <link rel="preload" href={`/cards/${nextCard} Front.jpg`} as="image" />}
    {nextCard && <link rel="preload" href={`/cards/${nextCard} Back.jpg`} as="image" />}
  </main>)
}
