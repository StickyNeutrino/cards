import { useCallback, useEffect, useRef, useState } from 'react';
import { listUploadedDecks, loadUploadedDeck, type UploadedDeckSummary } from './uploadedDecks';
import { withCachedPhotos } from './lightPhotos';
import type { DeckDef } from '~/data/decks';

/**
 * A stored deck whose record fails to load still shows up in Manage Decks
 * (empty, with its delete button) instead of silently vanishing together
 * with the storage it is stuck holding.
 */
function stubDeckFor(summary: UploadedDeckSummary): DeckDef {
  return {
    id: summary.id,
    label: summary.label,
    description: summary.description,
    cardFormat: summary.cardFormat,
    categories: [],
    uploaded: true,
  };
}

/**
 * Uploaded decks live in IndexedDB, so they can only be listed after mount.
 * Returns the (initially empty) list of uploaded decks as ready-to-render
 * DeckDefs with blob: photo URLs, plus a manual reload for after
 * import/delete and an applyPhotos patcher for when a light deck's remote
 * photos land in the cache (the affected cards swap to their local blob:
 * URLs without reloading the decks). Failures (no IndexedDB, private mode)
 * degrade to an empty list — the built-in decks keep working.
 */
export function useUploadedDecks(): {
  decks: DeckDef[];
  reload: () => void;
  /** Swap freshly cached photos (remote url -> blob: URL) into one deck. */
  applyPhotos: (id: string, photos: Map<string, string>) => void;
} {
  const [decks, setDecks] = useState<DeckDef[]>([]);
  const [reloadTick, setReloadTick] = useState(0);

  /**
   * Object URL generations, newest last. loadUploadedDeck hands out fresh
   * blob: URLs on every load and they are never revoked eagerly — an <img>
   * may still be painted with one until React commits the replacement — but
   * every reload on a long-lived page would otherwise pile up another full
   * set. So when a load completes, the generation that stopped being
   * displayed two loads ago is certainly unrendered and gets revoked; the
   * immediately previous one is kept for one more cycle. Everything is
   * revoked on unmount, when the DOM that could reference the URLs is gone.
   */
  const urlGenerationsRef = useRef<string[][]>([]);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    listUploadedDecks()
      .then(async (summaries) => {
        const defs = await Promise.all(
          summaries.map((summary) => loadUploadedDeck(summary.id, (url) => urls.push(url)).catch(() => stubDeckFor(summary))),
        );
        if (cancelled) {
          // Nothing ever rendered these; reclaim them right away.
          for (const url of urls) URL.revokeObjectURL(url);
          return;
        }
        setDecks(defs);
        const generations = urlGenerationsRef.current;
        const retired = generations.slice(0, -1).flat();
        urlGenerationsRef.current = [...generations.slice(-1), urls];
        for (const url of retired) URL.revokeObjectURL(url);
      })
      .catch(() => {
        // No IndexedDB available: only the built-in decks are offered.
        // State stays as-is so consumers don't needlessly re-render.
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  useEffect(() => () => {
    for (const url of urlGenerationsRef.current.flat()) URL.revokeObjectURL(url);
  }, []);

  const applyPhotos = useCallback((id: string, photos: Map<string, string>) => {
    // The new blob: URLs back the currently displayed decks — they belong to
    // the newest generation and are reclaimed with it.
    const generations = urlGenerationsRef.current;
    if (generations.length > 0) generations[generations.length - 1].push(...photos.values());
    setDecks((prev) => prev.map((def) => (def.id === id ? withCachedPhotos(def, photos) : def)));
  }, []);

  return { decks, reload: () => setReloadTick((tick) => tick + 1), applyPhotos };
}
