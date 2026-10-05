import 'fake-indexeddb/auto';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import {
  importDeckZip, listUploadedDecks, loadUploadedDeck, deleteUploadedDeck,
  getUploadedDeckRecord, storedDeckIdFor, DeckImportError,
  uploadedDeckBytes, formatBytes,
} from '../../app/utils/uploadedDecks';
import { putStoredPhoto } from '../../app/utils/deckStore';

// jsdom has no IndexedDB (fake-indexeddb/auto provides it) and no object URL
// factory; stub the latter so loadUploadedDeck can hand out photo URLs.
let urlCounter = 0;
beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    value: () => `blob:mock-${++urlCounter}`,
    writable: true,
  });
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, writable: true });
  // jsdom's File predates Blob.arrayBuffer(); back it with FileReader.
  if (typeof File.prototype.arrayBuffer !== 'function') {
    Object.defineProperty(File.prototype, 'arrayBuffer', {
      value(this: File): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(reader.error);
          reader.readAsArrayBuffer(this);
        });
      },
      configurable: true,
      writable: true,
    });
  }
});

// A minimal structurally-valid JPEG (SOI … EOI); the import pipeline only
// stores the bytes, it never decodes them.
const JPEG = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);

const credit = {
  observer: 'joodles',
  license: 'cc-by-nc',
  observationUrl: 'https://www.inaturalist.org/observations/38238174',
  observationId: 38238174,
  placeLabel: 'San Diego County',
};

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'curated-test-deck',
    label: '🌿 Curated Test Deck',
    description: 'A fixture deck',
    cardFormat: 'data',
    generator: { tool: 'deck-curator', version: '1.0.0', exportedAt: '2026-09-19T00:00:00.000Z' },
    categories: [
      {
        id: 'plants',
        label: '🌿 Plants',
        cards: [
          {
            name: 'Dwarf Nettle',
            layout: 'photo-trio',
            photos: [
              { file: 'photos/dwarf-nettle-main.jpg', role: 'main', alt: 'Flowering stalk', credit },
              { file: 'photos/dwarf-nettle-sec-1.jpg', role: 'secondary', credit },
              { file: 'photos/dwarf-nettle-sec-2.jpg', role: 'secondary', credit: { observer: 'susanbar', license: 'cc0' } },
            ],
            sciName: 'Urtica urens',
            commonName: 'Dwarf Nettle',
            altNames: ['Burning Nettle'],
            familyCommon: 'Nettle Family',
            familyLatin: 'Urticaceae',
            native: 'non-native',
            invasive: true,
            rarity: null,
            taxonId: 53315,
            credits: [credit],
          },
          {
            name: 'Chamise',
            layout: 'photo-single',
            photos: [{ file: 'photos/chamise-main.jpg', role: 'main', credit: { observer: 'alice', license: 'all-rights-reserved' } }],
            sciName: 'Adenostoma fasciculatum',
            native: 'native',
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
            photos: [{ file: 'photos/wrentit-main.jpg', role: 'main', credit: { observer: 'bob', license: 'cc-by' } }],
          },
        ],
      },
    ],
    ...overrides,
  };
}

function zipOf(manifestObject: unknown, extraFiles: Record<string, Uint8Array> = {}): File {
  const contents: Record<string, Uint8Array> = {
    'manifest.json': strToU8(JSON.stringify(manifestObject)),
    'photos/dwarf-nettle-main.jpg': JPEG,
    'photos/dwarf-nettle-sec-1.jpg': JPEG,
    'photos/dwarf-nettle-sec-2.jpg': JPEG,
    'photos/chamise-main.jpg': JPEG,
    'photos/wrentit-main.jpg': JPEG,
    ...extraFiles,
  };
  return new File([zipSync(contents)], 'curated-test-deck.zip', { type: 'application/zip' });
}

// ---------------------------------------------------------------------------
// Light decks (.deck.lite)
// ---------------------------------------------------------------------------

// The import pipeline checks fetched bytes' size and content type but never
// decodes them, so a 600-byte "JPEG" (real SOI…EOI header, zero filler) works
// as a stand-in for a real photo — comfortably above the 100-byte floor.
const BIG_JPEG = (() => {
  const bytes = new Uint8Array(600);
  bytes.set(JPEG, 0);
  return bytes;
})();

