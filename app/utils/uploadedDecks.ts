/**
 * Client-side ingest and storage of user-uploaded deck archives (see
 * /workspaces/deck-curator/docs/DECK_FORMAT.md). A deck zip is unpacked with
 * fflate, validated, and stored entirely in IndexedDB — one record per deck
 * plus its photo files as Blobs — so nothing is sent to any server.
 *
 * Documented policy decisions:
 *
 * - Duplicate ids: re-importing a deck whose manifest id matches an already
 *   stored uploaded deck REPLACES it (its photos are wiped and rewritten), so
 *   a re-exported curation updates in place instead of piling up copies.
 * - Built-in id collisions: a manifest id equal to a built-in deck id
 *   ("canyonlands", "healthy-canyons") must not shadow the built-in, so it is
 *   stored under the deterministic suffix "-uploaded" ("canyonlands-uploaded").
 *   The suffix is a pure function of the manifest id, so re-importing the same
 *   zip still replaces the earlier copy.
 * - Missing photo files: import FAILS with an error naming the first missing
 *   file. A deck with broken photos would render broken cards, so the whole
 *   archive is refused rather than importing a partial deck.
 * - Only `cardFormat: "data"` archives are accepted; image-format archives
 *   (pre-rendered front/back JPGs, no cardFormat) are rejected. The upload
 *   flow exists for Deck Curator output, which is always data-format.
 *
 * Light decks (DECK_FORMAT.md "Light decks", a `.deck.lite` zip with
 * `format: "lite"` and no photos/ directory) carry `url`s instead of `file`s:
 *
 * - Every photo must reference an absolute https URL; `file` references and
 *   animated media are rejected (a light deck has no local bytes to point at).
 * - The photo bytes are FETCHED during import and cached in this module's
 *   photo store under the photo's URL, so an imported light deck behaves
 *   exactly like a bundled one afterwards — it studies offline, shows its
 *   stored size, and deletes cleanly. Progress is reported through
 *   `onProgress` because a few-hundred-photo deck takes a while to fetch.
 * - The same "no broken cards" policy applies: if a photo cannot be fetched
 *   (after trying the smaller iNat size variants of the same image, and
 *   retrying transient failures), the whole import fails and names the URL.
 *   Fetching happens BEFORE the previous import is deleted, so a failed
 *   re-import never wipes the copy already in the browser.
 */
import { unzip, strFromU8 } from 'fflate';
import { DECK_DEFS, type DeckDef } from '~/data/decks';

/** fflate's async unzip; wrapped because its types only expose the callback form. */
function unzipAsync(data: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    unzip(data, (err, out) => (err ? reject(err) : resolve(out)));
  });
}

export interface UploadedDeckRecord {
  id: string;
  label: string;
  description: string;
  cardFormat: 'data';
  /** The validated manifest as imported (photo `file`s still archive paths). */
  manifest: DeckDef;
  importedAt: string;
  /** Total stored size in bytes (manifest JSON + photo files), measured at
   *  import time. Absent on records written before this was tracked. */
  bytes?: number;
}

export interface UploadedDeckSummary {
  id: string;
  label: string;
  description: string;
  cardFormat: 'data';
  importedAt: string;
}

/** Error type for import failures; message is safe to show to the user. */
export class DeckImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeckImportError';
  }
}

const DB_NAME = 'uploaded-decks';
const DB_VERSION = 1;
const DECK_STORE = 'decks';
const PHOTO_STORE = 'photos';

const MANIFEST_NAME = 'manifest.json';
/** Manifest ids must be URL-safe slugs; they end up in ?deck= params. */
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NATIVE_VALUES = ['native', 'non-native', 'unknown'] as const;
const LICENSE_PATTERN = /^(cc0|cc-by(-sa|-nc(-sa|-nd)?|-nd)?|all-rights-reserved)$/;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    // No IndexedDB (SSR, unit tests without fake-indexeddb, private mode):
    // uploaded decks are simply unavailable.
    return Promise.reject(new Error('IndexedDB is not available in this browser.'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DECK_STORE)) db.createObjectStore(DECK_STORE, { keyPath: 'id' });
      // Photos are stored under out-of-line keys `${deckId}/${declaredPath}`.
      if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open the deck database.'));
  });
}

function requestAsPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted.'));
  });
}

/** Run an async callback against one store in its own transaction. */
async function withStore<T>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(storeName, mode);
    const result = await run(tx.objectStore(storeName));
    await transactionDone(tx);
    return result;
  } finally {
    db.close();
  }
}

function isBuiltInDeckId(id: string): boolean {
  return DECK_DEFS.some((d) => d.id === id);
}

/**
 * Uploaded decks keep their manifest id, except when it would collide with a
 * built-in deck; those get a deterministic "-uploaded" suffix so re-imports
 * still replace the stored copy instead of inventing a new id each time.
 */
export function storedDeckIdFor(manifestId: string): string {
  return isBuiltInDeckId(manifestId) ? `${manifestId}-uploaded` : manifestId;
}

// ---------------------------------------------------------------------------
// Manifest validation
// ---------------------------------------------------------------------------

interface RawRecord {
  [key: string]: unknown;
}

function requireString(value: unknown, what: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DeckImportError(`Invalid deck archive: ${what} is required.`);
  }
  return value;
}

function optionalString(value: unknown, what: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new DeckImportError(`Invalid deck archive: ${what} must be a string.`);
  return value;
}

/**
 * A light deck's photo URL: an absolute https address the app can fetch the
 * image from. https only — the app runs on https, and browsers block
 * mixed-content fetches of http URLs from a secure page.
 */
function validatePhotoUrl(value: unknown, what: string): string {
  const url = requireString(value, `${what} url`);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new DeckImportError(`Invalid deck archive: ${what} url "${url}" is not an absolute URL.`);
  }
  if (parsed.protocol !== 'https:') {
    throw new DeckImportError(`Invalid deck archive: ${what} url "${url}" must be an https URL.`);
  }
  return url;
}

function validateCredit(credit: unknown, where: string): void {
  if (typeof credit !== 'object' || credit === null) {
    throw new DeckImportError(`Invalid deck archive: ${where} is missing its photo credit.`);
  }
  const raw = credit as RawRecord;
  requireString(raw.observer, `${where} credit observer`);
  const license = requireString(raw.license, `${where} credit license`);
  if (!LICENSE_PATTERN.test(license)) {
    throw new DeckImportError(
      `Invalid deck archive: ${where} has an unsupported photo license "${license}" ` +
      '(expected a Creative Commons code such as cc-by-nc, cc0, or all-rights-reserved).',
    );
  }
  if (raw.sourceUrl !== undefined && raw.sourceUrl !== null && typeof raw.sourceUrl !== 'string') {
    throw new DeckImportError(`Invalid deck archive: ${where} credit sourceUrl must be a string.`);
  }
  if (raw.observationUrl !== undefined && raw.observationUrl !== null && typeof raw.observationUrl !== 'string') {
    throw new DeckImportError(`Invalid deck archive: ${where} credit observationUrl must be a string.`);
  }
  if (raw.observationId !== undefined && raw.observationId !== null && typeof raw.observationId !== 'number') {
    throw new DeckImportError(`Invalid deck archive: ${where} credit observationId must be a number.`);
  }
  if (raw.placeLabel !== undefined && raw.placeLabel !== null && typeof raw.placeLabel !== 'string') {
    throw new DeckImportError(`Invalid deck archive: ${where} credit placeLabel must be a string.`);
  }
}

