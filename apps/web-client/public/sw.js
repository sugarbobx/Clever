// CLEVER — service worker minimal et SANS interception réseau.
// Un SW qui sert des assets en cache casse la navigation RSC/HMR de Next (écran figé).
// Ici : aucun handler 'fetch' → toutes les requêtes vont au réseau normalement.
// L'install/activate se contente de purger les anciens caches. La PWA reste installable
// grâce au manifest + icônes ; le cache hors-ligne pourra être réintroduit prudemment plus tard.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});