/** The remote photo sources a light manifest references (original size). */
const photoUrl = (id: number) => `https://inaturalist-open-data.s3.amazonaws.com/photos/${id}/original.jpg`;
const URL_MAIN = photoUrl(101);
const URL_SEC_1 = photoUrl(102);
const URL_SEC_2 = photoUrl(103);
const URL_WRENTIT = photoUrl(105);

function liteManifest(overrides: Record<string, unknown> = {}) {
  return {
    ...manifest(),
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
              { url: URL_MAIN, role: 'main', alt: 'Flowering stalk', credit },
              { url: URL_SEC_1, role: 'secondary', credit },
              { url: URL_SEC_2, role: 'secondary', credit: { observer: 'susanbar', license: 'cc0' } },
            ],
            sciName: 'Urtica urens',
            commonName: 'Dwarf Nettle',
            native: 'non-native',
            invasive: true,
            rarity: null,
            taxonId: 53315,
            credits: [credit],
          },
          {
            // Shares Dwarf Nettle's main photo URL — fetched and cached once.
            name: 'Chamise',
            layout: 'photo-single',
            photos: [{ url: URL_MAIN, role: 'main', credit: { observer: 'alice', license: 'all-rights-reserved' } }],
            sciName: 'Adenostoma fasciculatum',
            native: 'native',
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
            photos: [{ url: URL_WRENTIT, role: 'main', credit: { observer: 'bob', license: 'cc-by' } }],
          },
        ],
      },
    ],
    ...overrides,
  };
}

/** A light deck zip: manifest only, no photos/ directory. */
function liteZipOf(manifestObject: unknown): File {
  return new File([zipSync({ 'manifest.json': strToU8(JSON.stringify(manifestObject)) })], 'curated-test-deck.deck.lite', {
    type: 'application/zip',
  });
}

/** Unique manifest id per test so the shared fake database stays isolated. */
let testCounter = 0;
function uniqueId(): string {
  return `curated-test-deck-${++testCounter}`;
}

function manifestWithId(id: string, overrides: Record<string, unknown> = {}) {
  const base = manifest(overrides);
  return { ...base, id };
}

/** Open the deck database directly for tests that must poke at raw storage. */
function withRawDb<T>(run: (db: IDBDatabase) => Promise<T>): Promise<T> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open('uploaded-decks', 1);
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  }).then(async (db) => {
    try {
      return await run(db);
    } finally {
      db.close();
    }
  });
}

function rawRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** All photo-store keys, raw (`${deckId}/${reference}`). */
async function rawPhotoKeys(): Promise<string[]> {
  return withRawDb(async (db) => {
    const keys = await rawRequest(db.transaction('photos').objectStore('photos').getAllKeys());
    return keys.filter((key): key is string => typeof key === 'string');
  });
}

beforeEach(() => {
  urlCounter = 0;
});

describe('storedDeckIdFor', () => {
  it('passes through ordinary ids', () => {
    expect(storedDeckIdFor('my-deck')).toBe('my-deck');
  });

  it('suffixes ids that would collide with built-in decks', () => {
    expect(storedDeckIdFor('canyonlands')).toBe('canyonlands-uploaded');
    expect(storedDeckIdFor('healthy-canyons')).toBe('healthy-canyons-uploaded');
  });
});

