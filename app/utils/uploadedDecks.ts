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

function validateCard(card: unknown, where: string): void {
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
    requireString(p.file, `${photoWhere} file`);
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
 * existence is checked separately against the archive contents.
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
      validateCard(card, `${catWhere} card ${cardIndex + 1}`);
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
// Import
// ---------------------------------------------------------------------------

/** Unzip `file`, validate its manifest, and store deck + photos in IndexedDB. */
export async function importDeckZip(file: File): Promise<{ id: string; label: string }> {
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
  // Replace any previous import of this deck: wipe its photos first so
  // removed files don't linger, then write the fresh set.
  await deleteUploadedDeck(id).catch(() => {
    // A failed cleanup (e.g. first import, no prior record) must not block us.
  });
  await withStore(PHOTO_STORE, 'readwrite', async (store) => {
    for (const { declared, path } of photoEntries) {
      // slice() yields a plain ArrayBuffer-backed copy, which Blob accepts.
      const blob = new Blob([files[path].slice()], { type: 'image/jpeg' });
      await requestAsPromise(store.put(blob, `${id}/${declared}`));
    }
  });
  const manifestJsonBytes = new TextEncoder().encode(JSON.stringify(manifest)).length;
  const photoFileBytes = photoEntries.reduce((sum, { path }) => sum + files[path].length, 0);
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
  return { id, label: record.label };
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
 */
export async function loadUploadedDeck(id: string): Promise<DeckDef> {
  const record = await getUploadedDeckRecord(id);
  if (!record) throw new Error(`Uploaded deck "${id}" was not found.`);
  const urls = new Map<string, string>();
  await withStore(PHOTO_STORE, 'readonly', async (store) => {
    for (const category of record.manifest.categories) {
      for (const card of category.cards) {
        for (const photo of card.photos ?? []) {
          const key = `${record.id}/${photo.file}`;
          const blob = await requestAsPromise(store.get(key) as IDBRequest<Blob | undefined>);
          if (blob) urls.set(key, URL.createObjectURL(blob));
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
        file: urls.get(`${record.id}/${photo.file}`) ?? '',
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
