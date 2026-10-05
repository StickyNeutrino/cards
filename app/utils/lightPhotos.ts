/**
 * On-demand photo cache for light decks (DECK_FORMAT.md "Light decks"): a
 * light deck stores only its manifest — every photo references a remote
 * https URL, and the bytes are fetched and cached in the photo store under
 * that URL (`${deckId}/${url}`, the same key space a bundled import would
 * use) the first time they are needed.
 *
 * Three flows fill the cache, in increasing scope:
 * - the study page warms the next few cards while you study,
 * - the card lists page fetches the whole deck (every thumbnail is wanted
 *   at once there),
 * - the explicit "Download for Offline" settings action fetches the whole
 *   deck with progress reporting, like the image decks' preload.
 *
 * Nothing here is ever automatic beyond what is being looked at: until one
 * of those flows runs, uncached photos simply render from their remote URL,
 * so browsing costs only the bandwidth of the photos actually shown.
 */
import type { DeckDef } from '~/data/decks';
import { putStoredPhoto, storedPhotoKeys } from './deckStore';

/**
 * iNat photo URLs differ only in the size segment
 * (`/photos/<id>/<size>.jpg`). A light deck references the original; if
 * those exact bytes can't be fetched (a photo was replaced or rotated away
 * since curation), the smaller variants of the SAME image are tried before
 * giving up — the same ladder the curator climbs when it downloads a pick.
 * The cached bytes are stored under the manifest's URL either way, so the
 * manifest never has to change. URLs that don't match the iNat shape are
 * fetched literally, with nothing to fall back to.
 */
const SIZE_SEGMENT = /^(https:\/\/[^/]+\/photos\/\d+\/)(square|thumb|small|medium|large|original)(\.\w+)$/;
const VARIANT_SIZES = ['original', 'large', 'medium'] as const;

function photoVariantUrls(url: string): string[] {
  const match = SIZE_SEGMENT.exec(url);
  if (!match) return [url];
  const [, base, , ext] = match;
  return VARIANT_SIZES.map((size) => `${base}${size}${ext}`);
}

/** Fetches are capped so a few-hundred-photo download doesn't hammer the
 *  host from one browser tab; each URL gets a couple of tries on transient
 *  failures (network errors, 5xx, rate limiting) before the next variant. */
const FETCH_CONCURRENCY = 5;
const FETCH_ATTEMPTS = 2;
/** Below this a "successful" response is an error page or empty body, not a
 *  photo. Deliberately tiny: legitimate small variants exist. */
const MIN_IMAGE_BYTES = 100;

/** Fetch one photo, trying the smaller iNat size variants of the same image
 *  when the referenced size is gone, and retrying transient failures. */
