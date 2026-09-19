import { useEffect, useState } from 'react';
import { listUploadedDecks, loadUploadedDeck } from './uploadedDecks';
import type { DeckDef } from '~/data/decks';

/**
 * Upload decks live in IndexedDB, so they can only be listed after mount.
 * Returns the (initially empty) list of uploaded decks as ready-to-render
 * DeckDefs with blob: photo URLs, plus a manual reload for after
 * import/delete. Failures (no IndexedDB, private mode) degrade to an empty
 * list — the built-in decks keep working.
 */
export function useUploadedDecks(): { decks: DeckDef[]; reload: () => void } {
  const [decks, setDecks] = useState<DeckDef[]>([]);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listUploadedDecks()
      .then(async (summaries) => {
        const defs = await Promise.all(summaries.map((summary) => loadUploadedDeck(summary.id).catch(() => null)));
        if (!cancelled) setDecks(defs.filter((def): def is DeckDef => def !== null));
      })
      .catch(() => {
        // No IndexedDB available: only the built-in decks are offered.
        // State stays as-is so consumers don't needlessly re-render.
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  return { decks, reload: () => setReloadTick((tick) => tick + 1) };
}
