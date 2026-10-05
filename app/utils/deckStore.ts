/**
 * IndexedDB plumbing for uploaded decks, shared by the ingest module
 * (uploadedDecks.ts) and the light-deck photo cache (lightPhotos.ts).
 *
 * Two stores in the `uploaded-decks` database:
 * - `decks`: one record per uploaded deck (keyed by deck id).
 * - `photos`: photo bytes, keyed `${deckId}/${reference}` — an archive path
 *   for bundled decks, the remote URL for light decks.
 */

export const DB_NAME = 'uploaded-decks';
export const DB_VERSION = 1;
export const DECK_STORE = 'decks';
export const PHOTO_STORE = 'photos';

export function openDb(): Promise<IDBDatabase> {
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

export function requestAsPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted.'));
  });
}

/** Run an async callback against one store in its own transaction. */
export async function withStore<T>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => Promise<T>): Promise<T> {
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

/** Store one photo's bytes under the deck's `${deckId}/${reference}` key. */
export async function putStoredPhoto(deckId: string, reference: string, blob: Blob): Promise<void> {
  await withStore(PHOTO_STORE, 'readwrite', (store) => requestAsPromise(store.put(blob, `${deckId}/${reference}`)));
}

/**
 * The photo references already cached for a deck (the `${deckId}/` prefix
 * stripped, so bundled decks yield archive paths and light decks URLs).
 */
export async function storedPhotoKeys(deckId: string): Promise<Set<string>> {
  const keys = await withStore(PHOTO_STORE, 'readonly', (store) => requestAsPromise(store.getAllKeys()));
  const prefix = `${deckId}/`;
  return new Set(
    keys
      .filter((key): key is string => typeof key === 'string' && key.startsWith(prefix))
      .map((key) => key.slice(prefix.length)),
  );
}