describe('importDeckZip', () => {
  it('stores the deck and its photos in IndexedDB', async () => {
    const id = uniqueId();
    const { id: storedId, label } = await importDeckZip(zipOf(manifestWithId(id)));

    expect(storedId).toBe(id);
    expect(label).toBe('🌿 Curated Test Deck');

    const summaries = await listUploadedDecks();
    const summary = summaries.find((s) => s.id === id)!;
    expect(summary).toMatchObject({ id, label, cardFormat: 'data' });
    expect(typeof summary.importedAt).toBe('string');

    const record = await getUploadedDeckRecord(id);
    expect(record?.manifest.categories).toHaveLength(2);

    const def = await loadUploadedDeck(id);
    expect(def).toMatchObject({ id, label, description: 'A fixture deck', cardFormat: 'data', uploaded: true });
    expect(def.categories.map((c) => c.id)).toEqual(['plants', 'birds']);

    // Photo files resolve to blob: object URLs, in manifest order.
    const photos = def.categories[0].cards[0].photos ?? [];
    expect(photos.map((p) => p.file)).toEqual([
      'blob:mock-1', 'blob:mock-2', 'blob:mock-3',
    ]);
    expect(photos.map((p) => p.role)).toEqual(['main', 'secondary', 'secondary']);
    expect(photos[0].credit).toMatchObject({ observer: 'joodles', license: 'cc-by-nc' });
    // Other fields survive the round-trip.
    expect(def.categories[0].cards[0]).toMatchObject({ name: 'Dwarf Nettle', sciName: 'Urtica urens', invasive: true });
    // Cards without an invasive flag default to false.
    expect(def.categories[0].cards[1].invasive).toBe(false);
  });

  it('accepts a zip that wraps the deck in a single top-level folder', async () => {
    const id = uniqueId();
    const contents = {
      'some-deck/manifest.json': strToU8(JSON.stringify(manifestWithId(id))),
      'some-deck/photos/dwarf-nettle-main.jpg': JPEG,
      'some-deck/photos/dwarf-nettle-sec-1.jpg': JPEG,
      'some-deck/photos/dwarf-nettle-sec-2.jpg': JPEG,
      'some-deck/photos/chamise-main.jpg': JPEG,
      'some-deck/photos/wrentit-main.jpg': JPEG,
    };
    const { id: storedId } = await importDeckZip(new File([zipSync(contents)], 'wrapped.zip'));
    expect(storedId).toBe(id);
    const def = await loadUploadedDeck(id);
    expect(def.categories[0].cards[0].photos?.[0].file).toBe('blob:mock-1');
  });

  it('rejects a zip without manifest.json', async () => {
    const file = new File([zipSync({ 'photos/x.jpg': JPEG })], 'no-manifest.zip');
    await expect(importDeckZip(file)).rejects.toThrow(/manifest\.json is missing/);
  });

  it('rejects a non-zip file', async () => {
    const file = new File([strToU8('this is not a zip')], 'bad.zip');
    await expect(importDeckZip(file)).rejects.toThrow(DeckImportError);
  });

  it('rejects invalid manifest JSON', async () => {
    const file = new File([zipSync({ 'manifest.json': strToU8('{not json') })], 'broken.zip');
    await expect(importDeckZip(file)).rejects.toThrow(/not valid JSON/);
  });

  it('rejects image-format decks (no cardFormat)', async () => {
    const m = manifestWithId(uniqueId(), { cardFormat: undefined });
    delete (m as Record<string, unknown>).cardFormat;
    await expect(importDeckZip(zipOf(m))).rejects.toThrow(/cardFormat.*"data"/);
  });

  it('rejects a non-slug id', async () => {
    await expect(importDeckZip(zipOf(manifestWithId('My Deck!')))).rejects.toThrow(/kebab-case slug/);
  });

  it('rejects duplicate card names across categories', async () => {
    const m = manifestWithId(uniqueId());
    (m.categories[1].cards as unknown[]).push({ ...m.categories[0].cards[0] });
    await expect(importDeckZip(zipOf(m))).rejects.toThrow(/"Dwarf Nettle" appears more than once/);
  });

  it('rejects cards with an unsupported layout', async () => {
    const m = manifestWithId(uniqueId(), {
      categories: [{ id: 'plants', label: '🌿 Plants', cards: [{ name: 'X', layout: 'gallery', photos: [] }] }],
    });
    await expect(importDeckZip(zipOf(m, { 'photos/x.jpg': JPEG }))).rejects.toThrow(/layout "gallery"/);
  });

  it('rejects photo-single cards with more than one photo', async () => {
    const m = manifestWithId(uniqueId(), {
      categories: [{
        id: 'plants', label: '🌿 Plants',
        cards: [{
          name: 'X', layout: 'photo-single',
          photos: [
            { file: 'photos/a.jpg', role: 'main', credit },
            { file: 'photos/b.jpg', role: 'secondary', credit },
          ],
        }],
      }],
    });
    await expect(importDeckZip(zipOf(m, { 'photos/a.jpg': JPEG, 'photos/b.jpg': JPEG }))).rejects.toThrow(/exactly one photo/);
  });

  it('rejects a photo-trio card with more than 1 main + 2 secondary photos', async () => {
    const m = manifestWithId(uniqueId(), {
      categories: [{
        id: 'plants', label: '🌿 Plants',
        cards: [{
          name: 'X', layout: 'photo-trio',
          photos: [
            { file: 'photos/a.jpg', role: 'main', credit },
            { file: 'photos/b.jpg', role: 'secondary', credit },
            { file: 'photos/c.jpg', role: 'secondary', credit },
            { file: 'photos/d.jpg', role: 'secondary', credit },
          ],
        }],
      }],
    });
    await expect(importDeckZip(zipOf(m, { 'photos/a.jpg': JPEG, 'photos/b.jpg': JPEG, 'photos/c.jpg': JPEG, 'photos/d.jpg': JPEG }))).rejects.toThrow(/1 main \+ 2 secondary/);
  });

  it('rejects cards whose photos do not start with the main photo', async () => {
    const m = manifestWithId(uniqueId(), {
      categories: [{
        id: 'plants', label: '🌿 Plants',
        cards: [{
          name: 'X', layout: 'photo-trio',
          photos: [{ file: 'photos/a.jpg', role: 'secondary', credit }],
        }],
      }],
    });
    await expect(importDeckZip(zipOf(m, { 'photos/a.jpg': JPEG }))).rejects.toThrow(/must start with its main photo/);
  });

  it('fails the import and names the file when a photo is missing from the zip', async () => {
    const id = uniqueId();
    const contents: Record<string, Uint8Array> = {
      'manifest.json': strToU8(JSON.stringify(manifestWithId(id))),
      // dwarf-nettle-sec-2.jpg deliberately absent
      'photos/dwarf-nettle-main.jpg': JPEG,
      'photos/dwarf-nettle-sec-1.jpg': JPEG,
      'photos/chamise-main.jpg': JPEG,
      'photos/wrentit-main.jpg': JPEG,
    };
    await expect(importDeckZip(new File([zipSync(contents)], 'incomplete.zip')))
      .rejects.toThrow(/photos\/dwarf-nettle-sec-2\.jpg.*is missing/);
    // Nothing was stored for the failed import.
    expect((await listUploadedDecks()).find((s) => s.id === id)).toBeUndefined();
  });

  it('rejects photos with an unrecognizable license code', async () => {
    const m = manifestWithId(uniqueId(), {
      categories: [{
        id: 'plants', label: '🌿 Plants',
        cards: [{
          name: 'X', layout: 'photo-single',
          photos: [{ file: 'photos/a.jpg', role: 'main', credit: { observer: 'o', license: 'wtfpl' } }],
        }],
      }],
    });
    await expect(importDeckZip(zipOf(m, { 'photos/a.jpg': JPEG }))).rejects.toThrow(/unsupported photo license "wtfpl"/);
  });

  it('rejects photos without a credit', async () => {
    const m = manifestWithId(uniqueId(), {
      categories: [{
        id: 'plants', label: '🌿 Plants',
        cards: [{
          name: 'X', layout: 'photo-single',
          photos: [{ file: 'photos/a.jpg', role: 'main' }],
        }],
      }],
    });
    await expect(importDeckZip(zipOf(m, { 'photos/a.jpg': JPEG }))).rejects.toThrow(/missing its photo credit/);
  });
});

