import 'fake-indexeddb/auto';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import type { DeckDef } from '../../app/data/decks';
import {
  ensureLightPhotos, areLightPhotosCached, isLightDeck, lightPhotoUrls, lightPreloadKey, withCachedPhotos,
} from '../../app/utils/lightPhotos';
import { storedPhotoKeys } from '../../app/utils/deckStore';

// jsdom has no IndexedDB (fake-indexeddb/auto provides it) and no object URL
// factory; stub the latter so fetched photos can be handed out as URLs.
let urlCounter = 0;
beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    value: () => `blob:mock-${++urlCounter}`,
    writable: true,
  });
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, writable: true });
});

// The import pipeline checks fetched bytes' size and content type but never
// decodes them, so a 600-byte "JPEG" (real SOI…EOI header, zero filler) works
// as a stand-in for a real photo — comfortably above the 100-byte floor.
const JPEG = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);
const BIG_JPEG = new Uint8Array(600);
BIG_JPEG.set(JPEG, 0);

/** The remote photo sources a light manifest references (original size). */
const photoUrl = (id: number) => `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/original.jpg`;
const URL_MAIN = photoUrl(101);
const URL_SEC_1 = photoUrl(102);
const URL_SEC_2 = photoUrl(103);
const URL_WRENTIT = photoUrl(105);

const credit = { observer: 'joodles', license: 'cc-by-nc', observationUrl: 'https://www.inaturalist.org/observations/1', observationId: 1, placeLabel: 'San Diego' };

/** A small light deck: two plants (one sharing a photo URL) and a bird.
 *  Photos carry `file: ''` the way loadUploadedDeck produces them — no
 *  local bytes yet, so the UI falls back to the remote url. */
function lightDef(overrides: Partial<DeckDef> = {}): DeckDef {
  return {
    id: 'curated-test-deck',
    label: '🌿 Curated Test Deck',
    description: 'A fixture deck',
    cardFormat: 'data',
    format: 'lite',
    categories: [
      {
        id: 'plants',
        label: '🌿 Plants',
        cards: [
          {
            name: 'Dwarf Nettle',
            layout: 'photo-trio',
            photos: [
              { file: '', url: URL_MAIN, role: 'main', alt: 'Flowering stalk', credit },
              { file: '', url: URL_SEC_1, role: 'secondary', credit },
              { file: '', url: URL_SEC_2, role: 'secondary', credit: { observer: 'susanbar', license: 'cc0' } },
            ],
          },
          {
            // Shares Dwarf Nettle's main photo URL — cached once.
            name: 'Chamise',
            layout: 'photo-single',
            photos: [{ file: '', url: URL_MAIN, role: 'main', credit: { observer: 'alice', license: 'all-rights-reserved' } }],
          },
        ],
      },
      {
        id: 'birds',
        label: '🐦 Birds',
        cards: [
          {
            name: 'Wrentit',
            layout: 'photo-single',
            photos: [{ file: '', url: URL_WRENTIT, role: 'main', credit: { observer: 'bob', license: 'cc-by' } }],
          },
        ],
      },
    ],
    ...overrides,
  };
}

/** Serve photo bytes from an in-memory map, with per-URL overrides for
 *  failure shapes: an HTTP status number, an Error (network failure), or
 *  { status, type, bytes } for odd responses. */
function servePhotos(responses: Record<string, Uint8Array | number | Error | { status: number; type?: string; bytes?: Uint8Array }>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const value = responses[url];
    if (value === undefined) return new Response('not found', { status: 404 });
    if (typeof value === 'number') return new Response(null, { status: value });
    if (value instanceof Error) throw value;
    if (value instanceof Uint8Array) return new Response(value as unknown as BodyInit, { status: 200, headers: { 'content-type': 'image/jpeg' } });
    return new Response((value.bytes ?? null) as unknown as BodyInit, { status: value.status, headers: { 'content-type': value.type ?? 'image/jpeg' } });
  });
}

/** Unique deck id per test so the shared fake database stays isolated. */
let testCounter = 0;
function uniqueId(): string {
  return `curated-test-deck-${++testCounter}`;
}

