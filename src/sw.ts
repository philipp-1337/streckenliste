import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

// Der Update-Prompt in usePwaUpdate.tsx ruft updateServiceWorker(true) auf;
// vite-plugin-pwa schickt daraufhin diese Nachricht. Ohne den Handler bliebe
// der neue Service Worker für immer im Wartezustand.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