describe('re-import and deletion', () => {
  it('replaces an existing uploaded deck with the same manifest id', async () => {
    const id = uniqueId();
    await importDeckZip(zipOf(manifestWithId(id)));
    const updated = manifestWithId(id, { label: '🌿 Updated Deck' });
    await importDeckZip(zipOf(updated));

    const summaries = await listUploadedDecks();
    const mine = summaries.filter((s) => s.id === id);
    expect(mine).toHaveLength(1);
    expect(mine[0].label).toBe('🌿 Updated Deck');
    const def = await loadUploadedDeck(id);
    expect(def.label).toBe('🌿 Updated Deck');
  });

  it('stores a deck whose id collides with a built-in under the suffixed id', async () => {
    const { id } = await importDeckZip(zipOf(manifest({ id: 'canyonlands' })));
    expect(id).toBe('canyonlands-uploaded');
    expect((await listUploadedDecks()).map((s) => s.id)).toContain('canyonlands-uploaded');
  });

  it('deleteUploadedDeck removes the record and the photos', async () => {
    const id = uniqueId();
    await importDeckZip(zipOf(manifestWithId(id)));
    expect(await getUploadedDeckRecord(id)).not.toBeNull();

    await deleteUploadedDeck(id);

    expect(await getUploadedDeckRecord(id)).toBeNull();
    expect((await listUploadedDecks()).find((s) => s.id === id)).toBeUndefined();
    await expect(loadUploadedDeck(id)).rejects.toThrow(/was not found/);
  });
});