beforeEach(() => {
  urlCounter = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isLightDeck', () => {
  it('recognizes the format marker and url-carrying photos', () => {
    expect(isLightDeck(lightDef())).toBe(true);
    const legacy = lightDef({ format: undefined });
    // Pre-marker records are recognized by their remote photo references.
    expect(isLightDeck(legacy)).toBe(true);
  });

  it('is false for decks with bundled photos', () => {
    const bundled = {
      ...lightDef(),
      format: undefined,
      categories: [{
        id: 'plants', label: '🌿 Plants',
        cards: [{ name: 'X', layout: 'photo-single' as const, photos: [{ file: 'photos/x.jpg', role: 'main' as const, credit }] }],
      }],
    };
    expect(isLightDeck(bundled)).toBe(false);
  });
});

describe('lightPhotoUrls', () => {
  it('lists each unique URL once, in manifest order', () => {
    expect(lightPhotoUrls(lightDef())).toEqual([URL_MAIN, URL_SEC_1, URL_SEC_2, URL_WRENTIT]);
  });
});

describe('ensureLightPhotos', () => {
  // Four unique URLs across five photo references (Chamise shares Dwarf
  // Nettle's main photo) — each fetched exactly once.
  const uniqueUrls = [URL_MAIN, URL_SEC_1, URL_SEC_2, URL_WRENTIT];

  it('fetches every referenced photo once and caches it under its URL', async () => {
    const id = uniqueId();
    vi.stubGlobal('fetch', servePhotos(Object.fromEntries(uniqueUrls.map((url) => [url, BIG_JPEG]))));
    const { cached, failed } = await ensureLightPhotos(id, uniqueUrls);

    expect(failed).toEqual([]);
    expect([...cached.keys()]).toEqual(uniqueUrls);
    expect([...cached.values()]).toEqual(['blob:mock-1', 'blob:mock-2', 'blob:mock-3', 'blob:mock-4']);
    const fetch = vi.mocked(globalThis.fetch);
    expect(fetch).toHaveBeenCalledTimes(uniqueUrls.length);
    for (const url of uniqueUrls) expect(fetch).toHaveBeenCalledWith(url, expect.anything());

    // The bytes landed in the photo store under `${deckId}/${url}`.
    expect(await storedPhotoKeys(id)).toEqual(new Set(uniqueUrls));
  });

  it('reports progress as (settled, total) with already-cached URLs counted', async () => {
    const id = uniqueId();
    vi.stubGlobal('fetch', servePhotos(Object.fromEntries(uniqueUrls.map((url) => [url, BIG_JPEG]))));
    await ensureLightPhotos(id, uniqueUrls);

    // Second run: nothing left to fetch, but progress still counts each URL.
    const fetch = vi.mocked(globalThis.fetch);
    fetch.mockClear();
    const onProgress = vi.fn();
    const { cached, failed } = await ensureLightPhotos(id, uniqueUrls, { onProgress });
    expect(cached.size).toBe(0);
    expect(failed).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledTimes(uniqueUrls.length);
    expect(onProgress).toHaveBeenLastCalledWith(uniqueUrls.length, uniqueUrls.length);
  });

  it('falls back to smaller size variants when the referenced size is gone', async () => {
    const id = uniqueId();
    const largeUrl = URL_SEC_1.replace('/original.', '/large.');
    vi.stubGlobal('fetch', servePhotos({
      [URL_SEC_1]: 404, // the referenced original no longer exists…
      [largeUrl]: BIG_JPEG, // …but the same photo's large variant does.
      [URL_MAIN]: BIG_JPEG,
      [URL_SEC_2]: BIG_JPEG,
      [URL_WRENTIT]: BIG_JPEG,
    }));
    const { cached, failed } = await ensureLightPhotos(id, uniqueUrls);

    expect(failed).toEqual([]);
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(largeUrl, expect.anything());
    // The variant's bytes are cached under the manifest's original URL.
    expect(await storedPhotoKeys(id)).toEqual(new Set(uniqueUrls));
    expect(cached.get(URL_SEC_1)).toMatch(/^blob:mock-/);
  });

  it('retries a photo when the first attempt fails transiently', async () => {
    const id = uniqueId();
    const base = servePhotos(Object.fromEntries(uniqueUrls.map((url) => [url, BIG_JPEG])));
    let sec1Attempts = 0;
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === URL_SEC_1 && sec1Attempts++ === 0) throw new Error('network down');
      return base(input);
    }));
    const { failed } = await ensureLightPhotos(id, uniqueUrls);

    expect(failed).toEqual([]);
    const fetchMock = vi.mocked(globalThis.fetch);
    expect(fetchMock.mock.calls.filter(([u]) => String(u) === URL_SEC_1)).toHaveLength(2);
    expect(await storedPhotoKeys(id)).toEqual(new Set(uniqueUrls));
  });

  it('collects failures and still caches the rest of the deck', async () => {
    const id = uniqueId();
    // Every size variant of this photo is gone (404), the rest fetch fine.
    vi.stubGlobal('fetch', servePhotos({
      [URL_MAIN]: BIG_JPEG,
      [URL_SEC_1]: BIG_JPEG,
      [URL_WRENTIT]: BIG_JPEG,
    }));
    const { cached, failed } = await ensureLightPhotos(id, uniqueUrls);

    expect(failed).toEqual([URL_SEC_2]);
    expect([...cached.keys()].sort()).toEqual([URL_MAIN, URL_SEC_1, URL_WRENTIT].sort());
    expect(await storedPhotoKeys(id)).toEqual(new Set([URL_MAIN, URL_SEC_1, URL_WRENTIT]));
  });

  it('resolves immediately with nothing to do for an empty URL list', async () => {
    const { cached, failed } = await ensureLightPhotos('any-deck', []);
    expect(cached.size).toBe(0);
    expect(failed).toEqual([]);
  });
});