function validateCard(card: unknown, where: string, lite: boolean): void {
  if (typeof card !== 'object' || card === null) {
    throw new DeckImportError(`Invalid deck archive: ${where} is not a card object.`);
  }
  const raw = card as RawRecord;
  requireString(raw.name, `${where} name`);
  const layout = raw.layout;
  if (layout !== 'photo-trio' && layout !== 'photo-single') {
    throw new DeckImportError(
      `Invalid deck archive: card "${String(raw.name)}" has layout ${JSON.stringify(layout)} — expected "photo-trio" or "photo-single".`,
    );
  }
  if (!Array.isArray(raw.photos) || raw.photos.length === 0) {
    throw new DeckImportError(`Invalid deck archive: card "${String(raw.name)}" has no photos.`);
  }
  raw.photos.forEach((photo, index) => {
    const photoWhere = `${where} photo ${index + 1}`;
    if (typeof photo !== 'object' || photo === null) {
      throw new DeckImportError(`Invalid deck archive: ${photoWhere} is not a photo object.`);
    }
    const p = photo as RawRecord;
    // Light decks reference their photos by remote URL; bundled decks by
    // archive path. The two reference styles never mix.
    if (lite) {
      if (p.file !== undefined) {
        throw new DeckImportError(
          `Invalid deck archive: ${photoWhere} carries a "file" reference — light decks carry "url" instead.`,
        );
      }
      validatePhotoUrl(p.url, photoWhere);
      if (p.animation !== undefined) {
        throw new DeckImportError(
          `Invalid deck archive: ${photoWhere} has animated media — light decks can't carry animation clips.`,
        );
      }
    } else {
      if (p.url !== undefined) {
        throw new DeckImportError(
          `Invalid deck archive: ${photoWhere} carries a "url" — only light decks (format "lite") reference remote photos.`,
        );
      }
      requireString(p.file, `${photoWhere} file`);
    }
    if (p.role !== 'main' && p.role !== 'secondary') {
      throw new DeckImportError(`Invalid deck archive: ${photoWhere} has role ${JSON.stringify(p.role)} — expected "main" or "secondary".`);
    }
    if (index === 0 && p.role !== 'main') {
      throw new DeckImportError(`Invalid deck archive: card "${String(raw.name)}" must start with its main photo.`);
    }
    if (index > 0 && p.role === 'main') {
      throw new DeckImportError(`Invalid deck archive: card "${String(raw.name)}" has more than one main photo.`);
    }
    if (p.alt !== undefined && p.alt !== null && typeof p.alt !== 'string') {
      throw new DeckImportError(`Invalid deck archive: ${photoWhere} alt must be a string.`);
    }
    validateCredit(p.credit, photoWhere);
  });
  if (layout === 'photo-single' && raw.photos.length > 1) {
    throw new DeckImportError(`Invalid deck archive: photo-single card "${String(raw.name)}" must have exactly one photo.`);
  }
  if (layout === 'photo-trio' && raw.photos.length > 3) {
    throw new DeckImportError(`Invalid deck archive: photo-trio card "${String(raw.name)}" has more than 1 main + 2 secondary photos.`);
  }
  if (raw.native !== undefined && raw.native !== null && !NATIVE_VALUES.includes(raw.native as (typeof NATIVE_VALUES)[number])) {
    throw new DeckImportError(
      `Invalid deck archive: card "${String(raw.name)}" has native status ${JSON.stringify(raw.native)} — expected "native", "non-native", or "unknown".`,
    );
  }
  if (raw.invasive !== undefined && typeof raw.invasive !== 'boolean') {
    throw new DeckImportError(`Invalid deck archive: card "${String(raw.name)}" invasive must be true or false.`);
  }
  if (raw.rarity !== undefined && raw.rarity !== null && typeof raw.rarity !== 'string') {
    throw new DeckImportError(`Invalid deck archive: card "${String(raw.name)}" rarity must be a string.`);
  }
  if (raw.altNames !== undefined) {
    if (!Array.isArray(raw.altNames) || raw.altNames.some((n) => typeof n !== 'string')) {
      throw new DeckImportError(`Invalid deck archive: card "${String(raw.name)}" altNames must be a list of names.`);
    }
  }
  if (raw.credits !== undefined) {
    if (!Array.isArray(raw.credits)) {
      throw new DeckImportError(`Invalid deck archive: card "${String(raw.name)}" credits must be a list.`);
    }
    raw.credits.forEach((credit, index) => validateCredit(credit, `${where} credit ${index + 1}`));
  }
}

