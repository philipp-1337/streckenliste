// iOS ignores the URL passed to clients.openWindow() when the PWA starts from
// a fully closed state and always opens the manifest start_url instead. The
// service worker stashes the target here so the app can pick it up at boot.
// IndexedDB rather than localStorage: service workers have no localStorage.

const DB_NAME = 'streckenliste-push';
const STORE_NAME = 'pending';
const RECORD_KEY = 'deepLink';

export const PENDING_DEEP_LINK_MAX_AGE_MS = 5 * 60 * 1000;

type PendingRecord = { path: string; storedAt: number };

// Validates same-origin before anything is persisted, so a manipulated
// notification payload can never redirect the app off-origin.
export function toRouterPath(url: string, origin: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, origin);
    if (parsed.origin !== new URL(origin).origin) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function setPendingDeepLink(url: string, origin: string): Promise<void> {
  const path = toRouterPath(url, origin);
  if (!path) return;

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ path, storedAt: Date.now() } satisfies PendingRecord, RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // A failed stash must never block the notification click itself.
  }
}

// Reads and clears in one go. A record older than the max age is discarded
// instead of applied, so a stale link never hijacks a later, unrelated start.
export async function takePendingDeepLink(): Promise<string | null> {
  try {
    const db = await openDb();
    const record = await new Promise<PendingRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(RECORD_KEY);
      getRequest.onsuccess = () => {
        store.delete(RECORD_KEY);
        resolve(getRequest.result as PendingRecord | undefined);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
    db.close();

    if (!record) return null;
    if (Date.now() - record.storedAt > PENDING_DEEP_LINK_MAX_AGE_MS) return null;
    return record.path;
  } catch {
    return null;
  }
}
