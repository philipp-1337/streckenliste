import { precacheAndRoute } from 'workbox-precaching';
import { setPendingDeepLink } from './lib/pendingDeepLink';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

// Der Update-Prompt in usePwaUpdate.tsx ruft updateServiceWorker(true) auf;
// vite-plugin-pwa schickt daraufhin diese Nachricht. Ohne den Handler bliebe
// der neue Service Worker für immer im Wartezustand.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Safari verlangt, dass showNotification() synchron im push-Handler aufgerufen
// wird. Firebases eigener onBackgroundMessage macht vorher ein await auf die
// Client-Liste — Safari verwirft die Notification dann still und entzieht
// irgendwann die Berechtigung, ohne jede Fehlermeldung. Deshalb hier ein
// eigener Listener ohne vorgeschaltete async-Arbeit, und deshalb kommt das
// Firebase-Messaging-SDK gar nicht in den Service Worker.
self.addEventListener('push', (event) => {
  let title = 'Streckenliste';
  let body = event.data ? event.data.text() : '';
  let url: string | undefined;

  try {
    const payload = JSON.parse(body);
    title = payload?.notification?.title ?? title;
    body = payload?.notification?.body ?? body;
    url = payload?.data?.url;
  } catch {
    // Kein JSON — Rohtext anzeigen.
  }

  event.waitUntil(self.registration.showNotification(title, { body, data: { url } }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data?.url as string | undefined) ?? '/';

  event.waitUntil(
    (async () => {
      // Zuerst ablegen: auf iOS ignoriert openWindow() die URL beim Kaltstart,
      // und navigate() kann ablehnen. Der Eintrag ist der Fallback für beides.
      await setPendingDeepLink(url, self.location.origin);

      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = clientsList.find((client) => 'focus' in client);
      if (existing) {
        try {
          // Ohne navigate() wird ein bereits offenes Fenster nur fokussiert,
          // aber nie zum Ziel des Deep-Links bewegt.
          await existing.navigate(url);
        } catch {
          // navigate() kann ablehnen — fokussieren ist besser als nichts.
        }
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })()
  );
});