describe('areLightPhotosCached', () => {
  it('flips from false to true once every URL is cached', async () => {
    const id = uniqueId();
    const urls = [URL_MAIN, URL_WRENTIT];
    expect(await areLightPhotosCached(id, urls)).toBe(false);

    vi.stubGlobal('fetch', servePhotos({ [URL_MAIN]: BIG_JPEG, [URL_WRENTIT]: BIG_JPEG }));
    await ensureLightPhotos(id, urls);
    expect(await areLightPhotosCached(id, urls)).toBe(true);
    // A URL outside the deck does not count.
    expect(await areLightPhotosCached(id, [...urls, URL_SEC_1])).toBe(false);
  });
});

describe('withCachedPhotos', () => {
  it('swaps freshly cached bytes into the matching photos only', () => {
    const def = lightDef();
    const patched = withCachedPhotos(def, new Map([[URL_MAIN, 'blob:warm-main']]));
    const nettle = patched.categories[0].cards[0].photos ?? [];
    const chamise = patched.categories[0].cards[1].photos ?? [];
    // Both cards share the URL, so both show the cached bytes…
    expect(nettle[0].file).toBe('blob:warm-main');
    expect(chamise[0].file).toBe('blob:warm-main');
    // …while the untouched photos keep their empty file and remote url.
    expect(nettle[1]).toMatchObject({ file: '', url: URL_SEC_1 });
    expect(patched.categories[1].cards[0].photos?.[0].file).toBe('');

    // The original def is not mutated.
    expect(def.categories[0].cards[0].photos?.[0].file).toBe('');
  });

  it('does not clobber photos that already resolved, and returns the same object when nothing matches', () => {
    const def = lightDef({
      categories: [{
        id: 'plants', label: '🌿 Plants',
        cards: [{
          name: 'Dwarf Nettle', layout: 'photo-trio',
          photos: [{ file: 'blob:already', url: URL_MAIN, role: 'main', credit }],
        }],
      }],
    });
    expect(withCachedPhotos(def, new Map([[URL_MAIN, 'blob:warm-main']]))).toBe(def);
    expect(def.categories[0].cards[0].photos?.[0].file).toBe('blob:already');
  });
});

describe('lightPreloadKey', () => {
  it('derives a per-deck offline marker key', () => {
    expect(lightPreloadKey('curated-test-deck')).toBe('pwa-cards-preloaded-curated-test-deck');
  });
});