async function fetchPhotoBlob(url: string, signal?: AbortSignal): Promise<Blob> {
  let lastError: unknown;
  for (const candidate of photoVariantUrls(url)) {
    for (let attempt = 0; attempt < FETCH_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(candidate, { signal });
        if (!res.ok) {
          // 4xx: this variant doesn't exist — try the next size. 5xx and
          // 429 are transient (or throttling): retry the same URL.
          lastError = new Error(`HTTP ${res.status}`);
          if (res.status >= 500 || res.status === 429) continue;
          break;
        }
        const type = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
        const buffer = await res.arrayBuffer();
        if (!type.startsWith('image/') || buffer.byteLength < MIN_IMAGE_BYTES) {
          // A non-image or truncated body won't render — the next size
          // might, but this one never will.
          lastError = new Error(`not an image (${type || 'unknown type'}, ${buffer.byteLength} bytes)`);
          break;
        }
        return new Blob([buffer], { type });
      } catch (err) {
        if (signal?.aborted) throw err;
        lastError = err;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('fetch failed');
}

/** True when the deck is a light deck: its photos are referenced by remote
 *  URL rather than bundled files. `format` is present on records imported
 *  by the current app version; the photo check also recognizes decks
 *  imported before it was stored. */
export function isLightDeck(def: DeckDef): boolean {
  return (
    def.format === 'lite' ||
    def.categories.some((category) =>
      category.cards.some((card) => (card.photos ?? []).some((photo) => !!photo.url)),
    )
  );
}

/** The unique remote photo URLs a light deck references, in manifest order.
 *  Two cards may share one URL — it is fetched and cached once. */
export function lightPhotoUrls(def: DeckDef): string[] {
  const urls = new Set<string>();
  for (const category of def.categories) {
    for (const card of category.cards) {
      for (const photo of card.photos ?? []) {
        if (photo.url) urls.add(photo.url);
      }
    }
  }
  return [...urls];
}

/** Options for ensureLightPhotos. */
export interface EnsureLightPhotosOptions {
  /** Progress after each URL is settled: (settled, total). URLs already
   *  cached count immediately, so a partially cached deck starts out ahead. */
  onProgress?: (done: number, total: number) => void;
}

export interface EnsureLightPhotosResult {
  /** Object URLs for the photos fetched by this call, keyed by the
   *  manifest's URL. Already-cached photos are not included — callers keep
   *  the blob: URL they resolved at load time. */
  cached: Map<string, string>;
  /** URLs that could not be fetched in any size variant. The rest of the
   *  deck is still cached — the caller decides whether that is fatal. */
  failed: string[];
}

/**
 * Make sure the given photo URLs of a light deck are cached in the photo
 * store, fetching and storing the missing ones (concurrency-capped, with
 * per-URL retries and size-variant fallbacks). Resolves with the newly
 * cached photos as object URLs; failures are collected, never thrown, so
 * background flows can be fire-and-forget.
 */
export async function ensureLightPhotos(
  deckId: string,
  urls: string[],
  options: EnsureLightPhotosOptions = {},
): Promise<EnsureLightPhotosResult> {
  const total = urls.length;
  const cached = new Map<string, string>();
  const failed: string[] = [];
  if (total === 0) return { cached, failed };

  const alreadyCached = await storedPhotoKeys(deckId);
  let next = 0;
  let done = 0;
  const worker = async (): Promise<void> => {
    while (next < total) {
      const url = urls[next++];
      if (alreadyCached.has(url) || cached.has(url)) {
        // Cached before this call (or twice in the list): nothing to fetch,
        // but the caller's progress still counts it.
        done++;
        options.onProgress?.(done, total);
        continue;
      }
      try {
        const blob = await fetchPhotoBlob(url);
        await putStoredPhoto(deckId, url, blob);
        cached.set(url, URL.createObjectURL(blob));
      } catch {
        failed.push(url);
      }
      done++;
      options.onProgress?.(done, total);
    }
  };
  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, total) }, worker));
  return { cached, failed };
}

/** True when every listed URL is already cached for this deck. */
export async function areLightPhotosCached(deckId: string, urls: string[]): Promise<boolean> {
  const cached = await storedPhotoKeys(deckId);
  return urls.every((url) => cached.has(url));
}

/**
 * The localStorage key marking a light deck as fully downloaded for offline
 * use (the study page's "Download for Offline" affordance reads it, and any
 * flow that completes the cache sets it).
 */
export function lightPreloadKey(deckId: string): string {
  return `pwa-cards-preloaded-${deckId}`;
}

/**
 * Swap freshly cached photos into a loaded deck def: every photo whose
 * remote `url` appears in `cached` and that has no local bytes yet gets the
 * blob: URL as its `file` (photos already resolved keep the URL they got at
 * load time). Returns the same object when nothing matches, so callers can
 * skip a state update.
 */
export function withCachedPhotos(def: DeckDef, cached: Map<string, string>): DeckDef {
  let changed = false;
  const categories = def.categories.map((category) => ({
    ...category,
    cards: category.cards.map((card) => {
      const photos = card.photos ?? [];
      if (!photos.some((photo) => photo.url && !photo.file && cached.has(photo.url))) {
        return card;
      }
      changed = true;
      return {
        ...card,
        photos: photos.map((photo) => {
          const blobUrl = photo.url && !photo.file ? cached.get(photo.url) : undefined;
          return blobUrl ? { ...photo, file: blobUrl } : photo;
        }),
      };
    }),
  }));
  return changed ? { ...def, categories } : def;
}
