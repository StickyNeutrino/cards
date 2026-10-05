import type { Route } from "./+types/home";
import { Card } from "~/card/card";
import type { DataCardModel } from "~/card/dataCard";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { trackCardView } from "~/viewtrack";
import {
  deckFromLocationOrStorage, make_deck, modesForDeck, defaultCategoryFor, BOTH_MODE, type DeckId, type DeckMode,
} from "~/utils/deckUtils";
import { listUploadedDecks, loadUploadedDeck } from "~/utils/uploadedDecks";
import {
  areLightPhotosCached, ensureLightPhotos, isLightDeck, lightPhotoUrls, lightPreloadKey, withCachedPhotos,
} from "~/utils/lightPhotos";
import { ALL_CATEGORY_IDS, DECK_DEFS, type DeckCard, type DeckDef } from "~/data/decks";
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
              // Light decks fetch photos on demand: a photo that isn't
              // cached yet has no local bytes (empty file) and renders from
              // its remote URL until the cache fill swaps in a blob: URL.
              src: p.file || p.url || '',
              role: p.role,
              alt: p.alt,
              credit: p.credit,
              crop: p.crop,
              focus: p.focus,
            })),
            altNames: c.altNames,
            sciName: c.sciName,
            familyCommon: c.familyCommon,
            familyLatin: c.familyLatin,
            native: c.native,
            rarity: c.rarity,
            invasive: c.invasive ?? false,
            border: c.border,
          }
        : undefined,
    })),
  }));
  const all = categories.flatMap((c) => c.cards);
  return { categories, byName: new Map(all.map((c) => [c.name, c])), all };
}

let max_index = 0;

/** How many cards ahead of the current one to keep cached. Light decks
 *  stream their photos from the network; the upcoming ones are fetched in
 *  the background so advancing never waits on it. */
const PHOTO_LOOKAHEAD = 4;

/** Card names the given mode covers, in manifest order — the membership the
 *  study cycle is built from. */
