import type { Route } from "./+types/home";
import { Card } from "~/card/card";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
  const [cardIndex, setIndex] = useState(0);
  const [mode, setMode] = useState<'plants' | 'birds' | 'both'>(() => {
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      if (params.has("both")) return 'both';
      if (params.has("birds")) return 'birds';
      return 'plants';
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

  const [flipSpeed, setFlipSpeed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('flipSpeed');
      return saved ? parseFloat(saved) : 0.8;
    }
    return 0.8;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('flipSpeed', flipSpeed.toString());
    }
  }, [flipSpeed]);

  const currentCard = deck[cardIndex % deck.length];
  const nextCard = deck[(cardIndex + 1) % deck.length];

  const makeDeckCallback = useCallback(() => {setDeck(make_deck(mode, plants, birds)); max_index = 0}, [mode])

  useEffect(makeDeckCallback, [makeDeckCallback]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location) {
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
    flushSync(() => setFlipped(false));
    flushSync(() => setIndex(prev => prev + 1));
  };

  const backAction = () => {
    if (cardIndex === 0) { return; }
    flushSync(() => setFlipped(false));
    flushSync(() => setIndex(prev => prev - 1));
  };

  if (cardIndex > max_index) {
    max_index = cardIndex;
    trackCardView();
  }

  const [flipped, setFlipped] = useState(false);

  const toggleFlipped = () => {
    flushSync(() => setFlipped(!flipped));
  };

  useEffect(() => {
    const handleKeyDown = (event: { key: any; preventDefault: () => void; }) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          flushSync(() => setFlipped(true));
          break;
        case ' ':
          event.preventDefault();
          flushSync(() => setFlipped(prev => !prev));
          break;
        case 'ArrowRight':
          event.preventDefault();
          nextAction();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          backAction();
          break;
        case 'Escape':
          event.preventDefault();
          if (showSettings) {
            setShowSettings(false);
          }
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
  }, []);

  const elementRef = useRef<HTMLDivElement>(null);
  const [elementWidth, setElementWidth] = useState(0);

  useLayoutEffect(() => {
    if (elementRef.current) {
      setElementWidth(elementRef.current.offsetWidth);
    }
  }, []);

  const toggleMode = () => {
    const nextMode = mode === 'plants' ? 'birds' : mode === 'birds' ? 'both' : 'plants';
    setMode(nextMode);
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

  const handlePreloadCards = () => {
    if (isPreloaded || isPreloading) return;

    setIsPreloading(true);

    const imageUrls: string[] = [];

    // Add all bird and plant card images
    [...birds, ...plants].forEach(card => {
      imageUrls.push(`/cards/${card.front}`);
      imageUrls.push(`/cards/${card.back}`);
    });


    setPreloadProgress({ current: 0, total: imageUrls.length, isVisible: true });

    let loadedCount = 0;

    for (let i = 0; i < imageUrls.length; i++) {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        setPreloadProgress(prev => ({ ...prev, current: loadedCount }));
        if (loadedCount === imageUrls.length) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('pwa-cards-preloaded', 'true');
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
    <HamburgerMenu ref={hamburgerRef} mode={mode} changeModeClicked={changeModeClicked} settingsClicked={settingsButtonClicked} />

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
      isPreloading={isPreloading}
    />

    <Card card={currentCard} flipped={flipped} widthRef={elementRef} flipSpeed={flipSpeed} onClick={toggleFlipped}/>
    <div id="button-container" style={{ width: `calc(${elementWidth}px)` }}>
      <button id="back-button" className="control-button" onClick={backAction}>
        <img src="/arrow-left-solid-full.svg" alt="Previous card" />
      </button>
      <button id="next-button" className="control-button" onClick={nextAction}>
        <img src="/arrow-right-solid-full.svg" alt="Next card" />
      </button>
    </div>
    {nextCard && <link rel="preload" href={`/cards/${nextCard} Front.png`} as="image" />}
    {nextCard && <link rel="preload" href={`/cards/${nextCard} Back.png`} as="image" />}
  </main>)
}
