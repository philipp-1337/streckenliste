import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging';
import { VAPID_PUBLIC_KEY, app } from '../firebase';

export type PushPlatform = 'ios' | 'android' | 'desktop' | 'unknown';

const SERVICE_WORKER_READY_TIMEOUT_MS = 5000;

export async function isPushSupported(): Promise<boolean> {
  return isSupported();
}

export function detectPushPlatform(): PushPlatform {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/Macintosh|Windows|Linux/i.test(ua)) return 'desktop';
  return 'unknown';
}

// True when running as an installed home-screen app rather than a browser tab.
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const matchesDisplayMode =
    typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return matchesDisplayMode || iosStandalone;
}

// iOS exposes the Push API only to installed home-screen apps; other platforms
// support it in a regular tab once the API itself is available.
export function canOfferPushActivation(pushSupported: boolean): boolean {
  if (!pushSupported) return false;
  if (detectPushPlatform() === 'ios') return isStandalonePwa();
  return true;
}

// navigator.serviceWorker.ready never resolves when no service worker controls
// the page — without this timeout callers hang forever instead of falling back.
export async function waitForServiceWorkerReady(
  timeoutMs: number = SERVICE_WORKER_READY_TIMEOUT_MS,
): Promise<ServiceWorkerRegistration | null> {
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

export async function requestPushPermission(): Promise<string | null> {
  if (!(await isSupported())) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const registration = await waitForServiceWorkerReady();
  if (!registration) return null;

  return getToken(getMessaging(app), {
    vapidKey: VAPID_PUBLIC_KEY,
    serviceWorkerRegistration: registration,
  });
}

// Clears Firebase's cached token and unsubscribes the underlying push
// subscription. Without this, Firebase keeps handing out the same cached token
// from IndexedDB and a broken subscription can never be repaired by the user.
export async function unregisterPushToken(): Promise<void> {
  if (!(await isSupported())) return;
  await deleteToken(getMessaging(app));
}

// Reads the current token without prompting — unlike requestPushPermission().
// Returns null if permission isn't granted yet or the subscription is broken.
export async function getCurrentPushToken(): Promise<string | null> {
  if (!(await isSupported())) return null;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return null;

  try {
    const registration = await waitForServiceWorkerReady();
    if (!registration) return null;
    return await getToken(getMessaging(app), {
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: registration,
    });
  } catch {
    return null;
  }
}
