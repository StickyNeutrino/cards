import type { Route } from "./+types/home";
import { Card } from "~/card/card";
import type { DataCardModel } from "~/card/dataCard";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { trackCardView } from "~/viewtrack";
import {
  deckFromLocationOrStorage, make_deck, modesForDeck, defaultCategoryFor, BOTH_MODE, type DeckId, type DeckMode,
} from "~/utils/deckUtils";
import {
  importDeckZip, deleteUploadedDeck, listUploadedDecks, loadUploadedDeck,
} from "~/utils/uploadedDecks";
import { ALL_CATEGORY_IDS, DECK_DEFS, DEFAULT_DECK_ID, type DeckCard, type DeckDef } from "~/data/decks";
import { Settings } from "~/components/Settings";
import { PreloadProgress } from "~/components/PreloadProgress";
import { HamburgerMenu, type DeckUploadState } from "~/components/HamburgerMenu";

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
  /** Present for cardFormat "data" decks; rendered as HTML by DataCard. */
  dataCard?: DataCardModel;
}

interface DeckRefs {
  categories: Array<{ id: string; label: string; cards: CardRef[] }>;
  byName: Map<string, CardRef>;
  all: CardRef[];
}

function refsFromDef(def: DeckDef): DeckRefs {
  const isData = def.cardFormat === 'data';
  const categories = def.categories.map((cat) => ({
    id: cat.id,
    label: cat.label,
    cards: cat.cards.map((c: DeckCard): CardRef => ({
      name: c.name,
      front: c.front ?? '',
      back: c.back ?? '',
      invasive: c.invasive ?? false,
      dataCard: isData
        ? {
            name: c.name,
            commonName: c.commonName,
            layout: c.layout,
            photos: (c.photos ?? []).map((p) => ({
              src: p.file,
              role: p.role,
              alt: p.alt,
              credit: p.credit,
              focus: p.focus,
            })),
            altNames: c.altNames,
            sciName: c.sciName,
            familyCommon: c.familyCommon,
            familyLatin: c.familyLatin,
            native: c.native,
            rarity: c.rarity,
            invasive: c.invasive ?? false,
          }
        : undefined,
    })),
  }));
  const all = categories.flatMap((c) => c.cards);
  return { categories, byName: new Map(all.map((c) => [c.name, c])), all };
}

let max_index = 0;