function modeCardNames(def: DeckDef | undefined, mode: DeckMode): string[] {
  const categories = def?.categories ?? [];
  const cards = mode === BOTH_MODE
    ? categories.flatMap((c) => c.cards)
    : (categories.find((c) => c.id === mode)?.cards ?? []);
  return cards.map((c) => c.name);
}

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

  // The URL-cleanup effect rewrites the address as soon as effects run (it
  // scrubs params that built-in decks don't recognize), but uploaded decks
  // are only known after IndexedDB loads. Snapshot the address at first
  // render so the honor-once resolution below still sees ?deck=/?card=
  // links that point at uploaded decks.
  const initialSearchRef = useRef(typeof window !== "undefined" ? window.location.search : "");

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
        // this effect must not re-run later or it would re-resolve and undo
        // the user's deck choice).
        const knownIds = [...DECK_DEFS.map((d) => d.id), ...defs.map((d) => d.id)];
        const resolved = deckFromLocationOrStorage(initialSearchRef.current, knownIds);
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

  const [deckNames, setDeckNames] = useState<string[]>(() => make_deck(defFor(deck)?.categories ?? [], mode));
  const [preloadProgress, setPreloadProgress] = useState<{ current: number; total: number; isVisible: boolean }>({
    current: 0,
    total: 0,
    isVisible: false
  });
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
  const [preloadError, setPreloadError] = useState<string | null>(null);
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

  // The study order is rebuilt (and reshuffled) only when the deck or its
  // card membership changes. Photo bytes streaming into a light deck's cache
  // swap photo URLs on the loaded deck without ever changing card names —
  // the membership key below is identical across those patches, so the order
  // stays put while photos load in (previously every patch reshuffled the
  // deck, visibly changing the card under the user).
  const modeCardKey = useMemo(
    () => modeCardNames(defFor(deck), mode).join('\n'),
    [defFor, deck, mode],
  );

  useEffect(() => {
    setDeckNames(make_deck(defFor(deck)?.categories ?? [], mode));
    max_index = 0;
    // defFor is deliberately omitted: it changes identity on every photo
    // patch, but the membership key above captures every change that should
    // rebuild the order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, mode, modeCardKey]);

  // Light-deck photos that failed to cache this session: skipped by later
  // look-ahead runs so a dead photo can't be re-fetched on every flip (the
  // card still renders it from its remote URL when online). Cleared when
  // the deck changes.
  const failedLightUrlsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    failedLightUrlsRef.current = new Set();
  }, [deck]);

  // Light decks load like the bundled ones but fetch their photos on
  // demand: warm the cache for the next few cards while studying, and swap
  // the freshly cached bytes into the loaded deck as they land (the cards
  // then render from local blob: URLs). Best-effort — failures are silent
  // because the card shows the remote image regardless.
  useEffect(() => {
    const def = defFor(deck);
    if (typeof window === 'undefined' || !def || !isLightDeck(def) || deckNames.length === 0) return;
    const skipped = failedLightUrlsRef.current;
    const urls = new Set<string>();
    for (let i = 0; i <= PHOTO_LOOKAHEAD; i++) {
      const name = deckNames[(cardIndex + i) % deckNames.length];
      for (const category of def.categories) {
        const card = category.cards.find((c) => c.name === name);
        if (!card) continue;
        // Uncached light photo: no local bytes yet (file is empty).
        for (const photo of card.photos ?? []) {
          if (photo.url && !photo.file && !skipped.has(photo.url)) urls.add(photo.url);
        }
        break;
      }
    }
    if (urls.size === 0) return;
    let cancelled = false;
    ensureLightPhotos(deck, [...urls])
      .then(async ({ cached, failed }) => {
        for (const url of failed) skipped.add(url);
        if (cancelled || cached.size === 0) return;
        // Did that complete the deck's cache? Then it studies offline —
        // remember it so the settings affordance shows it without offering
        // a redundant download. (Checked before the patch below, which
        // re-runs this effect and would cancel the answer.)
        const allUrls = lightPhotoUrls(def);
        const fullyCached = await areLightPhotosCached(deck, allUrls);
        setUploadedDecks((prev) => {
          let changed = false;
          const next = prev.map((d) => {
            if (d.id !== deck) return d;
            const patched = withCachedPhotos(d, cached);
            if (patched !== d) changed = true;
            return patched;
          });
          // Nothing actually swapped in (raced with another patch): keep
          // the old state rather than churning every deck's identity.
          return changed ? next : prev;
        });
        if (fullyCached) {
          localStorage.setItem(lightPreloadKey(deck), 'true');
          setIsPreloaded(true);
        }
      })
      .catch(() => {
        // Offline or no IndexedDB: the cards still render from their URLs.
        // Mark the batch skipped so the look-ahead doesn't retry it on
        // every flip.
        for (const url of urls) skipped.add(url);
      });
    return () => {
      cancelled = true;
    };
  }, [cardIndex, deckNames, deck, defFor]);

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

  const switchDeck = (next: DeckId) => {
    if (next === deck) return;
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('card');
      window.history.replaceState({}, "", url.toString());
    }
    setDeck(next);
    setMode(defaultCategoryFor(defFor(next) ?? DECK_DEFS[0]));
    setSelectedCard(null);
    setFlipped(false);
    setIndex(0);
    setPreloadError(null);
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

  const manageDecksClicked = () => {
    navigate('/decks')
  }

  const isDataDeck = defFor(deck)?.cardFormat === 'data';
  const preloadDef = defFor(deck);
  const activeIsLight = preloadDef ? isLightDeck(preloadDef) : false;
  // Light decks offer the offline download too; other data decks keep their
  // photos in IndexedDB — nothing to download.
  const canPreload = !isDataDeck || activeIsLight;

  const handlePreloadCards = () => {
    if (isPreloaded || isPreloading) return;

    if (activeIsLight) {
      // Fetch every photo of the light deck into the IndexedDB cache up
      // front, with the same progress affordance as the image decks' preload.
      const urls = lightPhotoUrls(preloadDef!);
      setIsPreloading(true);
      setPreloadError(null);
      setPreloadProgress({ current: 0, total: urls.length, isVisible: true });
      ensureLightPhotos(deck, urls, {
        onProgress: (current, total) => setPreloadProgress({ current, total, isVisible: true }),
      })
        .then(({ failed }) => {
          if (failed.length > 0) {
            // Some photos never arrived in any size variant: report it and
            // leave the button enabled for a retry.
            setPreloadError(
              `Could not fetch ${failed.length} photo${failed.length === 1 ? '' : 's'} — check your connection and try again.`,
            );
            return;
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem(preloadKeyFor(deck), 'true');
          }
          setIsPreloaded(true);
        })
        .catch(() => {
          setPreloadError('Could not download the deck\u2019s photos — check your connection and try again.');
        })
        .finally(() => {
          setIsPreloading(false);
          setTimeout(() => {
            setPreloadProgress(prev => ({ ...prev, isVisible: false }));
          }, 2000);
        });
      return;
    }

    if (isDataDeck) return;

    setIsPreloading(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(preloadKeyFor(deck), 'true');
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
            localStorage.setItem(preloadKeyFor(deck), 'true');
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
            localStorage.setItem(preloadKeyFor(deck), 'true');
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
      manageDecksClicked={manageDecksClicked}
      settingsClicked={settingsButtonClicked}
      cardListsClicked={cardListsButtonClicked}
    />

    <Settings
      ref={settingsRef}
      showSettings={showSettings}
      flipSpeed={flipSpeed}
      setFlipSpeed={setFlipSpeed}
      isPreloaded={isPreloaded}
      isPreloading={isPreloading}
      preloadError={preloadError}
      handlePreloadCards={handlePreloadCards}
      canPreload={canPreload}
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
  // Legacy keys for the built-in decks; every other deck gets its own.
  if (deck === 'canyonlands') return 'pwa-cards-preloaded';
  if (deck === 'healthy-canyons') return 'pwa-cards-preloaded-healthy';
  return lightPreloadKey(deck);
}