/**
 * Structural validation of a parsed manifest.json. Throws DeckImportError
 * with a user-facing message on the first problem found. Photo file
 * existence is checked separately against the archive contents (bundled
 * decks) or fetched over the network (light decks).
 */
export function validateManifest(parsed: unknown): DeckDef {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new DeckImportError('Invalid deck archive: manifest.json is not a JSON object.');
  }
  const raw = parsed as RawRecord;
  const id = requireString(raw.id, 'manifest id');
  if (!ID_PATTERN.test(id)) {
    throw new DeckImportError(
      `Invalid deck archive: manifest id "${id}" must be a kebab-case slug (lowercase letters, digits, dashes).`,
    );
  }
  const label = requireString(raw.label, 'manifest label');
  if (raw.cardFormat !== 'data') {
    throw new DeckImportError(
      'Only data-format decks from Deck Curator can be uploaded (manifest.json must set "cardFormat": "data").',
    );
  }
  // "format": "lite" marks a manifest-only deck whose photos are fetched at
  // import (docs/DECK_FORMAT.md "Light decks"). Any other value is a format
  // this app doesn't know about.
  if (raw.format !== undefined && raw.format !== 'lite') {
    throw new DeckImportError(
      `Invalid deck archive: unsupported deck format ${JSON.stringify(raw.format)} — expected "lite" or no format field.`,
    );
  }
  const lite = raw.format === 'lite';
  if (!Array.isArray(raw.categories) || raw.categories.length === 0) {
    throw new DeckImportError('Invalid deck archive: manifest has no categories.');
  }
  const seenNames = new Set<string>();
  const categories = raw.categories.map((category, catIndex) => {
    const catWhere = `category ${catIndex + 1}`;
    if (typeof category !== 'object' || category === null) {
      throw new DeckImportError(`Invalid deck archive: ${catWhere} is not an object.`);
    }
    const c = category as RawRecord;
    const catId = requireString(c.id, `${catWhere} id`);
    const catLabel = requireString(c.label, `${catWhere} label`);
    if (!Array.isArray(c.cards)) {
      throw new DeckImportError(`Invalid deck archive: ${catWhere} ("${catLabel}") has no cards list.`);
    }
    const cards = c.cards.map((card, cardIndex) => {
      validateCard(card, `${catWhere} card ${cardIndex + 1}`, lite);
      const name = (card as RawRecord).name as string;
      if (seenNames.has(name)) {
        throw new DeckImportError(`Invalid deck archive: card name "${name}" appears more than once (names must be unique across the deck).`);
      }
      seenNames.add(name);
      return card;
    });
    return { id: catId, label: catLabel, cards };
  });
  return {
    id,
    label,
    description: optionalString(raw.description, 'manifest description') ?? '',
    cardFormat: 'data',
    categories: categories as DeckDef['categories'],
  };
}

// ---------------------------------------------------------------------------
// Zip unpacking
// ---------------------------------------------------------------------------

function isFile(path: string, files: Record<string, Uint8Array>): boolean {
  return !path.endsWith('/') && files[path] !== undefined;
}

/**
 * Locate manifest.json in the unpacked archive. Curator zips have it at the
 * root; a zip created by archiving the deck *folder* wraps everything in one
 * top-level directory, which is accepted too.
 */
function findManifestEntry(files: Record<string, Uint8Array>): { manifestPath: string; root: string } {
  if (isFile(MANIFEST_NAME, files)) {
    return { manifestPath: MANIFEST_NAME, root: '' };
  }
  const candidates = Object.keys(files).filter((path) => isFile(path, files) && path.split('/').pop() === MANIFEST_NAME);
  const folderWrapped = candidates.filter((path) => path.split('/').length === 2);
  if (folderWrapped.length === 1) {
    return { manifestPath: folderWrapped[0], root: folderWrapped[0].slice(0, -MANIFEST_NAME.length) };
  }
  throw new DeckImportError(
    'This file doesn\u2019t look like a deck archive: manifest.json is missing. Upload the .zip exported by Deck Curator.',
  );
}