export default function Home() {
  const navigate = useNavigate();
  const [cardIndex, setIndex] = useState(0);
  if (cardIndex < 0) { setIndex(0) }

  const [deck, setDeck] = useState<DeckId>(() => {
    if (typeof window !== 'undefined') {
      return deckFromLocationOrStorage(window.location.search, DECK_DEFS.map((d) => d.id));
    }
    return DECK_DEFS[0]?.id ?? 'canyonlands';
  });

  // Uploaded decks live in IndexedDB, so they are only known after mount.
  const [uploadedDecks, setUploadedDecks] = useState<DeckDef[]>([]);
  const deckRef = useRef(deck);
  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);

  useEffect(() => {
    let cancelled = false;
    listUploadedDecks()
      .then(async (summaries) => {
        const defs = (await Promise.all(summaries.map((s) => loadUploadedDeck(s.id).catch(() => null))))
          .filter((d): d is DeckDef => d !== null);
        if (cancelled || defs.length === 0) return;
        // Only update state when decks actually loaded: replacing an empty
        // list with another empty list would still rebuild (and reshuffle)
        // the active deck for no reason.
        setUploadedDecks(defs);
        // Uploaded deck ids are only known now — honor a saved or linked one
        // (the switch below runs exactly once, right after this initial load;
        // later import/delete updates must not re-resolve and undo the user's
        // choice, e.g. the automatic switch to a freshly imported deck).
        const knownIds = [...DECK_DEFS.map((d) => d.id), ...defs.map((d) => d.id)];
        const resolved = deckFromLocationOrStorage(window.location.search, knownIds);
        if (resolved !== deckRef.current) {
          setDeck(resolved);
          setMode(defaultCategoryFor(defs.find((d) => d.id === resolved) ?? DECK_DEFS[0]));
          // Keep selectedCard: a ?card= deep link must survive the resolution
          // (the existing deep-link effects re-target it once deckNames
          // rebuild). Flipped resets with the deck switch.
          setFlipped(false);
          setIndex(0);
        }
      })
      .catch(() => {
        // No IndexedDB available (or storage blocked): only built-in decks.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const allDefs = useMemo(() => [...DECK_DEFS, ...uploadedDecks], [uploadedDecks]);
  const defFor = useCallback((id: DeckId) => allDefs.find((d) => d.id === id), [allDefs]);

  const [mode, setMode] = useState<DeckMode>(() => {
    const defaultMode = defaultCategoryFor(DECK_DEFS[0] ?? { id: '', label: '', categories: [] });
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      for (const m of ALL_CATEGORY_IDS) {
        if (params.has(m)) return m;
      }
      if (params.has(BOTH_MODE)) return BOTH_MODE;
      const saved = localStorage.getItem('mode');
      if (saved) return saved;
      return defaultMode;
    }
    return defaultMode;
  })

  const cardRefs = useMemo(() => {
    const map = new Map<DeckId, DeckRefs>();
    for (const def of allDefs) map.set(def.id, refsFromDef(def));
    return map;
  }, [allDefs]);
  const activeDeck = cardRefs.get(deck) ?? cardRefs.get(DECK_DEFS[0]?.id ?? '')!;

  const makeDeck = useCallback((d: DeckId, m: DeckMode) => {
    return make_deck(defFor(d)?.categories ?? [], m);
  }, [defFor]);

  const [deckNames, setDeckNames] = useState<string[]>(() => makeDeck(deck, mode));
  const [preloadProgress, setPreloadProgress] = useState<{ current: number; total: number; isVisible: boolean }>({
    current: 0,
    total: 0,
    isVisible: false
  });
  const preloadKey = deck === 'healthy-canyons' ? 'pwa-cards-preloaded-healthy' : 'pwa-cards-preloaded';
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

  // If the saved mode does not exist in this deck, fall back to its first category.
  useEffect(() => {
    const def = defFor(deck) ?? DECK_DEFS[0];
    if (!modesForDeck(def).includes(mode)) {
      setMode(defaultCategoryFor(def));
    }
  }, [deck, mode, defFor]);

  useEffect(() => {
    if (selectedCard) {
      const index = deckNames.findIndex(card => card === selectedCard);
      if (index !== -1) {
        setIndex(index);
      } else {
        // Card not found in current mode: switch to the category that owns it.
        const owner = activeDeck.categories.find((cat) =>
          cat.cards.some((c) => c.name === selectedCard))?.id;
        if (owner && mode !== owner && mode !== BOTH_MODE) {
          setMode(owner);
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
      for (const catId of ALL_CATEGORY_IDS) {
        url.searchParams.delete(catId);
      }
      url.searchParams.delete(BOTH_MODE);
      if (deck !== (DECK_DEFS[0]?.id ?? '')) {
        url.searchParams.set("deck", deck);
      } else {
        url.searchParams.delete("deck");
      }
      if (mode !== defaultCategoryFor(defFor(deck) ?? DECK_DEFS[0])) {
        url.searchParams.set(mode, "true");
      }
      window.history.replaceState({}, "", url.toString());
    }
  }, [mode, deck, defFor]);

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

  // The nav button row matches the visible card's width. The card's width
  // element (back <img> for image decks, canvas for data decks) is replaced
  // whenever the deck changes, so track the element itself (not just its size)
  // and re-attach the ResizeObserver to each new element.
  const [cardImg, setCardImg] = useState<HTMLElement | null>(null);
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
    const modes = modesForDeck(defFor(deck) ?? DECK_DEFS[0]);
    const nextMode = modes[(modes.indexOf(mode) + 1) % modes.length] as DeckMode;
    setMode(nextMode);
    setSelectedCard(null);
    setFlipped(false); // Show the front of the new deck's first card
    setIndex(0); // Reset to first card when switching
  };

  const switchDeck = (next: DeckId, defOverride?: DeckDef) => {
    if (next === deck) return;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('card');
      window.history.replaceState({}, "", url.toString());
    }
    setDeck(next);
    // defOverride: the caller may have the def at hand (e.g. straight after
    // import, before the registry state — and thus defFor — includes it).
    setMode(defaultCategoryFor(defOverride ?? defFor(next) ?? DECK_DEFS[0]));
    setSelectedCard(null);
    setFlipped(false);
    setIndex(0);
  };

  // ---- Uploaded decks: import, feedback, and deletion ----

  const [uploadState, setUploadState] = useState<DeckUploadState>({ status: 'idle' });
  const uploadNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (uploadNoticeTimer.current) clearTimeout(uploadNoticeTimer.current);
  }, []);

  const handleUploadDeck = async (file: File) => {
    setUploadState({ status: 'importing' });
    try {
      const { id, label } = await importDeckZip(file);
      const def = await loadUploadedDeck(id);
      setUploadedDecks((prev) => [...prev.filter((d) => d.id !== id), def]);
      setUploadState({ status: 'success', message: `Imported “${label}”` });
      switchDeck(id, def);
      if (uploadNoticeTimer.current) clearTimeout(uploadNoticeTimer.current);
      // Success notices self-dismiss; errors stay until the next attempt.
      uploadNoticeTimer.current = setTimeout(() => setUploadState({ status: 'idle' }), 5000);
    } catch (error) {
      setUploadState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Import failed.',
      });
    }
  };

  const handleDeleteDeck = async (id: DeckId) => {
    try {
      await deleteUploadedDeck(id);
    } catch (error) {
      setUploadState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Delete failed.',
      });
      return;
    }
    setUploadedDecks((prev) => prev.filter((d) => d.id !== id));
    if (deck === id) switchDeck(DEFAULT_DECK_ID);
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

  const isDataDeck = defFor(deck)?.cardFormat === 'data';

  const handlePreloadCards = () => {
    // Data decks keep their photos in IndexedDB — nothing to download.
    if (isDataDeck || isPreloaded || isPreloading) return;

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
      decks={allDefs}
      changeModeClicked={changeModeClicked}
      changeDeckClicked={switchDeck}
      uploadDeckClicked={handleUploadDeck}
      uploadState={uploadState}
      deleteDeckClicked={handleDeleteDeck}
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
      canPreload={!isDataDeck}
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
        dataCard={currentCard?.dataCard}
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
    {/* Data cards have no network images (blob: URLs), so only image decks preload. */}
    {nextCard?.front && <link rel="preload" href={nextCard.front} as="image" />}
    {nextCard?.back && <link rel="preload" href={nextCard.back} as="image" />}
  </main>)
}

function preloadKeyFor(deck: DeckId): string {
  return deck === 'healthy-canyons' ? 'pwa-cards-preloaded-healthy' : 'pwa-cards-preloaded';
}