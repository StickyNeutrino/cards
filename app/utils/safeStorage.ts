/**
 * localStorage access can throw — some browsers block it entirely in private
 * modes and a full quota surfaces on writes — and a throw during a render
 * initializer or an effect takes the whole page down. Every localStorage
 * read and write in the app goes through these wrappers, so a blocked store
 * degrades (settings fall back to their defaults, saves are skipped) instead
 * of crashing.
 */

/** Stored value or null (missing key, no window, blocked storage). */
export function storedItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Best-effort save; silently skipped when storage is blocked or full. */
export function storeItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked or full: the setting just won't persist.
  }
}