describe('uploadedDeckBytes', () => {
  it('reports the size measured at import time: manifest JSON plus every photo file', async () => {
    const id = uniqueId();
    await importDeckZip(zipOf(manifestWithId(id)));

    // The fixture zip stores 5 photos of JPEG.length bytes each; the
    // manifest contribution is recomputed here from the stored record.
    const manifest = (await getUploadedDeckRecord(id))!.manifest;
    const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest)).length;
    expect(await uploadedDeckBytes(id)).toBe(manifestBytes + 5 * JPEG.length);
  });

  it('measures legacy records without a stored size from their photo blobs', async () => {
    const id = uniqueId();
    await importDeckZip(zipOf(manifestWithId(id)));

    // Simulate a record written before sizes were tracked: drop `bytes`,
    // and swap the real photos for plain objects carrying sizes (jsdom
    // Blobs can't survive fake-indexeddb's structured clone with a size,
    // but the read-and-sum measurement logic is what's under test here).
    await withRawDb(async (db) => {
      const decks = db.transaction('decks', 'readwrite').objectStore('decks');
      const record = (await rawRequest(decks.get(id))) as Record<string, unknown>;
      delete record.bytes;
      await rawRequest(decks.put(record));
      const photos = db.transaction('photos', 'readwrite').objectStore('photos');
      await rawRequest(photos.put({ size: 10 }, `${id}/photos/dwarf-nettle-main.jpg`));
      await rawRequest(photos.put({ size: 20 }, `${id}/photos/dwarf-nettle-sec-1.jpg`));
      await rawRequest(photos.put({ size: 30 }, `${id}/photos/dwarf-nettle-sec-2.jpg`));
    });

    const manifest = (await getUploadedDeckRecord(id))!.manifest;
    const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest)).length;
    // 10 + 20 + 30 from the readable photos; the two untouched jsdom Blobs
    // read back sizeless under fake-indexeddb and contribute 0.
    expect(await uploadedDeckBytes(id)).toBe(manifestBytes + 60);
  });

  it('returns null for an unknown id and after the deck is deleted', async () => {
    expect(await uploadedDeckBytes('never-imported')).toBeNull();

    const id = uniqueId();
    await importDeckZip(zipOf(manifestWithId(id)));
    await deleteUploadedDeck(id);
    expect(await uploadedDeckBytes(id)).toBeNull();
  });
});

describe('formatBytes', () => {
  it('formats bytes and kilobytes with one decimal below 100', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(999)).toBe('999 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(51200)).toBe('50 KB');
    expect(formatBytes(102400)).toBe('100 KB');
  });

  it('formats megabytes and gigabytes', () => {
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
    expect(formatBytes(48 * 1024 * 1024)).toBe('48 MB');
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2 GB');
  });
});