/** Resolve a manifest photo path against the archive root (with a decoded fallback). */
function photoArchivePath(root: string, file: string, files: Record<string, Uint8Array>): string | undefined {
  const direct = root + file.replace(/^\.\//, '');
  if (isFile(direct, files)) return direct;
  try {
    const decoded = root + decodeURIComponent(file.replace(/^\.\//, ''));
    if (isFile(decoded, files)) return decoded;
  } catch {
    // Malformed percent-encoding in the manifest path; fall through.
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Light-deck photo fetching
// ---------------------------------------------------------------------------

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

/** Fetches are capped so a few-hundred-photo import doesn't hammer the host
 *  from one browser tab; each URL gets a couple of tries on transient
 *  failures (network errors, 5xx, rate limiting) before the next variant. */
const FETCH_CONCURRENCY = 5;
const FETCH_ATTEMPTS = 2;
/** Below this a "successful" response is an error page or empty body, not a
 *  photo. Deliberately tiny: legitimate small variants exist. */
const MIN_IMAGE_BYTES = 100;

async function fetchPhotoBlob(url: string, signal: AbortSignal): Promise<Blob> {
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
        if (signal.aborted) throw err;
        lastError = err;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('fetch failed');
}

export interface FetchPhotosOptions {
  /** Progress after each photo lands: (fetched, total unique URLs). */
  onProgress?: (done: number, total: number) => void;
}

/**
 * Fetch every photo a light deck references, once per unique URL. The
 * returned map is keyed by the manifest's URL (the same string the photos
 * store is keyed by). On the first photo that can't be fetched anywhere the
 * remaining fetches are aborted and the error names the photo — the caller
 * turns it into a DeckImportError.
 */
async function fetchPhotoBlobs(
  entries: Array<{ url: string; describe: string }>,
  opts: FetchPhotosOptions = {},
): Promise<Map<string, Blob>> {
  const total = entries.length;
  const blobs = new Map<string, Blob>();
  if (total === 0) return blobs;

  const controller = new AbortController();
  let next = 0;
  let failure: Error | null = null;
  const worker = async (): Promise<void> => {
    while (next < total && !failure) {
      const { url, describe } = entries[next++];
      try {
        blobs.set(url, await fetchPhotoBlob(url, controller.signal));
        opts.onProgress?.(blobs.size, total);
      } catch (err) {
        if (!failure) {
          const reason = err instanceof Error && err.message ? err.message : 'fetch failed';
          failure = new Error(`Could not fetch ${describe} from ${url} (${reason}). Check your connection and try again.`);
          controller.abort(); // Stop the sibling fetches — the import is over.
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, total) }, worker));
  if (failure) throw failure;
  return blobs;
}

/** The unique remote photos a light manifest references, in manifest order,
 *  each described for error messages ("the main photo of card "Dwarf
 *  Nettle""). Two cards may share one URL — it is fetched and cached once. */
function lightPhotoEntries(manifest: DeckDef): Array<{ url: string; describe: string }> {
  const entries = new Map<string, string>();
  for (const category of manifest.categories) {
    for (const card of category.cards) {
      for (const photo of card.photos ?? []) {
        // Validation guarantees every light photo carries an https url.
        if (photo.url && !entries.has(photo.url)) {
          entries.set(photo.url, `the ${photo.role} photo of card "${card.name}"`);
        }
      }
    }
  }
  return [...entries].map(([url, describe]) => ({ url, describe }));
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/** Options for importDeckZip. */
export interface DeckImportOptions {
  /** Light-deck imports fetch every photo over the network first; progress
   *  reports (fetched, total unique photos) as they land. Imports of decks
   *  with bundled photos never call it — their bytes are already local. */
  onProgress?: (done: number, total: number) => void;
}

/** Store a validated deck: wipe any previous import of the same id, write
 *  the photo blobs (keyed `id/<reference>`), then the deck record. */
async function storeDeck(id: string, manifest: DeckDef, photos: Array<{ key: string; blob: Blob }>): Promise<void> {
  await deleteUploadedDeck(id).catch(() => {
    // A failed cleanup (e.g. first import, no prior record) must not block us.
  });
  await withStore(PHOTO_STORE, 'readwrite', async (store) => {
    for (const { key, blob } of photos) {
      await requestAsPromise(store.put(blob, key));
    }
  });
  const manifestJsonBytes = new TextEncoder().encode(JSON.stringify(manifest)).length;
  const photoFileBytes = photos.reduce((sum, { blob }) => sum + blob.size, 0);
  const record: UploadedDeckRecord = {
    id,
    label: manifest.label,
    description: manifest.description ?? '',
    cardFormat: 'data',
    manifest,
    importedAt: new Date().toISOString(),
    bytes: manifestJsonBytes + photoFileBytes,
  };
  await withStore(DECK_STORE, 'readwrite', (store) => requestAsPromise(store.put(record)));
}

/** Unzip `file`, validate its manifest, and store deck + photos in IndexedDB.
 *  Accepts every Deck Curator export: the project file (.zip) and deck file
 *  (.deck), which bundle their photos, and the light deck (.deck.lite),
 *  whose photos are fetched from their remote sources first. */
export async function importDeckZip(file: File, options: DeckImportOptions = {}): Promise<{ id: string; label: string }> {
  let files: Record<string, Uint8Array>;
  try {
    files = await unzipAsync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new DeckImportError('This file could not be opened as a zip archive. Upload the .zip exported by Deck Curator.');
  }

  const { manifestPath, root } = findManifestEntry(files);
  let parsed: unknown;
  try {
    parsed = JSON.parse(strFromU8(files[manifestPath]));
  } catch {
    throw new DeckImportError('Invalid deck archive: manifest.json is not valid JSON.');
  }
  const manifest = validateManifest(parsed);

  // A light deck ships no photos: every referenced image is fetched from its
  // remote source and cached locally before anything is stored.
  if ((parsed as RawRecord).format === 'lite') {
    const id = storedDeckIdFor(manifest.id);
    let blobs: Map<string, Blob>;
    try {
      blobs = await fetchPhotoBlobs(lightPhotoEntries(manifest), { onProgress: options.onProgress });
    } catch (err) {
      throw new DeckImportError(err instanceof Error ? err.message : 'Could not fetch the deck\u2019s photos.');
    }
    await storeDeck(
      id,
      manifest,
      [...blobs].map(([url, blob]) => ({ key: `${id}/${url}`, blob })),
    );
    return { id, label: manifest.label };
  }

  // Every photo must exist in the archive — fail the whole import otherwise.
  const photoEntries: Array<{ declared: string; path: string }> = [];
  for (const category of manifest.categories) {
    for (const card of category.cards) {
      for (const photo of card.photos ?? []) {
        const path = photoArchivePath(root, photo.file, files);
        if (!path) {
          throw new DeckImportError(
            `Invalid deck archive: photo file "${photo.file}" (card "${card.name}") is missing from the zip.`,
          );
        }
        photoEntries.push({ declared: photo.file, path });
      }
    }
  }

  const id = storedDeckIdFor(manifest.id);
  await storeDeck(
    id,
    manifest,
    photoEntries.map(({ declared, path }) => ({
      key: `${id}/${declared}`,
      // slice() yields a plain ArrayBuffer-backed copy, which Blob accepts.
      blob: new Blob([files[path].slice()], { type: 'image/jpeg' }),
    })),
  );
  return { id, label: manifest.label };
}

// ---------------------------------------------------------------------------
// Reads / deletes
// ---------------------------------------------------------------------------

export async function listUploadedDecks(): Promise<UploadedDeckSummary[]> {
  const records = await withStore(DECK_STORE, 'readonly', (store) => requestAsPromise(store.getAll() as IDBRequest<UploadedDeckRecord[]>));
  return records.map(({ id, label, description, cardFormat, importedAt }) => ({ id, label, description, cardFormat, importedAt }));
}

/**
 * Size of a stored deck in this browser (IndexedDB): the manifest record
 * plus its stored photo files. Decks imported by the current app version
 * had this measured at import time; older records are measured on demand
 * by reading their photo Blob handles (sizes only — bytes are never copied
 * into memory). Returns null when the id has no stored record.
 */
export async function uploadedDeckBytes(id: string): Promise<number | null> {
  const record = await getUploadedDeckRecord(id);
  if (!record) return null;
  if (typeof record.bytes === 'number') return record.bytes;
  // Legacy record (imported before sizes were tracked): measure the
  // manifest JSON plus every stored photo Blob.
  const manifestBytes = new TextEncoder().encode(JSON.stringify(record.manifest)).length;
  let photoBytes = 0;
  await withStore(PHOTO_STORE, 'readonly', async (store) => {
    const keys = await requestAsPromise(store.getAllKeys());
    const own = keys.filter((key): key is string => typeof key === 'string' && key.startsWith(`${id}/`));
    for (const key of own) {
      const blob = await requestAsPromise(store.get(key) as IDBRequest<Blob | undefined>);
      photoBytes += blob?.size ?? 0;
    }
  });
  return manifestBytes + photoBytes;
}

/** Human-readable byte size, e.g. "482 B", "12.4 KB", "1.8 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${roundedSize(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${roundedSize(mb)} MB`;
  return `${roundedSize(mb / 1024)} GB`;
}

/** One decimal below 100, integer from 100 up ("1.5 KB", "48 KB"). */
function roundedSize(value: number): number {
  return value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
}

/** Stored deck record or null when the id is unknown. */
export async function getUploadedDeckRecord(id: string): Promise<UploadedDeckRecord | null> {
  const record = await withStore(DECK_STORE, 'readonly', (store) => requestAsPromise(store.get(id) as IDBRequest<UploadedDeckRecord | undefined>));
  return record ?? null;
}

/**
 * Load a stored deck as a DeckDef, resolving every photo `file` into a
 * blob: object URL ready for <img src>. Object URLs live for the document's
 * lifetime (they are not revoked — decks are small and pages are short-lived).
 * Light decks store their photos under the photo's remote `url`; their
 * loaded photos resolve `file` to the cached bytes and keep `url` as
 * provenance.
 */
export async function loadUploadedDeck(id: string): Promise<DeckDef> {
  const record = await getUploadedDeckRecord(id);
  if (!record) throw new Error(`Uploaded deck "${id}" was not found.`);
  const urls = new Map<string, string>();
  await withStore(PHOTO_STORE, 'readonly', async (store) => {
    for (const category of record.manifest.categories) {
      for (const card of category.cards) {
        for (const photo of card.photos ?? []) {
          const key = `${record.id}/${photo.file ?? photo.url}`;
          const blob = await requestAsPromise(store.get(key) as IDBRequest<Blob | undefined>);
          // One object URL per distinct stored photo — two cards may share
          // one file (or one light-deck URL), and they share its blob URL.
          if (blob && !urls.has(key)) urls.set(key, URL.createObjectURL(blob));
        }
      }
    }
  });
  const categories = record.manifest.categories.map((category) => ({
    id: category.id,
    label: category.label,
    cards: category.cards.map((card) => ({
      ...card,
      invasive: card.invasive ?? false,
      photos: (card.photos ?? []).map((photo) => ({
        ...photo,
        file: urls.get(`${record.id}/${photo.file ?? photo.url}`) ?? '',
      })),
    })),
  }));
  return {
    id: record.id,
    label: record.label,
    description: record.description,
    cardFormat: 'data',
    uploaded: true,
    categories,
  };
}

export async function deleteUploadedDeck(id: string): Promise<void> {
  await withStore(DECK_STORE, 'readwrite', (store) => requestAsPromise(store.delete(id) as IDBRequest<undefined>));
  const keys = await withStore(PHOTO_STORE, 'readonly', (store) => requestAsPromise(store.getAllKeys()));
  const own = keys.filter((key) => typeof key === 'string' && key.startsWith(`${id}/`));
  if (own.length === 0) return;
  await withStore(PHOTO_STORE, 'readwrite', async (store) => {
    for (const key of own) {
      await requestAsPromise(store.delete(key) as IDBRequest<undefined>);
    }
  });
}
