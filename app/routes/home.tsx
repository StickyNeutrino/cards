import type { Route } from "./+types/home";
import { Card } from "~/card/card";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { birds, plants } from "./card-lists";
import { trackCardView } from "~/viewtrack";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Flash Cards" },
    { name: "description", content: "SD Canyonlands Flashcards" },
  ];
}

const invasives = [
"Arundo",
"Castor",
"Ox Tongue",
"Crown Daisy",
"Peruvian Pepper",
"Tamarisk",
"Cape Ivy",
"Thistle",
"Fennel",
"Jade",
"Himalayan Blackberry",
"Blue Plumbago",
"Brazilian Pepper",
"Sweet Pea",
"Cheeseweed",
"African Flag",
"Bridal Creeper",
"Beggarticks",
"Poison Hemlock",
"Purple Fountain Grass",
"Myoporum",
"Mexican Fan Palm",
"Tree Tobacco",
"Horehound",
"Mustard",
"Ice Plant",
"Canary Island Date Palm",
"Radish",
"Stinkwort",
"Curly Dock",
"Acacia",
"Pampas Grass",
"Umbrella Sedge",
"Nasturtium",
]

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array: any[]) {
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

let deck: string[] = []

const make_deck = (mode: 'plants' | 'birds' | 'both') => {
  let cards: string[];
  if (mode === 'plants') {
    cards = plants.map(card => card.name);
  } else if (mode === 'birds') {
    cards = birds.map(card => card.name);
  } else { // both
    cards = [...plants, ...birds].map(card => card.name);
  }
  deck = [...new Array(10)].flatMap(() => shuffle([...cards]));
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

  const currentCard = deck[cardIndex % deck.length];
  const nextCard = deck[(cardIndex + 1) % deck.length];

  useEffect(() => {
    make_deck(mode); // Initialize deck immediately
  }, []);

  const makeDeckCallback = useCallback(() => make_deck(mode), [mode])

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
    setIndex(cardIndex + 1);
  };

  const backAction = () => {
    if (cardIndex === 0) { return; }
    setIndex(cardIndex - 1);
  };

  if (cardIndex > max_index) {
    max_index = cardIndex;
    trackCardView();
  }

  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: { key: any; }) => {
      switch (event.key) {
        case 'ArrowUp':
          setFlipped(true);
          break;
        case 'ArrowRight':
          nextAction();
          break;
        case 'ArrowLeft':
          backAction();
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
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);


    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [cardIndex]); 

  const invasive = invasives.includes(currentCard);

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
    make_deck(nextMode); // Immediately update deck
    setIndex(0); // Reset to first card when switching
  };

  const handlePreloadCards = () => {
    if (isPreloaded || isPreloading) return;

    setIsPreloading(true);

    const preloadImages = async () => {
      const imageUrls: string[] = [];

      // Add all bird and plant card images
      [...birds, ...plants].forEach(card => {
        imageUrls.push(`/cards/${card.front}`);
        imageUrls.push(`/cards/${card.back}`);
      });

      console.log(`Manually preloading ${imageUrls.length} card images...`);

      setPreloadProgress({ current: 0, total: imageUrls.length, isVisible: true });

      let loadedCount = 0;

      for (let i = 0; i < imageUrls.length; i += 1) {
        await new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                loadedCount++;
                setPreloadProgress(prev => ({ ...prev, current: loadedCount }));
                resolve(void 0);
              };
              img.onerror = () => {
                loadedCount++;
                setPreloadProgress(prev => ({ ...prev, current: loadedCount }));
                resolve(void 0); // Continue even if image fails
              };
              img.src = imageUrls[i];
            }
          )
        
      }

      console.log('All card images preloaded for offline use');

      // Mark as preloaded in localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('pwa-cards-preloaded', 'true');
      }
      setIsPreloaded(true);
      setIsPreloading(false);

      // Hide progress bar after a short delay
      setTimeout(() => {
        setPreloadProgress(prev => ({ ...prev, isVisible: false }));
      }, 2000);
    };

    preloadImages();
  };

  return (
  <main>
    <div className="hamburger-menu">
      <button onClick={toggleMode} className="menu-button">
        {mode === 'plants' ? "🌿 Plants" : mode === 'birds' ? "🐦 Birds" : "🌿🐦 Both"}
      </button>
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="menu-button ml-2"
        title="Settings"
      >
        ⚙️
      </button>
    </div>

    {/* Settings Popup */}
    {showSettings && (
      <div className="fixed top-20 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-64">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Settings</h3>

        {/* Preload Button */}
        <div className="space-y-2">
          <button
            onClick={handlePreloadCards}
            disabled={isPreloaded || isPreloading}
            className={`w-full px-4 py-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 text-sm font-medium ${
              isPreloaded
                ? 'bg-green-100 text-green-800 cursor-not-allowed'
                : isPreloading
                ? 'bg-blue-100 text-blue-800 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <span>{isPreloaded ? '✅' : isPreloading ? '⏳' : '📥'}</span>
            <span>
              {isPreloaded
                ? 'Cards Downloaded'
                : isPreloading
                ? 'Downloading...'
                : 'Download for Offline'}
            </span>
          </button>

          {isPreloaded && (
            <p className="text-xs text-gray-600 text-center">
              All cards are cached for offline use
            </p>
          )}
        </div>
      </div>
    )}

    {/* Progress Bar */}
    {preloadProgress.isVisible && (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg px-4 py-2 border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-600 font-medium">
            {isPreloading ? 'Downloading cards for offline use...' : 'Preloading cards for offline use...'}
          </div>
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300 ease-out"
              style={{ width: `${(preloadProgress.current / preloadProgress.total) * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-500">
            {preloadProgress.current}/{preloadProgress.total}
          </div>
        </div>
      </div>
    )}

    <Card card={currentCard} invasive={invasive} flipped={flipped} widthRef={elementRef}/>
    <div id="button-container" style={{ width: `calc(${elementWidth}px)` }}>
      <button id="back-button" className="control-button" onClick={backAction}>
        <img src="/arrow-left-solid-full.svg" alt="Previous card" />
      </button>
      <button id="next-button" className="control-button" onClick={nextAction}>
        <img src="/arrow-right-solid-full.svg" alt="Next card" />
      </button>
    </div>
    <link rel="preload" href={`/cards/${nextCard} Front.png`} as="image" />
    <link rel="preload" href={`/cards/${nextCard} Back.png`} as="image" />
  </main>)
}