describe('light deck import', () => {
  // Import no longer fetches anything: the manifest is stored as-is and the
  // deck is usable immediately; photos are cached on demand by
  // app/utils/lightPhotos.ts (covered in test/utils/lightPhotos.test.ts).
  it('stores the manifest without fetching photos, and loads unresolved', async () => {
    const id = uniqueId();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { id: storedId, label } = await importDeckZip(liteZipOf(liteManifest({ id })));

    expect(storedId).toBe(id);
    expect(label).toBe('🌿 Curated Test Deck');
    // The import made no network requests at all.
    expect(fetchMock).not.toHaveBeenCalled();

    // The stored manifest keeps the remote references (no files were shipped)
    // and carries the light marker; no size was measured at import time.
    const record = await getUploadedDeckRecord(id);
    expect(record?.manifest.format).toBe('lite');
    expect(record?.bytes).toBeUndefined();
    const storedPhotos = record?.manifest.categories[0].cards[0].photos ?? [];
    expect(storedPhotos.map((p) => p.url)).toEqual([URL_MAIN, URL_SEC_1, URL_SEC_2]);
    expect(storedPhotos[0]).not.toHaveProperty('file');

    // Loading leaves photos that have no cached bytes unresolved: an empty
    // `file` the UI replaces with the remote `url`.
    const def = await loadUploadedDeck(id);
    expect(def).toMatchObject({ id, label, cardFormat: 'data', uploaded: true, format: 'lite' });
    const photos = def.categories[0].cards[0].photos ?? [];
    expect(photos.map((p) => p.file)).toEqual(['', '', '']);
    expect(photos.map((p) => p.url)).toEqual([URL_MAIN, URL_SEC_1, URL_SEC_2]);
    expect(photos[0].credit).toMatchObject({ observer: 'joodles', license: 'cc-by-nc' });
    vi.unstubAllGlobals();
  });

  it('measures the stored size on demand (manifest only until photos are cached)', async () => {
    const id = uniqueId();
    await importDeckZip(liteZipOf(liteManifest({ id })));
    const manifest = (await getUploadedDeckRecord(id))!.manifest;
    const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest)).length;
    expect(await uploadedDeckBytes(id)).toBe(manifestBytes);
  });

  it('keeps cached photos across a re-import and prunes ones the new manifest dropped', async () => {
    const id = uniqueId();
    await importDeckZip(liteZipOf(liteManifest({ id })));
    // Cache one photo directly (as the on-demand fetch would).
    await putStoredPhoto(id, URL_MAIN, new Blob([BIG_JPEG], { type: 'image/jpeg' }));
    // Re-import a manifest that swaps Dwarf Nettle's first secondary photo
    // for a different URL.
    const updated = liteManifest({ id });
    (updated.categories[0].cards[0].photos as Array<Record<string, unknown>>)[1] = {
      url: photoUrl(999), role: 'secondary', credit,
    };
    await importDeckZip(liteZipOf(updated));

    const keys = (await rawPhotoKeys()).filter((key) => key.startsWith(`${id}/`));
    // Exactly the cached photo survives: the dropped URL is pruned, and
    // nothing else was ever cached.
    expect(keys).toEqual([`${id}/${URL_MAIN}`]);
    // The stored manifest is the new one.
    const record = await getUploadedDeckRecord(id);
    expect(record?.manifest.categories[0].cards[0].photos?.[1].url).toBe(photoUrl(999));
  });

  it('drops cached photos of a previous bundled import when a light manifest takes over', async () => {
    const id = uniqueId();
    await importDeckZip(zipOf(manifestWithId(id))); // bundled copy with file-keyed photos
    expect((await rawPhotoKeys()).some((key) => key.startsWith(`${id}/photos/`))).toBe(true);

    await importDeckZip(liteZipOf(liteManifest({ id })));
    // The bundled photos are gone; the light deck references only URLs.
    const keys = await rawPhotoKeys();
    expect(keys.some((key) => key.startsWith(`${id}/photos/`))).toBe(false);
    const record = await getUploadedDeckRecord(id);
    expect(record?.manifest.format).toBe('lite');
  });
});

describe('light deck validation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function liteWithPhoto(photo: Record<string, unknown>, overrides: Record<string, unknown> = {}): File {
    const m = liteManifest({ ...overrides });
    (m.categories[0].cards[0].photos as unknown[])[0] = photo;
    return liteZipOf(m);
  }

  it('rejects a light photo that carries a bundled file reference', async () => {
    const file = liteWithPhoto({ file: 'photos/x.jpg', role: 'main', credit });
    await expect(importDeckZip(file)).rejects.toThrow(/photo 1 carries a "file" reference/);
  });

  it('rejects a light photo with animated media', async () => {
    const file = liteWithPhoto({
      url: URL_MAIN, role: 'main', credit,
      animation: { file: 'photos/x.mp4', kind: 'video' },
    });
    await expect(importDeckZip(file)).rejects.toThrow(/animated media/);
  });

  it('rejects a light photo whose url is not absolute', async () => {
    const file = liteWithPhoto({ url: 'photos/nettle.jpg', role: 'main', credit });
    await expect(importDeckZip(file)).rejects.toThrow(/is not an absolute URL/);
  });

  it('rejects a light photo whose url is not https', async () => {
    const file = liteWithPhoto({ url: 'http://inaturalist-open-data.s3.amazonaws.com/photos/1/original.jpg', role: 'main', credit });
    await expect(importDeckZip(file)).rejects.toThrow(/must be an https URL/);
  });

  it('rejects a light photo without a url', async () => {
    const file = liteWithPhoto({ role: 'main', credit });
    await expect(importDeckZip(file)).rejects.toThrow(/photo 1 url is required/);
  });

  it('rejects an unknown format marker', async () => {
    await expect(importDeckZip(liteZipOf(liteManifest({ format: 'lite2' })))).rejects.toThrow(/unsupported deck format "lite2"/);
  });

  it('rejects a url reference in a bundled (non-light) deck', async () => {
    const m = manifestWithId(uniqueId());
    (m.categories[0].cards[0].photos as Array<Record<string, unknown>>)[0] = {
      url: URL_MAIN, role: 'main', credit,
    };
    await expect(importDeckZip(zipOf(m))).rejects.toThrow(/only light decks \(format "lite"\) reference remote photos/);
  });
});
